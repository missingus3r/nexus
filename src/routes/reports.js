import express from 'express';
import { Report, ForumThread, ForumComment, User } from '../models/index.js';
import { REPORT_REASONS } from '../models/Report.js';
import { checkJwt, attachUser } from '../middleware/auth.js';

const router = express.Router();

// Combined authentication middleware
const authenticate = [checkJwt, attachUser, (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}];

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * GET /api/reports/reasons
 * Get all available report reasons
 */
router.get('/reasons', (req, res) => {
  const reasons = REPORT_REASONS.map(reason => ({
    value: reason,
    label: getReasonLabel(reason)
  }));
  res.json({ reasons });
});

/**
 * POST /api/reports
 * Create a new report (authenticated users only)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { reportedType, reportedId, reason, description } = req.body;

    // Validation
    if (!reportedType || !reportedId || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['thread', 'comment', 'user'].includes(reportedType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }

    // Get the reported content/user and extract metadata
    let reportedUserId;
    let contentSnapshot = {};

    if (reportedType === 'thread') {
      const thread = await ForumThread.findById(reportedId).populate('author', 'name email');
      if (!thread) {
        return res.status(404).json({ error: 'Thread not found' });
      }
      reportedUserId = thread.author._id;
      contentSnapshot = {
        title: thread.title,
        content: thread.content.substring(0, 200), // First 200 chars
        author: thread.author.name || thread.author.email
      };
    } else if (reportedType === 'comment') {
      const comment = await ForumComment.findById(reportedId).populate('author', 'name email');
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      reportedUserId = comment.author._id;
      contentSnapshot = {
        content: comment.content.substring(0, 200),
        author: comment.author.name || comment.author.email
      };
    } else if (reportedType === 'user') {
      const user = await User.findById(reportedId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      reportedUserId = user._id;
      contentSnapshot = {
        author: user.name || user.email
      };
    }

    // Check if user already reported this content
    const existingReport = await Report.findOne({
      reporter: req.user._id,
      reportedType,
      reportedId
    });

    if (existingReport) {
      return res.status(400).json({ error: 'Ya has reportado este contenido' });
    }

    // Create report
    const report = new Report({
      reporter: req.user._id,
      reportedType,
      reportedId,
      reportedUserId,
      reason,
      description: description?.trim(),
      contentSnapshot
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Reporte enviado exitosamente',
      report: {
        _id: report._id,
        reportedType: report.reportedType,
        reason: report.reason,
        status: report.status
      }
    });
  } catch (error) {
    console.error('Error creating report:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya has reportado este contenido' });
    }
    res.status(500).json({ error: 'Error al crear el reporte' });
  }
});

/**
 * GET /api/reports/my-reports
 * Get reports created by authenticated user
 */
router.get('/my-reports', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    // Build query filter
    const queryFilter = { reporter: req.user._id };
    if (status && ['pending', 'reviewed', 'resolved', 'rejected'].includes(status)) {
      queryFilter.status = status;
    }

    const reports = await Report.find(queryFilter)
      .populate('reportedUserId', 'email name picture')
      .populate('reviewedBy', 'email name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Report.countDocuments(queryFilter);

    // Get counts by status for this user
    const statusCounts = await Report.aggregate([
      { $match: { reporter: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const counts = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
      rejected: 0
    };

    statusCounts.forEach(item => {
      counts[item._id] = item.count;
    });

    res.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      counts
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ error: 'Error al obtener tus reportes' });
  }
});

/**
 * GET /api/reports
 * Get all reports (admin only)
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status; // Filter by status
    const type = req.query.type; // Filter by type
    const skip = (page - 1) * limit;

    // Build query filter
    const queryFilter = {};
    if (status && ['pending', 'reviewed', 'resolved', 'rejected'].includes(status)) {
      queryFilter.status = status;
    }
    if (type && ['thread', 'comment', 'user'].includes(type)) {
      queryFilter.reportedType = type;
    }

    const reports = await Report.find(queryFilter)
      .populate('reporter', 'email name picture')
      .populate('reportedUserId', 'email name picture')
      .populate('reviewedBy', 'email name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Report.countDocuments(queryFilter);

    // Get counts by status
    const statusCounts = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const counts = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
      rejected: 0
    };

    statusCounts.forEach(item => {
      counts[item._id] = item.count;
    });

    res.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      counts
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
});

/**
 * GET /api/reports/:id
 * Get a specific report with full details (admin only)
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reporter', 'email name picture')
      .populate('reportedUserId', 'email name picture')
      .populate('reviewedBy', 'email name')
      .lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Get the actual reported content
    let reportedContent = null;
    if (report.reportedType === 'thread') {
      reportedContent = await ForumThread.findById(report.reportedId)
        .populate('author', 'email name picture')
        .lean();
    } else if (report.reportedType === 'comment') {
      reportedContent = await ForumComment.findById(report.reportedId)
        .populate('author', 'email name picture')
        .lean();
    } else if (report.reportedType === 'user') {
      reportedContent = await User.findById(report.reportedId)
        .select('email name picture role createdAt')
        .lean();
    }

    res.json({
      report,
      reportedContent
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
});

/**
 * PUT /api/reports/:id
 * Update report status (admin only)
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, resolution } = req.body;

    if (!status || !['reviewed', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update report based on new status
    if (status === 'reviewed') {
      report.markAsReviewed(req.user._id, resolution);
    } else if (status === 'resolved') {
      report.resolve(req.user._id, resolution);
    } else if (status === 'rejected') {
      report.reject(req.user._id, resolution);
    }

    await report.save();
    await report.populate('reviewer', 'email name');

    res.json({
      success: true,
      message: 'Reporte actualizado exitosamente',
      report
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Error al actualizar reporte' });
  }
});

/**
 * DELETE /api/reports/:id
 * Delete a report (admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await Report.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Reporte eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Error al eliminar reporte' });
  }
});

// Helper function to get human-readable labels for reasons
function getReasonLabel(reason) {
  const labels = {
    spam: 'Spam',
    harassment: 'Acoso',
    inappropriate_content: 'Contenido inapropiado',
    hate_speech: 'Discurso de odio',
    misinformation: 'Desinformación',
    violence: 'Violencia',
    other: 'Otro'
  };
  return labels[reason] || reason;
}

export default router;

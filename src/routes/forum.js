import express from 'express';
import sanitizeHtml from 'sanitize-html';
import { ForumThread, ForumComment, ForumSettings, User } from '../models/index.js';
import { ALLOWED_HASHTAGS } from '../models/ForumThread.js';
import { verifyApiAuth, requireAuth } from '../middleware/apiAuth.js';
import { uploadForumImages, handleUploadErrors } from '../middleware/upload.js';
import { processMentions, createMentionNotifications } from '../utils/forumHelpers.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const router = express.Router();

// Sanitize HTML configuration - allow basic formatting but prevent XSS
const sanitizeConfig = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3',
    'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre'
  ],
  allowedAttributes: {
    'a': ['href', 'target'],
    'p': ['class'],
    'code': ['class'],
    'pre': ['class']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto']
  }
};

// Optional authentication (doesn't fail if not authenticated)
const optionalAuth = [verifyApiAuth];

// Combined authentication middleware (requires authenticated user)
const authenticate = [verifyApiAuth, requireAuth, (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}];

// Rate limiting middleware for thread creation
const checkThreadRateLimit = async (req, res, next) => {
  try {
    const settings = await ForumSettings.getSettings();
    const userId = req.user._id;

    // Check cooldown period
    const cooldownMs = settings.postCooldownMinutes * 60 * 1000;
    const lastThread = await ForumThread.findOne({ author: userId })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();

    if (lastThread) {
      const timeSinceLastPost = Date.now() - new Date(lastThread.createdAt).getTime();
      if (timeSinceLastPost < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastPost) / 60000);
        return res.status(429).json({
          error: `Debes esperar ${remainingMinutes} minuto(s) antes de crear otro thread`,
          remainingMinutes,
          cooldownMinutes: settings.postCooldownMinutes
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error checking thread rate limit:', error);
    next(); // Continue even if check fails
  }
};

// Rate limiting middleware for comment creation
const checkCommentRateLimit = async (req, res, next) => {
  try {
    const settings = await ForumSettings.getSettings();
    const userId = req.user._id;

    // Check daily comment limit
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayCommentCount = await ForumComment.countDocuments({
      author: userId,
      createdAt: { $gte: startOfDay }
    });

    if (todayCommentCount >= settings.maxCommentsPerDay) {
      return res.status(429).json({
        error: `Has alcanzado el límite de ${settings.maxCommentsPerDay} comentarios por día`,
        limit: settings.maxCommentsPerDay,
        count: todayCommentCount
      });
    }

    next();
  } catch (error) {
    console.error('Error checking comment rate limit:', error);
    next(); // Continue even if check fails
  }
};

/**
 * GET /forum/hashtags
 * Get all allowed hashtags
 */
router.get('/hashtags', (req, res) => {
  res.json({ hashtags: ALLOWED_HASHTAGS });
});

/**
 * GET /forum/users/search
 * Search users by name for mentions autocomplete
 */
router.get('/users/search', optionalAuth, async (req, res) => {
  try {
    const query = req.query.q || '';

    if (query.length < 2) {
      return res.json({ users: [] });
    }

    // Search for users by name (case-insensitive, partial match)
    const users = await User.find({
      name: { $regex: query, $options: 'i' }
    })
      .select('_id name email picture')
      .limit(10)
      .lean();

    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Error searching users' });
  }
});

/**
 * GET /forum/threads
 * Get all forum threads with pagination and sorting
 */
router.get('/threads', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sort = req.query.sort || 'recent'; // recent, popular
    const hashtag = req.query.hashtag; // Filter by hashtag
    const skip = (page - 1) * limit;

    let sortQuery = {};
    if (sort === 'popular') {
      sortQuery = { isPinned: -1, likesCount: -1, createdAt: -1 };
    } else {
      sortQuery = { isPinned: -1, createdAt: -1 };
    }

    // Build query filter
    const queryFilter = { status: 'active' };
    if (hashtag && ALLOWED_HASHTAGS.includes(hashtag.toLowerCase())) {
      queryFilter.hashtags = hashtag.toLowerCase();
    }

    const threads = await ForumThread.find(queryFilter)
      .populate('author', 'email name picture')
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ForumThread.countDocuments(queryFilter);

    // Add liked status if user is authenticated
    let enrichedThreads = threads;
    if (req.user) {
      enrichedThreads = threads.map(thread => ({
        ...thread,
        isLiked: thread.likes.some(like =>
          like.userId.toString() === req.user._id.toString()
        )
      }));
    }

    res.json({
      threads: enrichedThreads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({ error: 'Error fetching threads' });
  }
});

/**
 * POST /forum/threads
 * Create a new forum thread (authenticated users only)
 */
router.post('/threads', authenticate, checkThreadRateLimit, uploadForumImages, handleUploadErrors, async (req, res) => {
  try {
    const { title, content, links, hashtags, type, poll } = req.body;

    // Validation
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters' });
    }
    if (!content || content.trim().length < 10) {
      return res.status(400).json({ error: 'Content must be at least 10 characters' });
    }

    // Parse and validate hashtags
    let parsedHashtags = [];
    if (hashtags) {
      try {
        parsedHashtags = typeof hashtags === 'string' ? JSON.parse(hashtags) : hashtags;
      } catch (e) {
        parsedHashtags = Array.isArray(hashtags) ? hashtags : [];
      }
    }

    // Validate hashtags are required and valid
    if (!parsedHashtags || parsedHashtags.length === 0) {
      return res.status(400).json({ error: 'Debes seleccionar al menos un hashtag' });
    }

    // Filter only valid hashtags
    const validHashtags = parsedHashtags
      .map(h => h.toLowerCase())
      .filter(h => ALLOWED_HASHTAGS.includes(h));

    if (validHashtags.length === 0) {
      return res.status(400).json({ error: 'Debes seleccionar hashtags válidos' });
    }

    // Limit to max 5 hashtags
    if (validHashtags.length > 5) {
      return res.status(400).json({ error: 'Máximo 5 hashtags permitidos' });
    }

    // Process uploaded images
    const images = req.files ? req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename
    })) : [];

    // Parse links if provided
    let parsedLinks = [];
    if (links) {
      try {
        parsedLinks = typeof links === 'string' ? JSON.parse(links) : links;
      } catch (e) {
        parsedLinks = [];
      }
    }

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(content, sanitizeConfig);

    // Process mentions
    const { mentions } = await processMentions(sanitizedContent);

    // Validate and process poll if type is 'poll'
    let pollData = null;
    const threadType = type === 'poll' ? 'poll' : 'discussion';

    if (threadType === 'poll') {
      let parsedPoll = poll;
      if (typeof poll === 'string') {
        try {
          parsedPoll = JSON.parse(poll);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid poll data' });
        }
      }

      if (!parsedPoll || !parsedPoll.options || parsedPoll.options.length < 2) {
        return res.status(400).json({ error: 'Poll must have at least 2 options' });
      }

      if (parsedPoll.options.length > 10) {
        return res.status(400).json({ error: 'Poll cannot have more than 10 options' });
      }

      // Create poll structure
      pollData = {
        question: parsedPoll.question || title,
        options: parsedPoll.options.map(opt => ({
          id: crypto.randomBytes(8).toString('hex'),
          text: opt.text || opt,
          votes: [],
          votesCount: 0
        })),
        expiresAt: parsedPoll.expiresAt ? new Date(parsedPoll.expiresAt) : null,
        allowMultiple: parsedPoll.allowMultiple || false,
        totalVotes: 0
      };

      // Validate expiration date
      if (pollData.expiresAt && pollData.expiresAt <= new Date()) {
        return res.status(400).json({ error: 'Poll expiration date must be in the future' });
      }
    }

    const thread = new ForumThread({
      title: title.trim(),
      content: sanitizedContent,
      type: threadType,
      poll: pollData,
      hashtags: validHashtags,
      author: req.user._id,
      mentions: mentions,
      images,
      links: parsedLinks
    });

    await thread.save();
    await thread.populate('author', 'email name picture');

    // Create notifications for mentioned users
    if (mentions.length > 0) {
      await createMentionNotifications(mentions, {
        authorId: req.user._id,
        authorUid: req.user.uid,
        threadId: thread._id,
        type: 'thread',
        threadTitle: thread.title
      });
    }

    res.status(201).json({
      success: true,
      thread,
      message: threadType === 'poll' ? 'Poll created successfully' : 'Thread created successfully'
    });
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ error: 'Error creating thread' });
  }
});

/**
 * GET /forum/threads/:id
 * Get a specific thread with all its comments
 */
router.get('/threads/:id', optionalAuth, async (req, res) => {
  try {
    const thread = await ForumThread.findOne({
      _id: req.params.id,
      status: 'active'
    }).populate('author', 'email name picture').lean();

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Get all comments for this thread
    const comments = await ForumComment.find({
      threadId: req.params.id,
      status: 'active'
    })
      .populate('author', 'email name picture')
      .sort({ createdAt: 1 })
      .lean();

    // Build comment tree
    const commentMap = {};
    const rootComments = [];

    comments.forEach(comment => {
      comment.replies = [];
      commentMap[comment._id] = comment;
    });

    comments.forEach(comment => {
      if (comment.parentCommentId) {
        const parent = commentMap[comment.parentCommentId];
        if (parent) {
          parent.replies.push(comment);
          parent.repliesCount = (parent.repliesCount || 0) + 1;
        }
      } else {
        rootComments.push(comment);
      }
    });

    // Add liked status and permissions if user is authenticated
    if (req.user) {
      const isAuthor = thread.author._id.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const isWithinEditWindow = thread.createdAt >= fiveMinutesAgo;

      thread.isLiked = thread.likes.some(like =>
        like.userId.toString() === req.user._id.toString()
      );
      thread.isAuthenticated = true;
      thread.isAuthor = isAuthor;
      thread.isAdmin = isAdmin;
      thread.canEdit = isAdmin || (isAuthor && isWithinEditWindow);
      thread.canDelete = isAdmin || (isAuthor && isWithinEditWindow);

      // Add user's votes for polls
      if (thread.type === 'poll' && thread.poll) {
        thread.userVotes = thread.poll.options
          .filter(opt => opt.votes.some(v => v.userId.toString() === req.user._id.toString()))
          .map(opt => opt.id);

        // Hide individual voter info, only show counts
        thread.poll = {
          ...thread.poll,
          options: thread.poll.options.map(opt => ({
            id: opt.id,
            text: opt.text,
            votesCount: opt.votesCount
          })),
          expiresAt: thread.poll.expiresAt,
          allowMultiple: thread.poll.allowMultiple,
          totalVotes: thread.poll.totalVotes
        };
      }

      const markLiked = (comment) => {
        const commentIsAuthor = comment.author._id.toString() === req.user._id.toString();
        const commentIsWithinEditWindow = comment.createdAt >= fiveMinutesAgo;

        comment.isLiked = comment.likes.some(like =>
          like.userId.toString() === req.user._id.toString()
        );
        comment.isAuthor = commentIsAuthor;
        comment.isAdmin = isAdmin;
        comment.canEdit = isAdmin || (commentIsAuthor && commentIsWithinEditWindow);
        comment.canDelete = isAdmin || (commentIsAuthor && commentIsWithinEditWindow);
        comment.replies.forEach(markLiked);
      };
      rootComments.forEach(markLiked);
    } else if (thread.type === 'poll' && thread.poll) {
      // For non-authenticated users, hide voter details
      thread.poll = {
        ...thread.poll,
        options: thread.poll.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          votesCount: opt.votesCount
        })),
        expiresAt: thread.poll.expiresAt,
        allowMultiple: thread.poll.allowMultiple,
        totalVotes: thread.poll.totalVotes
      };
      thread.userVotes = [];
    }

    res.json({
      thread,
      comments: rootComments
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ error: 'Error fetching thread' });
  }
});

/**
 * POST /forum/threads/:id/like
 * Toggle like on a thread
 */
router.post('/threads/:id/like', authenticate, async (req, res) => {
  try {
    const thread = await ForumThread.findById(req.params.id);

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const isLiked = thread.toggleLike(req.user._id);
    await thread.save();

    res.json({
      success: true,
      isLiked,
      likesCount: thread.likesCount
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Error toggling like' });
  }
});

/**
 * POST /forum/threads/:id/vote
 * Vote in a poll thread
 */
router.post('/threads/:id/vote', authenticate, async (req, res) => {
  try {
    const { optionIds } = req.body;

    if (!optionIds || (Array.isArray(optionIds) && optionIds.length === 0)) {
      return res.status(400).json({ error: 'No options selected' });
    }

    const thread = await ForumThread.findById(req.params.id);

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (thread.type !== 'poll') {
      return res.status(400).json({ error: 'This thread is not a poll' });
    }

    try {
      thread.vote(req.user._id, optionIds);
      await thread.save();

      res.json({
        success: true,
        message: 'Vote recorded successfully',
        poll: {
          options: thread.poll.options.map(opt => ({
            id: opt.id,
            text: opt.text,
            votesCount: opt.votesCount
          })),
          totalVotes: thread.poll.totalVotes,
          userVotes: thread.getUserVotes(req.user._id)
        }
      });
    } catch (voteError) {
      return res.status(400).json({ error: voteError.message });
    }
  } catch (error) {
    console.error('Error voting in poll:', error);
    res.status(500).json({ error: 'Error voting in poll' });
  }
});

/**
 * POST /forum/threads/:id/comments
 * Add a comment to a thread
 */
router.post('/threads/:id/comments', authenticate, checkCommentRateLimit, uploadForumImages, handleUploadErrors, async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;

    if (!content || content.trim().length < 1) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const thread = await ForumThread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Calculate depth if replying to a comment
    let depth = 0;
    if (parentCommentId) {
      const parentComment = await ForumComment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
      depth = Math.min(parentComment.depth + 1, 5); // Max depth 5

      if (depth > 5) {
        return res.status(400).json({ error: 'Maximum nesting level reached' });
      }
    }

    // Process uploaded images
    const images = req.files ? req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename
    })) : [];

    // Sanitize HTML content
    const sanitizedContent = sanitizeHtml(content, sanitizeConfig);

    // Process mentions
    const { mentions } = await processMentions(sanitizedContent);

    const comment = new ForumComment({
      threadId: req.params.id,
      parentCommentId: parentCommentId || null,
      content: sanitizedContent,
      author: req.user._id,
      mentions: mentions,
      images,
      depth
    });

    await comment.save();
    await comment.populate('author', 'email name picture');

    // Update thread comments count
    thread.commentsCount += 1;
    await thread.save();

    // Create notifications for mentioned users
    if (mentions.length > 0) {
      await createMentionNotifications(mentions, {
        authorId: req.user._id,
        authorUid: req.user.uid,
        threadId: thread._id,
        commentId: comment._id,
        type: 'comment',
        threadTitle: thread.title
      });
    }

    res.status(201).json({
      success: true,
      comment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Error creating comment' });
  }
});

/**
 * POST /forum/comments/:id/like
 * Toggle like on a comment
 */
router.post('/comments/:id/like', authenticate, async (req, res) => {
  try {
    const comment = await ForumComment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isLiked = comment.toggleLike(req.user._id);
    await comment.save();

    res.json({
      success: true,
      isLiked,
      likesCount: comment.likesCount
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Error toggling like' });
  }
});

/**
 * PUT /forum/threads/:id
 * Edit a thread (author only, within 5 minutes)
 */
router.put('/threads/:id', authenticate, uploadForumImages, handleUploadErrors, async (req, res) => {
  try {
    const thread = await ForumThread.findById(req.params.id);

    if (!thread || thread.status === 'deleted') {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Check authorization
    if (thread.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if within 5 minutes (unless admin)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (req.user.role !== 'admin' && thread.createdAt < fiveMinutesAgo) {
      return res.status(403).json({ error: 'Can only edit within 5 minutes of posting' });
    }

    const { title, content, hashtags } = req.body;

    if (title) {
      if (title.trim().length < 3) {
        return res.status(400).json({ error: 'Title must be at least 3 characters' });
      }
      thread.title = title.trim();
    }

    if (content) {
      if (content.trim().length < 10) {
        return res.status(400).json({ error: 'Content must be at least 10 characters' });
      }
      const sanitizedContent = sanitizeHtml(content, sanitizeConfig);
      thread.content = sanitizedContent;
    }

    // Update hashtags if provided
    if (hashtags) {
      let parsedHashtags = [];
      try {
        parsedHashtags = typeof hashtags === 'string' ? JSON.parse(hashtags) : hashtags;
      } catch (e) {
        parsedHashtags = Array.isArray(hashtags) ? hashtags : [];
      }

      if (parsedHashtags.length > 0) {
        const validHashtags = parsedHashtags
          .map(h => h.toLowerCase())
          .filter(h => ALLOWED_HASHTAGS.includes(h))
          .slice(0, 5); // Max 5 hashtags

        if (validHashtags.length > 0) {
          thread.hashtags = validHashtags;
        }
      }
    }

    // Process new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        filename: file.filename
      }));
      thread.images = [...thread.images, ...newImages];
    }

    thread.updatedAt = new Date();
    await thread.save();
    await thread.populate('author', 'email name picture');

    res.json({
      success: true,
      thread,
      message: 'Thread updated successfully'
    });
  } catch (error) {
    console.error('Error updating thread:', error);
    res.status(500).json({ error: 'Error updating thread' });
  }
});

/**
 * DELETE /forum/threads/:id
 * Delete a thread (author only, within 5 minutes)
 * - Admin: always delete permanently (hard delete)
 * - User: If no comments: delete completely, If has comments: replace with [ELIMINADO]
 */
router.delete('/threads/:id', authenticate, async (req, res) => {
  try {
    const thread = await ForumThread.findById(req.params.id);

    if (!thread || thread.status === 'deleted') {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isAuthor = thread.author.toString() === req.user._id.toString();

    // Check authorization
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if within 5 minutes (unless admin)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!isAdmin && thread.createdAt < fiveMinutesAgo) {
      return res.status(403).json({ error: 'Can only delete within 5 minutes of posting' });
    }

    // Admin always does hard delete (permanent)
    if (isAdmin) {
      // Delete all comments of this thread
      await ForumComment.deleteMany({ thread: req.params.id });

      // Delete the thread
      await ForumThread.deleteOne({ _id: req.params.id });

      logger.info('Admin deleted thread permanently:', {
        threadId: req.params.id,
        admin: req.user.email
      });

      return res.json({
        success: true,
        message: 'Thread deleted permanently by admin',
        type: 'hard'
      });
    }

    // Regular user: check if thread has comments
    if (thread.commentsCount > 0) {
      // Has comments: replace content with [ELIMINADO]
      thread.title = '[ELIMINADO]';
      thread.content = '<p>[ELIMINADO]</p>';
      thread.images = [];
      thread.links = [];
      thread.status = 'deleted';
      await thread.save();

      res.json({ success: true, message: 'Thread content deleted', type: 'soft' });
    } else {
      // No comments: delete completely
      await ForumThread.deleteOne({ _id: req.params.id });

      res.json({ success: true, message: 'Thread deleted completely', type: 'hard' });
    }
  } catch (error) {
    console.error('Error deleting thread:', error);
    res.status(500).json({ error: 'Error deleting thread' });
  }
});

/**
 * PUT /forum/comments/:id
 * Edit a comment (author only, within 5 minutes)
 */
router.put('/comments/:id', authenticate, uploadForumImages, handleUploadErrors, async (req, res) => {
  try {
    const comment = await ForumComment.findById(req.params.id);

    if (!comment || comment.status === 'deleted') {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check authorization
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if within 5 minutes (unless admin)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (req.user.role !== 'admin' && comment.createdAt < fiveMinutesAgo) {
      return res.status(403).json({ error: 'Can only edit within 5 minutes of posting' });
    }

    const { content } = req.body;

    if (content) {
      if (content.trim().length < 1) {
        return res.status(400).json({ error: 'Comment cannot be empty' });
      }
      const sanitizedContent = sanitizeHtml(content, sanitizeConfig);
      comment.content = sanitizedContent;
    }

    // Process new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        filename: file.filename
      }));
      comment.images = [...comment.images, ...newImages];
    }

    comment.updatedAt = new Date();
    await comment.save();
    await comment.populate('author', 'email name picture');

    res.json({
      success: true,
      comment,
      message: 'Comment updated successfully'
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Error updating comment' });
  }
});

/**
 * DELETE /forum/comments/:id
 * Delete a comment (author only, within 5 minutes)
 * - Admin: always delete permanently (hard delete) including all replies
 * - User: If no replies: delete completely, If has replies: replace with [ELIMINADO]
 */
router.delete('/comments/:id', authenticate, async (req, res) => {
  try {
    const comment = await ForumComment.findById(req.params.id);

    if (!comment || comment.status === 'deleted') {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isAuthor = comment.author.toString() === req.user._id.toString();

    // Check authorization
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if within 5 minutes (unless admin)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!isAdmin && comment.createdAt < fiveMinutesAgo) {
      return res.status(403).json({ error: 'Can only delete within 5 minutes of posting' });
    }

    // Admin always does hard delete (permanent)
    if (isAdmin) {
      // Recursive function to delete all nested replies
      async function deleteCommentAndReplies(commentId) {
        // Find all direct replies
        const replies = await ForumComment.find({ parentCommentId: commentId });

        // Recursively delete each reply and its children
        for (const reply of replies) {
          await deleteCommentAndReplies(reply._id);
        }

        // Delete this comment
        await ForumComment.deleteOne({ _id: commentId });
      }

      await deleteCommentAndReplies(req.params.id);

      // Update thread comments count (recalculate)
      const thread = await ForumThread.findById(comment.threadId);
      if (thread) {
        const remainingComments = await ForumComment.countDocuments({
          threadId: comment.threadId
        });
        thread.commentsCount = remainingComments;
        await thread.save();
      }

      logger.info('Admin deleted comment permanently:', {
        commentId: req.params.id,
        admin: req.user.email
      });

      return res.json({
        success: true,
        message: 'Comment deleted permanently by admin',
        type: 'hard'
      });
    }

    // Regular user: check if comment has replies
    const repliesCount = await ForumComment.countDocuments({
      parentCommentId: req.params.id,
      status: 'active'
    });

    if (repliesCount > 0) {
      // Has replies: replace content with [ELIMINADO]
      comment.content = '<p>[ELIMINADO]</p>';
      comment.images = [];
      comment.status = 'deleted';
      await comment.save();

      res.json({ success: true, message: 'Comment content deleted', type: 'soft' });
    } else {
      // No replies: delete completely
      await ForumComment.deleteOne({ _id: req.params.id });

      // Update thread comments count
      const thread = await ForumThread.findById(comment.threadId);
      if (thread) {
        thread.commentsCount = Math.max(0, thread.commentsCount - 1);
        await thread.save();
      }

      res.json({ success: true, message: 'Comment deleted completely', type: 'hard' });
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Error deleting comment' });
  }
});

/**
 * GET /forum/users/:id/profile
 * Get user profile with forum statistics
 */
router.get('/users/:id/profile', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('email name picture createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's forum statistics
    const [threadsCount, commentsCount, likesReceived] = await Promise.all([
      ForumThread.countDocuments({ author: req.params.id, status: 'active' }),
      ForumComment.countDocuments({ author: req.params.id, status: 'active' }),
      ForumThread.aggregate([
        { $match: { author: user._id } },
        { $group: { _id: null, total: { $sum: '$likesCount' } } }
      ])
    ]);

    // Get recent threads
    const recentThreads = await ForumThread.find({
      author: req.params.id,
      status: 'active'
    })
      .select('title createdAt likesCount commentsCount')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      user: {
        ...user,
        stats: {
          threads: threadsCount,
          comments: commentsCount,
          likesReceived: likesReceived[0]?.total || 0
        },
        recentThreads
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

/**
 * GET /forum/my-threads
 * Get threads created by authenticated user
 */
router.get('/my-threads', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sort = req.query.sort || 'recent';
    const skip = (page - 1) * limit;

    let sortQuery = {};
    if (sort === 'popular') {
      sortQuery = { likesCount: -1, createdAt: -1 };
    } else {
      sortQuery = { createdAt: -1 };
    }

    const threads = await ForumThread.find({
      author: req.user._id,
      status: { $ne: 'deleted' }
    })
      .populate('author', 'email name picture')
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ForumThread.countDocuments({
      author: req.user._id,
      status: { $ne: 'deleted' }
    });

    res.json({
      threads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user threads:', error);
    res.status(500).json({ error: 'Error fetching threads' });
  }
});

export default router;

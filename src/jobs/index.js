import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { runNewsIngestion } from './newsIngestion.js';
import { updatePercentiles } from '../services/heatmapService.js';
import { startSubscriptionNotifications } from './subscriptionNotifications.js';
import logger from '../utils/logger.js';
import {
  Incident,
  Validation,
  Notification,
  ForumThread,
  ForumComment,
  SurlinkListing,
  User
} from '../models/index.js';
import mongoose from 'mongoose';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const PENDING_INCIDENT_MAX_AGE_DAYS = 30;
const VALIDATION_ARCHIVE_DAYS = 180;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

// Lightweight archive collection for validations. We only care about storing the originals.
const validationArchiveCollection = () => mongoose.connection.collection('validationarchives');

/**
 * Remove incidents that stayed pending for too long along with related artifacts.
 */
async function cleanupStalePendingIncidents() {
  const cutoff = new Date(Date.now() - PENDING_INCIDENT_MAX_AGE_DAYS * DAY_IN_MS);
  const incidents = await Incident.find({
    status: 'pending',
    createdAt: { $lt: cutoff }
  }).select('_id media reporterUid description');

  if (incidents.length === 0) {
    return {
      removed: 0,
      mediaDeleted: 0,
      notificationsDeleted: 0,
      reporterUpdates: 0
    };
  }

  const incidentIds = incidents.map(incident => incident._id);
  const incidentIdStrings = incidentIds.map(id => id.toString());

  // Delete associated validations (if any) and notifications that reference these incidents.
  await Validation.deleteMany({ incidentId: { $in: incidentIds } });

  const notificationsResult = await Notification.deleteMany({
    $or: [
      { 'data.incidentId': { $in: incidentIdStrings } },
      { 'data.incidentId': { $in: incidentIds } }
    ]
  });

  // Collect media filenames to delete from disk.
  const filesToDelete = [];
  for (const incident of incidents) {
    if (!Array.isArray(incident.media)) continue;
    for (const mediaItem of incident.media) {
      if (!mediaItem?.url) continue;
      const filename = path.basename(mediaItem.url.split('?')[0]);
      if (filename && filename !== '.' && filename !== '..') {
        filesToDelete.push(filename);
      }
    }
  }

  let mediaDeleted = 0;
  for (const filename of filesToDelete) {
    try {
      const filePath = path.join(uploadsDir, filename);
      await fs.unlink(filePath);
      mediaDeleted += 1;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to delete incident media file during cleanup', {
          filename,
          error: error.message
        });
      }
    }
  }

  // Update reporter counters to keep statistics consistent.
  const reporterCounts = incidents.reduce((acc, incident) => {
    if (!incident.reporterUid) {
      return acc;
    }
    acc.set(
      incident.reporterUid,
      (acc.get(incident.reporterUid) || 0) + 1
    );
    return acc;
  }, new Map());

  let reporterUpdates = 0;
  for (const [uid, count] of reporterCounts.entries()) {
    try {
      const user = await User.findOne({ uid });
      if (!user) continue;
      user.reportCount = Math.max(0, (user.reportCount || 0) - count);
      await user.save();
      reporterUpdates += 1;
    } catch (error) {
      logger.warn('Failed to update reporter stats during cleanup', {
        uid,
        error: error.message
      });
    }
  }

  const deleteResult = await Incident.deleteMany({ _id: { $in: incidentIds } });

  logger.info('Cleanup removed stale pending incidents', {
    removed: deleteResult.deletedCount || 0,
    mediaDeleted,
    notificationsDeleted: notificationsResult.deletedCount || 0,
    reporterUpdates
  });

  return {
    removed: deleteResult.deletedCount || 0,
    mediaDeleted,
    notificationsDeleted: notificationsResult.deletedCount || 0,
    reporterUpdates
  };
}

/**
 * Move old validations to an archive collection to keep the primary collection small.
 */
async function archiveOldValidations() {
  const cutoff = new Date(Date.now() - VALIDATION_ARCHIVE_DAYS * DAY_IN_MS);

  const oldValidations = await Validation.find({
    createdAt: { $lt: cutoff }
  }).limit(2000).lean(); // safeguard: archive in batches if the dataset is huge

  if (oldValidations.length === 0) {
    return { archived: 0 };
  }

  const archiveOps = [];
  const archivedAt = new Date();
  for (const doc of oldValidations) {
    const { _id, ...rest } = doc;
    archiveOps.push({
      updateOne: {
        filter: { originalId: _id },
        update: {
          $setOnInsert: {
            ...rest,
            originalId: _id,
            archivedAt
          }
        },
        upsert: true
      }
    });
  }

  let archiveCollection;
  try {
    archiveCollection = validationArchiveCollection();
  } catch (error) {
    logger.warn('Validation archive collection unavailable, skipping archival', {
      error: error.message
    });
    return { archived: 0 };
  }

  if (archiveOps.length > 0) {
    try {
      await archiveCollection.bulkWrite(archiveOps, { ordered: false });
    } catch (error) {
      logger.error('Failed to archive validations', { error: error.message });
      throw error;
    }
  }

  const idsToRemove = oldValidations.map(doc => doc._id);
  const deleteResult = await Validation.deleteMany({ _id: { $in: idsToRemove } });

  logger.info('Archived old validations', {
    archived: deleteResult.deletedCount || 0
  });

  return { archived: deleteResult.deletedCount || 0 };
}

/**
 * Delete files from /uploads that are no longer referenced by any entity.
 */
async function removeOrphanedMediaFiles() {
  let filesInUploads = [];
  try {
    filesInUploads = await fs.readdir(uploadsDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { deleted: 0 }; // nothing to clean
    }
    throw error;
  }

  if (filesInUploads.length === 0) {
    return { deleted: 0 };
  }

  const referencedFiles = new Set();

  const incidents = await Incident.find({ 'media.0': { $exists: true } }).select('media').lean();
  for (const incident of incidents) {
    for (const mediaItem of incident.media || []) {
      if (!mediaItem?.url) continue;
      const filename = path.basename(mediaItem.url.split('?')[0]);
      if (filename) referencedFiles.add(filename);
    }
  }

  const threads = await ForumThread.find({ 'images.0': { $exists: true } }).select('images').lean();
  for (const thread of threads) {
    for (const image of thread.images || []) {
      const filename = image?.filename || (image?.url ? path.basename(image.url.split('?')[0]) : null);
      if (filename) referencedFiles.add(filename);
    }
  }

  const comments = await ForumComment.find({ 'images.0': { $exists: true } }).select('images').lean();
  for (const comment of comments) {
    for (const image of comment.images || []) {
      const filename = image?.filename || (image?.url ? path.basename(image.url.split('?')[0]) : null);
      if (filename) referencedFiles.add(filename);
    }
  }

  const surlinkListings = await SurlinkListing.find({ media: { $exists: true, $ne: [] } }).select('media').lean();
  for (const listing of surlinkListings) {
    for (const mediaPath of listing.media || []) {
      if (typeof mediaPath !== 'string') continue;
      if (mediaPath.startsWith('http')) continue;
      const filename = path.basename(mediaPath.split('?')[0]);
      if (filename) referencedFiles.add(filename);
    }
  }

  let deleted = 0;
  for (const filename of filesInUploads) {
    if (referencedFiles.has(filename)) {
      continue;
    }
    try {
      await fs.unlink(path.join(uploadsDir, filename));
      deleted += 1;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to delete orphaned media file', {
          filename,
          error: error.message
        });
      }
    }
  }

  if (deleted > 0) {
    logger.info('Removed orphaned media files', { deleted });
  }

  return { deleted };
}

/**
 * Run the full maintenance cleanup sequence. Errors in one phase do not stop later phases.
 */
export async function runScheduledCleanup() {
  const summary = {
    removedPendingIncidents: 0,
    incidentMediaDeleted: 0,
    notificationsDeleted: 0,
    reporterUpdates: 0,
    validationsArchived: 0,
    orphanedFilesDeleted: 0
  };

  try {
    const incidentResult = await cleanupStalePendingIncidents();
    summary.removedPendingIncidents = incidentResult.removed;
    summary.incidentMediaDeleted = incidentResult.mediaDeleted;
    summary.notificationsDeleted = incidentResult.notificationsDeleted;
    summary.reporterUpdates = incidentResult.reporterUpdates;
  } catch (error) {
    logger.error('Pending incident cleanup failed', { error: error.message });
  }

  try {
    const validationResult = await archiveOldValidations();
    summary.validationsArchived = validationResult.archived;
  } catch (error) {
    logger.error('Validation archival failed', { error: error.message });
  }

  try {
    const orphanResult = await removeOrphanedMediaFiles();
    summary.orphanedFilesDeleted = orphanResult.deleted;
  } catch (error) {
    logger.error('Orphaned media cleanup failed', { error: error.message });
  }

  logger.info('Scheduled maintenance cleanup completed', summary);
  return summary;
}

/**
 * Start all cron jobs
 * @param {SocketIO.Server} io - Socket.IO instance
 */
export function startCronJobs(io) {
  logger.info('Starting cron jobs');

  // News ingestion: every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running scheduled news ingestion');
    try {
      await runNewsIngestion(io);
    } catch (error) {
      logger.error('News ingestion cron failed:', error);
    }
  });

  // Heatmap percentile update: every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Running scheduled heatmap percentile update');
    try {
      await updatePercentiles();
    } catch (error) {
      logger.error('Heatmap percentile update failed:', error);
    }
  });

  // Cleanup old data: daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    logger.info('Running scheduled cleanup');
    try {
      await runScheduledCleanup();
    } catch (error) {
      logger.error('Cleanup cron failed:', error);
    }
  });

  // Start subscription expiration notifications (daily at 9 AM)
  startSubscriptionNotifications();

  logger.info('All cron jobs started successfully');
}

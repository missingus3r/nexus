import cron from 'node-cron';
import { runNewsIngestion } from './newsIngestion.js';
import { updatePercentiles } from '../services/heatmapService.js';
import { startSubscriptionNotifications } from './subscriptionNotifications.js';
import logger from '../utils/logger.js';

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
      // TODO: Implement cleanup logic
      // - Delete incidents pending > 30 days
      // - Archive old validations
      // - Clean up orphaned media files
    } catch (error) {
      logger.error('Cleanup cron failed:', error);
    }
  });

  // Start subscription expiration notifications (daily at 9 AM)
  startSubscriptionNotifications();

  logger.info('All cron jobs started successfully');
}

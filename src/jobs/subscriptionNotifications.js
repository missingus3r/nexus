import cron from 'node-cron';
import { Subscription } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Cron job for subscription notifications - DISABLED
 *
 * Automatic email notifications have been disabled.
 * Users should contact subscribers manually via mailto: links or other means.
 *
 * This function is kept for compatibility but does not send any emails.
 */
export function startSubscriptionNotifications() {
  logger.info('Subscription email notifications are disabled. Manual contact via mailto: links should be used.');

  // Cron job disabled - no automatic emails will be sent
  // If you want to re-enable this feature, uncomment the code below and configure SMTP

  /*
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      logger.info('Checking for expiring subscriptions...');

      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const today = new Date();

      const expiringSoon = await Subscription.find({
        status: 'active',
        endDate: {
          $gte: today,
          $lte: sevenDaysFromNow
        },
        autoRenew: false
      }).populate('userId', 'email name');

      logger.info(`Found ${expiringSoon.length} subscriptions expiring soon - manual contact required`);

      // Log subscriptions that need attention
      for (const subscription of expiringSoon) {
        if (subscription.userId && subscription.userId.email) {
          const daysUntilExpiry = Math.ceil(
            (subscription.endDate - today) / (1000 * 60 * 60 * 24)
          );

          logger.info(`Subscription expiring soon - Contact required:`, {
            email: subscription.userId.email,
            name: subscription.userId.name,
            plan: subscription.plan,
            daysRemaining: daysUntilExpiry,
            endDate: subscription.endDate
          });
        }
      }

    } catch (error) {
      logger.error('Error in subscription check:', error);
    }
  });

  logger.info('Subscription check scheduled (emails disabled)');
  */
}

/**
 * Manually check expiring subscriptions
 * Returns list of subscriptions that need attention
 */
export async function checkExpiringSubscriptions() {
  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const today = new Date();

    const expiringSoon = await Subscription.find({
      status: 'active',
      endDate: {
        $gte: today,
        $lte: sevenDaysFromNow
      },
      autoRenew: false
    }).populate('userId', 'email name');

    logger.info(`Manual check: Found ${expiringSoon.length} subscriptions expiring soon`);

    return expiringSoon.map(sub => ({
      userId: sub.userId?._id,
      email: sub.userId?.email,
      name: sub.userId?.name,
      plan: sub.plan,
      endDate: sub.endDate,
      daysRemaining: Math.ceil((sub.endDate - today) / (1000 * 60 * 60 * 24))
    }));

  } catch (error) {
    logger.error('Error checking expiring subscriptions:', error);
    return [];
  }
}

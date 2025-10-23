import cron from 'node-cron';
import { Subscription } from '../models/index.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

/**
 * Cron job to send email notifications for expiring subscriptions
 * Runs daily at 9:00 AM
 */
export function startSubscriptionNotifications() {
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      logger.info('Starting subscription expiration notifications check');

      // Get subscriptions expiring in 7 days
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

      logger.info(`Found ${expiringSoon.length} subscriptions expiring soon`);

      // Send notifications
      let sentCount = 0;
      let failedCount = 0;

      for (const subscription of expiringSoon) {
        try {
          if (!subscription.userId || !subscription.userId.email) {
            logger.warn(`Subscription ${subscription._id} has no user email`);
            continue;
          }

          const daysUntilExpiry = Math.ceil(
            (subscription.endDate - today) / (1000 * 60 * 60 * 24)
          );

          const success = await sendExpirationNotification(
            subscription.userId.email,
            subscription.userId.name || 'Usuario',
            subscription.plan,
            subscription.endDate,
            daysUntilExpiry
          );

          if (success) {
            sentCount++;
            logger.info(`Expiration notification sent to ${subscription.userId.email}`);
          } else {
            failedCount++;
          }

        } catch (error) {
          logger.error(`Error sending notification for subscription ${subscription._id}:`, error);
          failedCount++;
        }
      }

      logger.info('Subscription notifications completed', {
        total: expiringSoon.length,
        sent: sentCount,
        failed: failedCount
      });

    } catch (error) {
      logger.error('Error in subscription notifications cron job:', error);
    }
  });

  logger.info('Subscription notifications cron job scheduled (daily at 9:00 AM)');
}

/**
 * Send expiration notification email
 */
async function sendExpirationNotification(email, name, plan, endDate, daysRemaining) {
  try {
    // Initialize email service if not already done
    emailService.initialize();

    const planLabels = {
      'free': 'Free',
      'premium': 'Premium',
      'pro': 'Pro',
      'business': 'Business',
      'enterprise': 'Enterprise',
      'white-label': 'White-Label'
    };

    const planName = planLabels[plan] || plan;
    const formattedDate = endDate.toLocaleDateString('es-UY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const subject = daysRemaining <= 3
      ? `⚠️ Tu suscripción ${planName} vence en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}`
      : `Recordatorio: Tu suscripción ${planName} vence pronto`;

    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
          .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .highlight { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #757575; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NEXUS</h1>
            <p>Tu Suscripción Está Por Vencer</p>
          </div>
          <div class="content">
            <h2>Hola ${name},</h2>

            <div class="highlight">
              <strong>⚠️ Tu suscripción al plan ${planName} vence en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}</strong>
            </div>

            <p>Tu suscripción actual expirará el <strong>${formattedDate}</strong>.</p>

            <div class="card">
              <h3>Detalles de tu Plan</h3>
              <ul>
                <li><strong>Plan:</strong> ${planName}</li>
                <li><strong>Fecha de vencimiento:</strong> ${formattedDate}</li>
                <li><strong>Días restantes:</strong> ${daysRemaining}</li>
              </ul>
            </div>

            <p>Para continuar disfrutando de todas las funcionalidades de Nexus sin interrupciones, por favor renueva tu suscripción antes de que expire.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:${process.env.ADMIN_EMAIL || 'contacto@nexus.uy'}?subject=Renovar%20suscripción%20${planName}&body=Hola,%0A%0AQuisiera%20renovar%20mi%20suscripción%20al%20plan%20${planName}.%0A%0ANombre:%20${name}%0AEmail:%20${email}%0A%0AGracias." class="button">
                Renovar Suscripción
              </a>
            </div>

            <p><strong>¿Necesitas ayuda?</strong><br>
            Contáctanos en <a href="mailto:${process.env.ADMIN_EMAIL || 'contacto@nexus.uy'}">${process.env.ADMIN_EMAIL || 'contacto@nexus.uy'}</a></p>

            <p>Gracias por confiar en Nexus,<br>
            El equipo de Nexus</p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático. Por favor no respondas a este email.</p>
            <p>&copy; ${new Date().getFullYear()} Nexus. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const transporter = emailService.transporter;
    if (!transporter) {
      logger.warn('Email service not initialized');
      return false;
    }

    const mailOptions = {
      from: `"Nexus Suscripciones" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: emailContent
    };

    await transporter.sendMail(mailOptions);
    return true;

  } catch (error) {
    logger.error('Error sending expiration notification:', error);
    return false;
  }
}

/**
 * Manually trigger subscription check (for testing)
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

    return expiringSoon;
  } catch (error) {
    logger.error('Error checking expiring subscriptions:', error);
    return [];
  }
}

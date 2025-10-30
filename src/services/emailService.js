import logger from '../utils/logger.js';

/**
 * Email service - DISABLED
 *
 * Automatic email sending has been disabled.
 * Users should use mailto: links in the UI to send emails with their default email client.
 *
 * This service is kept for compatibility but does not send any emails.
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize email transporter - DISABLED
   */
  initialize() {
    if (this.initialized) return;

    logger.info('Email service is disabled. Users should use mailto: links for contacting.');
    this.initialized = true;
  }

  /**
   * Send plan inquiry email - DISABLED
   * Returns false to indicate no email was sent
   */
  async sendPlanInquiry(data) {
    logger.info('Email sending disabled. Plan inquiry logged:', data);
    return false;
  }

  /**
   * Send confirmation email - DISABLED
   * Returns false to indicate no email was sent
   */
  async sendConfirmationEmail(email, name, plan, planType) {
    logger.info('Email sending disabled. Confirmation would be sent to:', email);
    return false;
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;

import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

/**
 * Email service for sending plan inquiries and notifications
 * Uses Gmail SMTP by default
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize email transporter with Gmail SMTP
   */
  initialize() {
    if (this.initialized) return;

    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    // Check if credentials are configured
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      logger.warn('Email service not configured. Set SMTP_USER and SMTP_PASS in .env');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport(emailConfig);
      this.initialized = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Send plan inquiry email to admin
   * @param {Object} data - Inquiry data
   * @param {string} data.plan - Plan name
   * @param {string} data.planType - 'personal' or 'business'
   * @param {string} data.name - User name
   * @param {string} data.email - User email
   * @param {string} data.company - Company name (optional)
   * @param {string} data.phone - Phone number (optional)
   * @param {string} data.message - Additional message (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async sendPlanInquiry(data) {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.transporter) {
      logger.error('Email service not available');
      return false;
    }

    const { plan, planType, name, email, company, phone, message } = data;

    // Get plan details
    const planDetails = this.getPlanDetails(plan, planType);

    // Build email content
    const emailContent = `
      <h2>Nueva Consulta de Plan - Nexus</h2>

      <h3>Información del Plan</h3>
      <ul>
        <li><strong>Plan:</strong> ${planDetails.name}</li>
        <li><strong>Tipo:</strong> ${planType === 'personal' ? 'Personal' : 'Empresarial'}</li>
        <li><strong>Precio:</strong> ${planDetails.priceUSD} USD / ${planDetails.priceUYU} UYU mensual</li>
      </ul>

      <h3>Información del Cliente</h3>
      <ul>
        <li><strong>Nombre:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        ${company ? `<li><strong>Empresa:</strong> ${company}</li>` : ''}
        ${phone ? `<li><strong>Teléfono:</strong> ${phone}</li>` : ''}
      </ul>

      ${message ? `
        <h3>Mensaje Adicional</h3>
        <p>${message}</p>
      ` : ''}

      <hr>
      <p><small>Enviado desde Nexus - Plataforma de Seguridad Ciudadana</small></p>
    `;

    const mailOptions = {
      from: `"Nexus Pricing" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: `Nueva Consulta: Plan ${planDetails.name} - ${name}`,
      html: emailContent,
      replyTo: email
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Plan inquiry email sent for ${plan} to ${email}`);
      return true;
    } catch (error) {
      logger.error('Failed to send plan inquiry email:', error);
      return false;
    }
  }

  /**
   * Send confirmation email to user
   * @param {string} email - User email
   * @param {string} name - User name
   * @param {string} plan - Plan name
   * @param {string} planType - Plan type
   * @returns {Promise<boolean>}
   */
  async sendConfirmationEmail(email, name, plan, planType) {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.transporter) {
      logger.error('Email service not available');
      return false;
    }

    const planDetails = this.getPlanDetails(plan, planType);

    const emailContent = `
      <h2>¡Gracias por tu interés en Nexus!</h2>

      <p>Hola ${name},</p>

      <p>Hemos recibido tu consulta sobre el plan <strong>${planDetails.name}</strong>.</p>

      <p>Nuestro equipo revisará tu solicitud y te contactará a la brevedad para coordinar los detalles de tu suscripción.</p>

      <h3>Resumen del Plan</h3>
      <ul>
        <li><strong>Plan:</strong> ${planDetails.name}</li>
        <li><strong>Precio:</strong> ${planDetails.priceUSD} USD / ${planDetails.priceUYU} UYU al mes</li>
      </ul>

      <p>Mientras tanto, puedes seguir explorando nuestra plataforma.</p>

      <p>Saludos,<br>
      El equipo de Nexus</p>

      <hr>
      <p><small>
        <a href="https://nexus.uy">Visitar Nexus</a> |
        <a href="mailto:${process.env.ADMIN_EMAIL || process.env.SMTP_USER}">Contacto</a>
      </small></p>
    `;

    const mailOptions = {
      from: `"Nexus" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Confirmación de Consulta - Plan ${planDetails.name}`,
      html: emailContent
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Confirmation email sent to ${email}`);
      return true;
    } catch (error) {
      logger.error('Failed to send confirmation email:', error);
      return false;
    }
  }

  /**
   * Get plan details including prices
   * @param {string} plan - Plan name
   * @param {string} planType - Plan type
   * @returns {Object} - Plan details
   */
  getPlanDetails(plan, planType) {
    const plans = {
      personal: {
        free: { name: 'Free', priceUSD: 0, priceUYU: 0 },
        premium: { name: 'Premium', priceUSD: 8, priceUYU: 350 },
        pro: { name: 'Pro', priceUSD: 25, priceUYU: 1100 }
      },
      business: {
        business: { name: 'Business', priceUSD: 50, priceUYU: 2200 },
        enterprise: { name: 'Enterprise', priceUSD: 150, priceUYU: 6600 },
        'white-label': { name: 'White-Label', priceUSD: 500, priceUYU: 22000 }
      }
    };

    return plans[planType]?.[plan] || { name: 'Unknown', priceUSD: 0, priceUYU: 0 };
  }

  /**
   * Verify email service connection
   * @returns {Promise<boolean>}
   */
  async verifyConnection() {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service verification failed:', error);
      return false;
    }
  }
}

// Singleton instance
const emailService = new EmailService();

export default emailService;

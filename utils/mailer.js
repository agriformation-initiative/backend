const nodemailer = require('nodemailer');

/**
 * Zoho Mail over SMTP.
 *   ZOHO_SMTP_USER   full mailbox address, e.g. hello@yourdomain.org
 *   ZOHO_SMTP_PASS   an app-specific password (Zoho Accounts > Security > App Passwords)
 *   ZOHO_SMTP_HOST   smtp.zoho.com (default). Use smtp.zoho.eu, smtp.zoho.in or smtp.zoho.com.au
 *                    if your Zoho account lives in another data centre.
 *   ZOHO_SMTP_PORT   465 (default, SSL). Use 587 for STARTTLS.
 *   MAIL_FROM        optional display sender, must use the same address as ZOHO_SMTP_USER
 */
const isConfigured = () => Boolean(process.env.ZOHO_SMTP_USER && process.env.ZOHO_SMTP_PASS);

let transporter;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.ZOHO_SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
      port,
      secure: port === 465,
      auth: { user: process.env.ZOHO_SMTP_USER, pass: process.env.ZOHO_SMTP_PASS },
    });
  }
  return transporter;
};

let warned = false;

/**
 * Send one email. Never throws: a mail problem must not fail the request that triggered it.
 * Resolves to true when the message was handed to Zoho.
 */
const sendMail = async ({ to, subject, html, text, replyTo }) => {
  if (!isConfigured()) {
    if (!warned) {
      console.warn('Email is not configured (ZOHO_SMTP_USER / ZOHO_SMTP_PASS). Emails are skipped.');
      warned = true;
    }
    return false;
  }
  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || `AgroNext <${process.env.ZOHO_SMTP_USER}>`,
      to,
      subject,
      html,
      text,
      replyTo,
    });
    return true;
  } catch (error) {
    console.error('Email failed:', error.message);
    return false;
  }
};

module.exports = { sendMail, isConfigured };

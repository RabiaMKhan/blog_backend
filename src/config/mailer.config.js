import nodemailer from "nodemailer";
import logger from "./logger.config.js";

const isMailConfigured = Boolean(process.env.SMTP_HOST);

const transporter = isMailConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      // secure: Number(process.env.SMTP_PORT) === 465, // true only for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export const sendMail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    logger.warn(`SMTP not configured - email not sent. To: ${to} | Subject: ${subject} | ${text}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
};

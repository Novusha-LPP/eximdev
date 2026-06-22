import { Resend } from "resend";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

const resend = new Resend(process.env.RESEND_API_KEY || "re_test_key");

let smtpTransporter = null;
if (process.env.SMTP_SERVER && process.env.SMTP_USER && process.env.SMTP_PASS) {
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export const sendEmail = async (options) => {
  const mailOptions = {
    from: options.from || DEFAULT_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html || `<p>${options.text || ""}</p>`,
    reply_to: options.reply_to,
  };

  if (options.attachments) mailOptions.attachments = options.attachments;
  if (options.cc) mailOptions.cc = options.cc;
  if (options.bcc) mailOptions.bcc = options.bcc;

  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail(mailOptions);
      console.log("SMTP Email sent:", info.messageId);
      return { data: { id: info.messageId } };
    } catch (err) {
      console.error("SMTP error:", err.message);
    }
  }

  try {
    const { data, error } = await resend.emails.send(mailOptions);
    if (error) {
      console.error("Resend error:", error);
      throw error;
    }
    console.log("Email sent:", data?.id);
    return { data };
  } catch (err) {
    console.error("Email send failed:", err.message);
    throw err;
  }
};

export const sendTestEmail = async (config, to) => {
  const logs = [];
  try {
    logs.push(`[${new Date().toLocaleTimeString()}] Starting email send via Resend...`);

    const mailOptions = {
      from: config.from_email || DEFAULT_FROM,
      to,
      subject: config.subject || "Test Email",
      text: config.text || "This is a test email from the EximDev application.",
      html: config.html || `<p>${config.text || "This is a test email from the EximDev application."}</p>`,
      reply_to: config.reply_to,
    };

    logs.push(`[${new Date().toLocaleTimeString()}] Sending to: ${to}`);
    const { data, error } = await resend.emails.send(mailOptions);
    if (error) {
      logs.push(`[${new Date().toLocaleTimeString()}] Resend error: ${error.message}`);
      logs.push(`[${new Date().toLocaleTimeString()}] Trying SMTP fallback...`);
      
      if (config.smtp_server && config.username && config.password) {
        const smtpTransporter = nodemailer.createTransport({
          host: config.smtp_server,
          port: parseInt(config.smtp_port) || 587,
          secure: false,
          auth: { user: config.username, pass: config.password },
        });
        const info = await smtpTransporter.sendMail(mailOptions);
        logs.push(`[${new Date().toLocaleTimeString()}] ✓ SMTP email sent! ID: ${info.messageId}`);
        return { success: true, logs };
      }
      logs.push(`[${new Date().toLocaleTimeString()}] ✗ No SMTP config available`);
      return { success: false, logs, error: error.message };
    }
    logs.push(`[${new Date().toLocaleTimeString()}] ✓ Email sent! ID: ${data?.id}`);

    return { success: true, logs };
  } catch (error) {
    logs.push(`[${new Date().toLocaleTimeString()}] ✗ Error: ${error.message}`);
    return { success: false, logs, error: error.message };
  }
};

export const saveEmailConfig = (config) => {
  try {
    process.env.EMAIL_CONFIG = JSON.stringify(config);
    return true;
  } catch (error) {
    console.error("Error saving email configuration:", error);
    return false;
  }
};

export const testEmailConfig = async () => {
  return true;
};
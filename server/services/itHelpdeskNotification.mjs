/**
 * IT Helpdesk Email Notification Service
 * Sends automated emails on ticket lifecycle events:
 * - Ticket Created   → requester + IT team alias
 * - Ticket Assigned  → assignee
 * - Ticket Resolved  → requester
 * - Ticket Closed    → requester
 *
 * Falls back silently if email is not configured.
 */

import { sendEmail } from "../middleware/nodemailerConfig.mjs";
import logger from "../logger.js";

const APP_NAME = "AlVision IT Helpdesk";
const IT_TEAM_EMAIL = process.env.IT_HELPDESK_TEAM_EMAIL || null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER || null;

/** Build a simple HTML email body */
const buildHtml = (heading, rows, footer = "") => `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
  <div style="background:#1565c0;padding:16px 24px">
    <h2 style="color:#fff;margin:0">${APP_NAME}</h2>
  </div>
  <div style="padding:24px">
    <h3 style="margin-top:0">${heading}</h3>
    <table style="border-collapse:collapse;width:100%">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;font-weight:600;background:#f5f5f5;width:160px">${label}</td>
          <td style="padding:8px 12px;border:1px solid #eee">${value || "—"}</td>
        </tr>`).join("")}
    </table>
    ${footer ? `<p style="margin-top:16px;color:#555">${footer}</p>` : ""}
  </div>
  <div style="background:#f5f5f5;padding:12px 24px;font-size:12px;color:#999">
    This is an automated message from ${APP_NAME}. Please do not reply to this email.
  </div>
</div>`;

/** Internal safe-send wrapper — never throws */
const safeSend = async (options) => {
  if (!FROM_EMAIL) {
    // Email not configured — skip silently
    return;
  }
  try {
    await sendEmail({ from: FROM_EMAIL, ...options });
  } catch (err) {
    logger.error(`IT Helpdesk email send failed: ${err.message}`);
  }
};

/**
 * Send notification when a ticket is created.
 * @param {Object} ticket  - saved ticket document
 * @param {string} requesterEmail - requester's email (may be undefined)
 */
export const notifyTicketCreated = async (ticket, requesterEmail) => {
  const rows = [
    ["Ticket ID", ticket.ticket_id],
    ["Title", ticket.title],
    ["Category", ticket.category],
    ["Priority", ticket.priority],
    ["Status", ticket.status],
    ["Department", ticket.department],
  ];
  const html = buildHtml(
    "✅ New IT Support Ticket Raised",
    rows,
    "Your ticket has been received and will be reviewed by the IT team shortly."
  );

  const recipients = [];
  if (requesterEmail) recipients.push(requesterEmail);
  if (IT_TEAM_EMAIL) recipients.push(IT_TEAM_EMAIL);

  if (recipients.length === 0) return;

  await safeSend({
    to: recipients.join(","),
    subject: `[${ticket.ticket_id}] New Ticket: ${ticket.title}`,
    html,
    text: `New ticket raised: ${ticket.ticket_id} — ${ticket.title} (${ticket.priority} priority)`,
  });
};

/**
 * Send notification when a ticket is assigned to an IT team member.
 * @param {Object} ticket        - updated ticket document
 * @param {string} assigneeEmail - email of the person the ticket is assigned to
 */
export const notifyTicketAssigned = async (ticket, assigneeEmail) => {
  if (!assigneeEmail) return;

  const rows = [
    ["Ticket ID", ticket.ticket_id],
    ["Title", ticket.title],
    ["Category", ticket.category],
    ["Priority", ticket.priority],
    ["SLA Due Date", ticket.sla_due_date ? new Date(ticket.sla_due_date).toDateString() : "—"],
    ["Department", ticket.department],
  ];
  const html = buildHtml(
    "🔔 Ticket Assigned To You",
    rows,
    "Please review and action this ticket as soon as possible."
  );

  await safeSend({
    to: assigneeEmail,
    subject: `[${ticket.ticket_id}] Assigned: ${ticket.title}`,
    html,
    text: `Ticket ${ticket.ticket_id} has been assigned to you: ${ticket.title}`,
  });
};

/**
 * Send notification when a ticket is resolved or closed.
 * @param {Object} ticket        - updated ticket document
 * @param {string} requesterEmail - requester's email
 */
export const notifyTicketResolved = async (ticket, requesterEmail) => {
  if (!requesterEmail) return;

  const isClose = ticket.status === "Closed";
  const rows = [
    ["Ticket ID", ticket.ticket_id],
    ["Title", ticket.title],
    ["Status", ticket.status],
    ["Resolution Notes", ticket.resolution_notes || "—"],
  ];
  const html = buildHtml(
    isClose ? "🔒 Ticket Closed" : "✅ Ticket Resolved",
    rows,
    isClose
      ? "Your ticket has been closed. If you need further assistance, please raise a new ticket."
      : "Your ticket has been resolved. Please confirm if the issue is fixed. If not, it will be reopened."
  );

  await safeSend({
    to: requesterEmail,
    subject: `[${ticket.ticket_id}] ${isClose ? "Closed" : "Resolved"}: ${ticket.title}`,
    html,
    text: `Ticket ${ticket.ticket_id} has been ${isClose ? "closed" : "resolved"}.`,
  });
};

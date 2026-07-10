
import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Ticket from "../../model/it-helpdesk/ticketModel.mjs";
import User from "../../model/userModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import logger from "../../logger.js";
import {
  notifyTicketCreated,
  notifyTicketAssigned,
  notifyTicketResolved,
} from "../../services/itHelpdeskNotification.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
router.use(authMiddleware);

// ── Multer config for ticket attachments (local disk) ───────────────────────
const uploadDir = path.join(__dirname, "../../uploads/it-helpdesk");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) return cb(null, true);
    cb(new Error("Unsupported file type"));
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({ success: false, message: "Invalid ID" });
  }
  next();
};

const generateTicketId = async () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `TK-${datePart}`;
  const last = await Ticket.findOne({ ticket_id: new RegExp(`^${prefix}`) }).sort({ ticket_id: -1 });
  let num = 1;
  if (last) {
    const match = last.ticket_id.match(/(\d+)$/);
    if (match) num = parseInt(match[1]) + 1;
  }
  return `${prefix}-${String(num).padStart(4, "0")}`;
};

/** Lookup email for a User._id from main User model */
const getUserEmail = async (userId) => {
  if (!userId) return null;
  try {
    const user = await User.findById(userId).select("email").lean();
    return user?.email || null;
  } catch {
    return null;
  }
};

// ── GET all tickets ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { status, category, priority, type, raised_by, assigned_to, search, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (raised_by) filter.raised_by = raised_by;
    if (assigned_to) filter.assigned_to = assigned_to;
    if (search) {
      filter.$or = [
        { ticket_id: new RegExp(search, "i") },
        { title: new RegExp(search, "i") },
        { requester_name: new RegExp(search, "i") },
        { department: new RegExp(search, "i") },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Ticket.find(filter)
        .populate("raised_by", "username email")
        .populate("assigned_to", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Ticket.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    logger.error(`Error fetching tickets: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ticket stats ─────────────────────────────────────────────────────────
router.get("/stats", async (_req, res) => {
  try {
    const [total, newCount, assigned, inProgress, pending, resolved, closed] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: "New" }),
      Ticket.countDocuments({ status: "Assigned" }),
      Ticket.countDocuments({ status: "In Progress" }),
      Ticket.countDocuments({ status: "Pending" }),
      Ticket.countDocuments({ status: "Resolved" }),
      Ticket.countDocuments({ status: "Closed" }),
    ]);
    res.json({
      success: true,
      data: { total, newCount, assigned, inProgress, pending, resolved, closed },
    });
  } catch (err) {
    logger.error(`Error fetching ticket stats: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET report / aggregation data ────────────────────────────────────────────
router.get("/report", async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    const matchStage = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    const [byStatus, byCategory, byPriority, byDepartment, byType, recentActivity] = await Promise.all([
      Ticket.aggregate([
        { $match: matchStage },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Ticket.aggregate([
        { $match: matchStage },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Ticket.aggregate([
        { $match: matchStage },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Ticket.aggregate([
        { $match: matchStage },
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Ticket.aggregate([
        { $match: matchStage },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Last 30 days daily ticket counts
      Ticket.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: { byStatus, byCategory, byPriority, byDepartment, byType, recentActivity },
    });
  } catch (err) {
    logger.error(`Error fetching ticket report: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET single ticket ─────────────────────────────────────────────────────────
router.get("/:id", validateId, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("raised_by", "username email")
      .populate("assigned_to", "username email")
      .populate("history.changed_by", "username email");

    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    res.json({ success: true, data: ticket });
  } catch (err) {
    logger.error(`Error fetching ticket: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST create ticket ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      title, description, category, subcategory, type, priority, severity,
      requester_name, department, contact_information, location,
      sla_due_date, resolution_notes, assigned_to,
    } = req.body;

    const ticket_id = await generateTicketId();
    const userId = req.user?._id || req.user?.id;

    // Determine initial status: "Assigned" if assigned_to is provided, else "New"
    const initialStatus = assigned_to ? "Assigned" : "New";

    const ticket = new Ticket({
      ticket_id,
      title,
      description,
      category,
      subcategory,
      type: type || "Incident",
      priority: priority || "Medium",
      severity,
      requester_name,
      department,
      contact_information,
      location,
      sla_due_date: sla_due_date || null,
      resolution_notes,
      assigned_to: assigned_to || undefined,
      raised_by: userId || undefined,
      status: initialStatus,
      history: [
        {
          action: "Created",
          changed_by: userId || undefined,
          changed_by_name: req.user?.username || "System",
          new_value: initialStatus,
          remarks: `Ticket created with status: ${initialStatus}`,
        },
      ],
    });

    await ticket.save();

    // Fire-and-forget email notifications
    setImmediate(async () => {
      try {
        const requesterEmail = await getUserEmail(userId);
        await notifyTicketCreated(ticket, requesterEmail);

        if (assigned_to) {
          const assigneeEmail = await getUserEmail(assigned_to);
          await notifyTicketAssigned(ticket, assigneeEmail);
        }
      } catch (e) {
        logger.error(`Ticket creation notification failed: ${e.message}`);
      }
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    logger.error(`Error creating ticket: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT update ticket ─────────────────────────────────────────────────────────
router.put("/:id", validateId, async (req, res) => {
  try {
    const existing = await Ticket.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Ticket not found" });

    const userId = req.user?._id || req.user?.id;

    // Check authorization: only Admin, the person who raised the ticket, or the person assigned to the ticket can update it.
    const isAuthorized =
      req.user?.role === "Admin" ||
      existing.raised_by?.toString() === userId?.toString() ||
      existing.assigned_to?.toString() === userId?.toString();

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this ticket" });
    }

    // If the ticket is already Closed, prevent further updates
    if (existing.status === "Closed") {
      return res.status(400).json({ success: false, message: "Closed tickets cannot be updated" });
    }

    const previousStatus = existing.status;
    const previousAssignee = existing.assigned_to?.toString();

    const {
      title, description, category, subcategory, type, priority, severity,
      requester_name, department, contact_information, location,
      sla_due_date, resolution_notes, assigned_to, status,
    } = req.body;

    // Check: only Admin can change the ticket status
    if (status && status !== existing.status && req.user?.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Only Admins are authorized to update the ticket status" });
    }



    const updateData = {
      title: title ?? existing.title,
      description: description ?? existing.description,
      category: category ?? existing.category,
      subcategory: subcategory ?? existing.subcategory,
      type: type ?? existing.type,
      priority: priority ?? existing.priority,
      severity: severity ?? existing.severity,
      requester_name: requester_name ?? existing.requester_name,
      department: department ?? existing.department,
      contact_information: contact_information ?? existing.contact_information,
      location: location ?? existing.location,
      sla_due_date: sla_due_date ?? existing.sla_due_date,
      resolution_notes: resolution_notes ?? existing.resolution_notes,
      assigned_to: assigned_to ?? existing.assigned_to,
      status: status ?? existing.status,
    };

    // Track status changes
    const historyEntries = [];
    if (status && status !== previousStatus) {
      historyEntries.push({
        action: "Status Changed",
        changed_by: userId,
        changed_by_name: req.user?.username || "System",
        old_value: previousStatus,
        new_value: status,
        remarks: `Status changed from ${previousStatus} to ${status}`,
      });

      if (status === "Resolved") updateData.resolved_at = new Date();
      if (status === "Closed") updateData.closed_at = new Date();
    }

    // Track assignment changes
    const newAssignee = assigned_to?.toString();
    if (newAssignee && newAssignee !== previousAssignee) {
      historyEntries.push({
        action: "Assigned",
        changed_by: userId,
        changed_by_name: req.user?.username || "System",
        new_value: newAssignee,
        remarks: `Ticket re-assigned`,
      });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        $push: { history: { $each: historyEntries } },
      },
      { new: true }
    )
      .populate("raised_by", "username email")
      .populate("assigned_to", "username email");

    // Fire-and-forget notifications
    setImmediate(async () => {
      try {
        if (status && (status === "Resolved" || status === "Closed")) {
          const requesterEmail = await getUserEmail(ticket.raised_by?._id || ticket.raised_by);
          await notifyTicketResolved(ticket, requesterEmail);
        }
        if (newAssignee && newAssignee !== previousAssignee) {
          const assigneeEmail = await getUserEmail(assigned_to);
          await notifyTicketAssigned(ticket, assigneeEmail);
        }
      } catch (e) {
        logger.error(`Ticket update notification failed: ${e.message}`);
      }
    });

    res.json({ success: true, data: ticket });
  } catch (err) {
    logger.error(`Error updating ticket: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST assign ticket (dedicated endpoint) ───────────────────────────────────
router.post("/:id/assign", validateId, async (req, res) => {
  try {
    const { assigned_to, remarks } = req.body;
    if (!assigned_to) return res.status(400).json({ success: false, message: "assigned_to is required" });

    const userId = req.user?._id || req.user?.id;
    const existing = await Ticket.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Ticket not found" });

    // Check authorization: only Admin or the person currently assigned to the ticket can re-assign it.
    const isAuthorized =
      req.user?.role === "Admin" ||
      existing.assigned_to?.toString() === userId?.toString();

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Unauthorized to assign this ticket" });
    }

    // If the ticket is already Closed, prevent further updates
    if (existing.status === "Closed") {
      return res.status(400).json({ success: false, message: "Closed tickets cannot be assigned" });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        assigned_to,
        status: "Assigned",
        $push: {
          history: {
            action: "Assigned",
            changed_by: userId,
            changed_by_name: req.user?.username || "System",
            old_value: existing.assigned_to?.toString() || "Unassigned",
            new_value: assigned_to,
            remarks: remarks || "Ticket assigned",
          },
        },
      },
      { new: true }
    )
      .populate("raised_by", "username email")
      .populate("assigned_to", "username email");

    setImmediate(async () => {
      try {
        const assigneeEmail = await getUserEmail(assigned_to);
        await notifyTicketAssigned(ticket, assigneeEmail);
      } catch (e) {
        logger.error(`Ticket assign notification failed: ${e.message}`);
      }
    });

    res.json({ success: true, data: ticket });
  } catch (err) {
    logger.error(`Error assigning ticket: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST add history comment ──────────────────────────────────────────────────
router.post("/:id/history", validateId, async (req, res) => {
  try {
    const { remarks, action = "Comment" } = req.body;
    if (!remarks) return res.status(400).json({ success: false, message: "remarks is required" });

    const userId = req.user?._id || req.user?.id;
    const existing = await Ticket.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Ticket not found" });

    // Check authorization: only Admin, the person who raised the ticket, or the person assigned to the ticket can add history/comments.
    const isAuthorized =
      req.user?.role === "Admin" ||
      existing.raised_by?.toString() === userId?.toString() ||
      existing.assigned_to?.toString() === userId?.toString();

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Unauthorized to comment on this ticket" });
    }

    // If the ticket is already Closed, prevent further updates
    if (existing.status === "Closed") {
      return res.status(400).json({ success: false, message: "Closed tickets cannot be commented on" });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          history: {
            action,
            changed_by: userId,
            changed_by_name: req.user?.username || "System",
            remarks,
          },
        },
      },
      { new: true }
    ).populate("history.changed_by", "username email");

    res.json({ success: true, data: ticket });
  } catch (err) {
    logger.error(`Error adding history to ticket: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST upload attachment ────────────────────────────────────────────────────
router.post("/:id/attachments", validateId, upload.array("files", 5), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    const userId = req.user?._id || req.user?.id;

    // Check authorization: only Admin, the person who raised the ticket, or the person assigned to the ticket can upload attachments.
    const isAuthorized =
      req.user?.role === "Admin" ||
      ticket.raised_by?.toString() === userId?.toString() ||
      ticket.assigned_to?.toString() === userId?.toString();

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Unauthorized to upload attachments to this ticket" });
    }

    // If the ticket is already Closed, prevent further updates
    if (ticket.status === "Closed") {
      return res.status(400).json({ success: false, message: "Closed tickets cannot have attachments added" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const newAttachments = req.files.map((file) => ({
      file_url: `${baseUrl}/uploads/it-helpdesk/${file.filename}`,
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_by: userId,
    }));

    const updated = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          attachments: { $each: newAttachments },
          history: {
            action: "Attachment Added",
            changed_by: userId,
            changed_by_name: req.user?.username || "System",
            remarks: `${req.files.length} file(s) attached: ${req.files.map((f) => f.originalname).join(", ")}`,
          },
        },
      },
      { new: true }
    );

    res.json({ success: true, data: updated, attachments: newAttachments });
  } catch (err) {
    logger.error(`Error uploading ticket attachment: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE ticket ─────────────────────────────────────────────────────────────
router.delete("/:id", validateId, async (req, res) => {
  try {
    if (req.user?.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Only Admins are authorized to delete tickets" });
    }
    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Ticket deleted" });
  } catch (err) {
    logger.error(`Error deleting ticket: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;



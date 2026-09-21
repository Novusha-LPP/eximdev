
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
import { isHRAdminUser } from "../../utils/hrAdminRoleHelper.mjs";
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
const ALLOWED_TICKET_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "pdf",
]);

const ALLOWED_TICKET_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/pjpeg",
  "image/x-png",
  "application/pdf",
]);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase().replace(".", "");
    const mime = (file.mimetype || "").toLowerCase();

    const isImageOrPdf =
      ALLOWED_TICKET_MIMES.has(mime) ||
      ["jpg", "jpeg", "png", "pdf"].includes(ext);

    if (
      ALLOWED_TICKET_EXTENSIONS.has(ext) &&
      (isImageOrPdf || mime === "application/octet-stream")
    ) {
      return cb(null, true);
    }
    cb(new Error("Only JPG, JPEG, PNG, and PDF files are allowed"));
  },
});

const handleUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      logger.error(`Multer upload error: ${err.message}`);
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

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
    const { status, category, priority, type, department, raised_by, assigned_to, search, page = 1, limit = 15, all, fromDate, toDate } = req.query;
    const filter = {};
    if (status && status !== "ALL") filter.status = status;
    if (category && category !== "ALL") filter.category = category;
    if (priority && priority !== "ALL") filter.priority = priority;
    if (type && type !== "ALL") filter.type = type;
    if (department && department !== "ALL") filter.department = department;
    if (raised_by) filter.raised_by = raised_by;
    if (assigned_to) filter.assigned_to = assigned_to;
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endOfDay;
      }
    }
    if (search) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      filter.$or = [
        { ticket_id: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
        { requester_name: searchRegex },
        { department: searchRegex },
        { category: searchRegex },
      ];
    }

    // Role-based visibility:
    // HR Admin and Admin users see ALL tickets across all departments.
    // Normal users ONLY see tickets raised by themselves.
    const isSupportStaff = await isHRAdminUser(req.user);
    const userId = req.user?._id || req.user?.id;
    const username = req.user?.username;

    if (!isSupportStaff) {
      const userOwnership = [];
      if (userId) {
        userOwnership.push({ raised_by: userId });
        if (mongoose.Types.ObjectId.isValid(userId)) {
          userOwnership.push({ raised_by: new mongoose.Types.ObjectId(userId) });
        }
      }
      if (username) {
        userOwnership.push({ requester_name: username });
        userOwnership.push({ requester_name: new RegExp(`^${username}$`, "i") });
      }
      const ownershipCondition = userOwnership.length > 1 ? { $or: userOwnership } : (userOwnership[0] || {});

      if (filter.$or) {
        filter.$and = [ownershipCondition, { $or: filter.$or }];
        delete filter.$or;
      } else {
        Object.assign(filter, ownershipCondition);
      }
    }

    if (all === "true") {
      const data = await Ticket.find(filter)
        .populate("raised_by", "username email first_name last_name name")
        .populate("assigned_to", "username email first_name last_name name")
        .sort({ createdAt: -1 });
      return res.json({ success: true, data });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 15);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      Ticket.find(filter)
        .populate("raised_by", "username email first_name last_name name")
        .populate("assigned_to", "username email first_name last_name name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Ticket.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (err) {
    logger.error(`Error fetching tickets: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ticket stats ─────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const isSupportStaff = await isHRAdminUser(req.user);
    const userId = req.user?._id || req.user?.id;
    const username = req.user?.username;

    let baseFilter = {};
    if (!isSupportStaff) {
      const userOwnership = [];
      if (userId) {
        userOwnership.push({ raised_by: userId });
        if (mongoose.Types.ObjectId.isValid(userId)) {
          userOwnership.push({ raised_by: new mongoose.Types.ObjectId(userId) });
        }
      }
      if (username) {
        userOwnership.push({ requester_name: username });
        userOwnership.push({ requester_name: new RegExp(`^${username}$`, "i") });
      }
      baseFilter = userOwnership.length > 1 ? { $or: userOwnership } : (userOwnership[0] || {});
    }

    const [total, newCount, assigned, inProgress, pending, resolved, closed] = await Promise.all([
      Ticket.countDocuments({ ...baseFilter }),
      Ticket.countDocuments({ ...baseFilter, status: "New" }),
      Ticket.countDocuments({ ...baseFilter, status: "Assigned" }),
      Ticket.countDocuments({ ...baseFilter, status: "In Progress" }),
      Ticket.countDocuments({ ...baseFilter, status: "Pending" }),
      Ticket.countDocuments({ ...baseFilter, status: "Resolved" }),
      Ticket.countDocuments({ ...baseFilter, status: "Closed" }),
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
    const isSupportStaff = await isHRAdminUser(req.user);
    const userId = req.user?._id || req.user?.id;
    const username = req.user?.username;

    const { from, to } = req.query;
    const matchConditions = [];
    if (from || to) {
      const dateFilter = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
      matchConditions.push({ createdAt: dateFilter });
    }

    if (!isSupportStaff) {
      const userOwnership = [];
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        userOwnership.push({ raised_by: new mongoose.Types.ObjectId(userId) });
      }
      if (username) userOwnership.push({ requester_name: username });
      if (userOwnership.length > 0) {
        matchConditions.push({ $or: userOwnership });
      }
    }

    const matchStage = matchConditions.length === 1
      ? matchConditions[0]
      : matchConditions.length > 1
      ? { $and: matchConditions }
      : {};

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
            ...matchStage,
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
      .populate("raised_by", "username email first_name last_name name")
      .populate("assigned_to", "username email first_name last_name name")
      .populate("history.changed_by", "username email first_name last_name name")
      .populate("attachments.uploaded_by", "username email first_name last_name name");

    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    // IDOR Protection: Normal Users can ONLY access tickets raised by them
    const isSupportStaff = await isHRAdminUser(req.user);
    const userId = req.user?._id || req.user?.id;
    const username = req.user?.username;

    if (!isSupportStaff) {
      const ticketRaisedById = ticket.raised_by?._id?.toString() || ticket.raised_by?.toString();
      const isOwner =
        (ticketRaisedById && ticketRaisedById === userId?.toString()) ||
        (ticket.requester_name && ticket.requester_name === username);

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are only authorized to view tickets raised by you.",
        });
      }
    }

    res.json({ success: true, data: ticket });
  } catch (err) {
    logger.error(`Error fetching ticket: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST create ticket ────────────────────────────────────────────────────────
router.post("/", handleUpload, async (req, res) => {
  try {
    const {
      title, description, category, subcategory, type, priority, severity,
      requester_name, department, contact_information, location,
      sla_due_date, resolution_notes, assigned_to, status,
    } = req.body;

    const ticket_id = await generateTicketId();
    const userId = req.user?._id || req.user?.id;
    const username = req.user?.username;
    const userFullName = req.user?.first_name
      ? `${req.user.first_name} ${req.user.last_name || ""}`.trim()
      : username;

    const finalRequesterName = requester_name || username || userFullName || "User";

    // Use requested status (defaults to "New")
    const initialStatus = status || "New";

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const initialAttachments = (req.files || []).map((file) => ({
      file_url: `${baseUrl}/uploads/it-helpdesk/${file.filename}`,
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_by: userId,
      uploaded_at: new Date(),
    }));

    const history = [
      {
        action: "Created",
        changed_by: userId || undefined,
        changed_by_name: req.user?.username || "System",
        new_value: initialStatus,
        remarks: `Ticket created with status: ${initialStatus}`,
      },
    ];

    if (initialAttachments.length > 0) {
      history.push({
        action: "Attachment Added",
        changed_by: userId || undefined,
        changed_by_name: req.user?.username || "System",
        remarks: `${initialAttachments.length} file(s) attached: ${initialAttachments.map((f) => f.file_name).join(", ")}`,
      });
    }

    const finalTitle = (title && String(title).trim()) || (description ? String(description).slice(0, 60).trim() : "Support Ticket");

    const ticket = new Ticket({
      ticket_id,
      title: finalTitle,
      description,
      category,
      subcategory,
      type: type || "Incident",
      priority: priority || "Medium",
      severity,
      requester_name: finalRequesterName,
      department,
      contact_information,
      location,
      sla_due_date: sla_due_date || null,
      resolution_notes,
      assigned_to: assigned_to || undefined,
      raised_by: userId || undefined,
      status: initialStatus,
      attachments: initialAttachments,
      history,
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
    const isSupportStaff = await isHRAdminUser(req.user);
    const isOwner =
      existing.raised_by?.toString() === userId?.toString() ||
      (existing.requester_name && existing.requester_name === req.user?.username);
    const isAssignee = existing.assigned_to?.toString() === userId?.toString();

    const isAuthorized = isSupportStaff || isOwner || isAssignee;

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

    // Only HR Admin and Admin users can update status or reassign
    if (!isSupportStaff) {
      if (status && status !== existing.status) {
        return res.status(403).json({ success: false, message: "Only HR Admin and Admin users are authorized to update ticket status" });
      }
      if (assigned_to && assigned_to !== previousAssignee) {
        return res.status(403).json({ success: false, message: "Only HR Admin and Admin users are authorized to assign or reassign tickets" });
      }
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

    const isSupportStaff = await isHRAdminUser(req.user);
    const isAssignee = existing.assigned_to?.toString() === userId?.toString();

    if (!isSupportStaff && !isAssignee) {
      return res.status(403).json({ success: false, message: "Only HR Admin and Admin users are authorized to assign this ticket" });
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

    const isSupportStaff = await isHRAdminUser(req.user);
    const isOwner =
      existing.raised_by?.toString() === userId?.toString() ||
      (existing.requester_name && existing.requester_name === req.user?.username);
    const isAssignee = existing.assigned_to?.toString() === userId?.toString();

    if (!isSupportStaff && !isOwner && !isAssignee) {
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
router.post("/:id/attachments", validateId, handleUpload, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    const userId = req.user?._id || req.user?.id;
    const isSupportStaff = await isHRAdminUser(req.user);
    const isOwner =
      !ticket.raised_by ||
      ticket.raised_by?.toString() === userId?.toString() ||
      (ticket.requester_name && ticket.requester_name === req.user?.username);
    const isAssignee = ticket.assigned_to?.toString() === userId?.toString();

    if (!isSupportStaff && !isOwner && !isAssignee) {
      return res.status(403).json({ success: false, message: "Unauthorized to upload attachments to this ticket" });
    }

    // If the ticket is already Closed, prevent further updates
    if (ticket.status === "Closed") {
      return res.status(400).json({ success: false, message: "Closed tickets cannot have attachments added" });
    }

    const uploadedFiles = req.files || [];
    if (uploadedFiles.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const newAttachments = uploadedFiles.map((file) => ({
      file_url: `${baseUrl}/uploads/it-helpdesk/${file.filename}`,
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_by: userId,
      uploaded_at: new Date(),
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
            remarks: `${uploadedFiles.length} file(s) attached: ${uploadedFiles.map((f) => f.originalname).join(", ")}`,
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

// ── DELETE single attachment ──────────────────────────────────────────────────
router.delete("/:id/attachments/:attachmentId", validateId, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    if (ticket.status === "Closed") {
      return res.status(400).json({ success: false, message: "Closed tickets cannot have attachments deleted" });
    }

    const userId = req.user?._id || req.user?.id;
    const isSupportStaff = await isHRAdminUser(req.user);
    const isOwner =
      !ticket.raised_by ||
      ticket.raised_by?.toString() === userId?.toString() ||
      (ticket.requester_name && ticket.requester_name === req.user?.username);
    const isAssignee = ticket.assigned_to?.toString() === userId?.toString();

    if (!isSupportStaff && !isOwner && !isAssignee) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete attachments from this ticket" });
    }

    const attachmentIdStr = String(req.params.attachmentId);
    const targetAttachment = ticket.attachments.find(
      (a) => a._id?.toString() === attachmentIdStr
    );

    if (!targetAttachment) {
      return res.status(404).json({ success: false, message: "Attachment not found" });
    }

    const fileName = targetAttachment.file_name;

    // Filter out target attachment
    ticket.attachments = ticket.attachments.filter(
      (a) => a._id?.toString() !== attachmentIdStr
    );

    ticket.history.push({
      action: "Attachment Removed",
      changed_by: userId,
      changed_by_name: req.user?.username || "System",
      remarks: `Attachment removed: "${fileName}"`,
    });

    await ticket.save();
    res.json({ success: true, message: "Attachment removed successfully", data: ticket });
  } catch (err) {
    logger.error(`Error deleting attachment: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT replace single attachment ─────────────────────────────────────────────
router.put("/:id/attachments/:attachmentId", validateId, handleUpload, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    if (ticket.status === "Closed") {
      return res.status(400).json({ success: false, message: "Closed tickets cannot have attachments modified" });
    }

    const userId = req.user?._id || req.user?.id;
    const isSupportStaff = await isHRAdminUser(req.user);
    const isOwner =
      !ticket.raised_by ||
      ticket.raised_by?.toString() === userId?.toString() ||
      (ticket.requester_name && ticket.requester_name === req.user?.username);
    const isAssignee = ticket.assigned_to?.toString() === userId?.toString();

    if (!isSupportStaff && !isOwner && !isAssignee) {
      return res.status(403).json({ success: false, message: "Unauthorized to modify attachments on this ticket" });
    }

    const uploadedFiles = req.files || [];
    if (uploadedFiles.length === 0) {
      return res.status(400).json({ success: false, message: "No replacement file provided" });
    }

    const attachmentIdStr = String(req.params.attachmentId);
    const targetAttachment = ticket.attachments.find(
      (a) => a._id?.toString() === attachmentIdStr
    );

    if (!targetAttachment) {
      return res.status(404).json({ success: false, message: "Attachment not found" });
    }

    const oldFileName = targetAttachment.file_name;
    const newFile = uploadedFiles[0];
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // Update target attachment fields
    targetAttachment.file_url = `${baseUrl}/uploads/it-helpdesk/${newFile.filename}`;
    targetAttachment.file_name = newFile.originalname;
    targetAttachment.file_size = newFile.size;
    targetAttachment.mime_type = newFile.mimetype;
    targetAttachment.uploaded_by = userId;
    targetAttachment.uploaded_at = new Date();

    ticket.history.push({
      action: "Attachment Replaced",
      changed_by: userId,
      changed_by_name: req.user?.username || "System",
      remarks: `Attachment replaced: "${oldFileName}" -> "${newFile.originalname}"`,
    });

    await ticket.save();
    res.json({ success: true, message: "Attachment replaced successfully", data: ticket });
  } catch (err) {
    logger.error(`Error replacing attachment: ${err.message}`);
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



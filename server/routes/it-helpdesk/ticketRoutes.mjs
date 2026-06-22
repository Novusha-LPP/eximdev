
import express from "express";
import mongoose from "mongoose";
import Ticket from "../../model/it-helpdesk/ticketModel.mjs";

const router = express.Router();

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

router.get("/", async (req, res) => {
  try {
    const { status, category, priority, raised_by, assigned_to, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (raised_by) filter.raised_by = raised_by;
    if (assigned_to) filter.assigned_to = assigned_to;

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
    res.status(500).json({ success: false, message: err.message });
  }
});

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
      data: { total, newCount, assigned, inProgress, pending, resolved, closed } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const toTicketModel = (body, existing = null) => {
  const source = existing ? { ...existing.toObject(), ...body } : body;
  return {
    ticket_id: source.ticket_number,
    title: source.title,
    description: source.description,
    category: source.category,
    subcategory: source.subcategory,
    priority: source.priority,
    severity: source.severity,
    requester_name: source.requester_name,
    department: source.department,
    contact_information: source.contact_information,
    location: source.location,
    attachment: source.attachment,
    date_time: source.date_time,
    created_date: source.created_at,
    status: source.status,
    assigned_to: source.assigned_to,
    type: source.type,
    sla_due_date: source.sla_due_date,
    resolution_notes: source.resolution_notes,
  };
};

router.post("/", async (req, res) => {
  try {
    const ticketData = toTicketModel(req.body);
    ticketData.ticket_id = await generateTicketId();
    const ticket = new Ticket(ticketData);
    await ticket.save();
    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id", validateId, async (req, res) => {
  try {
    const existing = await Ticket.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Ticket not found" });
    const update = toTicketModel(req.body, existing);
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("raised_by", "username email")
      .populate("assigned_to", "username email");
    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id", validateId, async (req, res) => {
  try {
    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Ticket deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

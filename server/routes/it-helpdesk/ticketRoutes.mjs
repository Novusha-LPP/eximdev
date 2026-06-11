
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
    const [total, newCount, assigned, inProgress, resolved, closed] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: "New" }),
      Ticket.countDocuments({ status: "Assigned" }),
      Ticket.countDocuments({ status: "In Progress" }),
      Ticket.countDocuments({ status: "Resolved" }),
      Ticket.countDocuments({ status: "Closed" }),
    ]);
    res.json({ success: true, data: { total, newCount, assigned, inProgress, resolved, closed } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/", async (req, res) => {
      try {
    const ticketData = {
      ...req.body,
      ticket_id: await generateTicketId(),
    };
    const ticket = new Ticket(ticketData);
    await ticket.save();
    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id", validateId, async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true })
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

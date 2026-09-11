import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const ticketSchema = new mongoose.Schema({
  ticket_id: { type: String, required: true, unique: true, trim: true },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    default: null,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ["Hardware", "Software", "Network", "Access", "Email", "Other"],
  },
  subcategory: { type: String, trim: true },
  type: {
    type: String,
    enum: ["Incident", "Service Request", "Problem", "Change Request", "Maintenance", "Other"],
    default: "Incident",
  },
  priority: {
    type: String,
    required: true,
    enum: ["Low", "Medium", "High", "Critical", "Urgent"],
    default: "Medium",
  },
  severity: { type: String, trim: true },
  requester_name: { type: String, trim: true },
  department: { type: String, trim: true },
  contact_information: { type: String, trim: true },
  location: { type: String, trim: true },
  date_time: { type: Date, default: Date.now },
  status: {
    type: String,
    required: true,
    enum: ["New", "Assigned", "In Progress", "Pending", "Resolved", "Closed"],
    default: "New",
  },
  raised_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolved_at: { type: Date },
  closed_at: { type: Date },
  escalation_level: { type: Number, default: 0 },
  sla_due_date: { type: Date, default: null },
  sla_breached: { type: Boolean, default: false },
  resolution_notes: { type: String, trim: true },

  // File attachments array
  attachments: [
    {
      file_url: { type: String },
      file_name: { type: String },
      file_size: { type: Number },
      mime_type: { type: String },
      uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      uploaded_at: { type: Date, default: Date.now },
    },
  ],

  // Full activity/history log
  history: [
    {
      action: { type: String, required: true },
      changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      changed_by_name: { type: String },
      old_value: { type: String },
      new_value: { type: String },
      timestamp: { type: Date, default: Date.now },
      remarks: { type: String },
    },
  ],
}, { timestamps: true });

// ─── Compound ESR & Partial Indexes ───────────────────────────────────────────
// 1. Primary Grid Listing: Filter by status, sort by createdAt desc
ticketSchema.index({ status: 1, createdAt: -1 });

// 2. Branch-scoped grid listing
ticketSchema.index({ branchId: 1, status: 1, createdAt: -1 });

// 3. Category filter with createdAt sort
ticketSchema.index({ category: 1, createdAt: -1 });

// 4. Priority filter with createdAt sort
ticketSchema.index({ priority: 1, createdAt: -1 });

// 5. Department filter with createdAt sort
ticketSchema.index({ department: 1, createdAt: -1 });

// 6. Engineer Workload Queue: (ESR: assigned_to -> status -> sort createdAt desc)
ticketSchema.index({ assigned_to: 1, status: 1, createdAt: -1 });

// 7. My Raised Tickets Query
ticketSchema.index({ raised_by: 1, createdAt: -1 });

// 8. SLA Due Date & Status Compound Index
ticketSchema.index({ sla_due_date: 1, status: 1 });

// 9. High-performance text search across ticket text fields
ticketSchema.index(
  { ticket_id: "text", title: "text", requester_name: "text", department: "text" },
  {
    weights: { ticket_id: 10, title: 5, requester_name: 2, department: 1 },
    name: "TicketSearchTextIndex",
  }
);

ticketSchema.plugin(auditPlugin, { documentType: "HelpdeskTicket" });

export default mongoose.models.HelpdeskTicket || mongoose.model("HelpdeskTicket", ticketSchema);


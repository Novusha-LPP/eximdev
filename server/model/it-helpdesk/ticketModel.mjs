import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const ticketSchema = new mongoose.Schema({
  ticket_id: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ["Hardware", "Software", "Network", "Access", "Other"],
    index: true,
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
    enum: ["Low", "Medium", "High", "Critical"],
    default: "Medium",
    index: true,
  },
  severity: { type: String, trim: true },
  requester_name: { type: String, trim: true },
  department: { type: String, trim: true, index: true },
  contact_information: { type: String, trim: true },
  location: { type: String, trim: true },
  date_time: { type: Date, index: true },
  status: {
    type: String,
    required: true,
    enum: ["New", "Assigned", "In Progress", "Pending", "Resolved", "Closed"],
    default: "New",
    index: true,
  },
  raised_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolved_at: { type: Date },
  closed_at: { type: Date },
  escalation_level: { type: Number, default: 0 },
  sla_due_date: { type: Date, default: null },
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

ticketSchema.plugin(auditPlugin, { documentType: "HelpdeskTicket" });

export default mongoose.models.HelpdeskTicket || mongoose.model("HelpdeskTicket", ticketSchema);


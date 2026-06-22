import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const ticketSchema = new mongoose.Schema({
  ticket_id: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true, enum: ["Hardware", "Software", "Network", "Access", "Other"], index: true },
  priority: { type: String, required: true, enum: ["Low", "Medium", "High", "Critical"], default: "Medium", index: true },
  status: { type: String, required: true, enum: ["New", "Assigned", "In Progress", "Pending", "Resolved", "Closed"], default: "New", index: true },
  type: { type: String, enum: ["Incident", "Service Request"], default: "Incident" },
  raised_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  department: { type: String, trim: true, index: true },
  sla_due_date: { type: Date, index: true },
  resolution_notes: { type: String },
  resolved_at: { type: Date },
  closed_at: { type: Date },
  escalation_level: { type: Number, default: 0 },
  attachments: [{ file_url: String, file_name: String, uploaded_at: { type: Date, default: Date.now } }],
  history: [{
    action: { type: String, required: true },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date, default: Date.now },
    remarks: String
  }]
}, { timestamps: true });

ticketSchema.plugin(auditPlugin, { documentType: "HelpdeskTicket" });

export default mongoose.model("HelpdeskTicket", ticketSchema);

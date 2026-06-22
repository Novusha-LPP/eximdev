import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const ticketSchema = new mongoose.Schema({
  ticket_id: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true, enum: ["Hardware", "Software", "Network", "Access", "Other"], index: true },
  subcategory: { type: String, trim: true },
  priority: { type: String, required: true, enum: ["Low", "Medium", "High", "Critical"], default: "Medium", index: true },
  severity: { type: String, trim: true },
  requester_name: { type: String, trim: true },
  department: { type: String, trim: true, index: true },
  contact_information: { type: String, trim: true },
  location: { type: String, trim: true },
  attachment: { type: String, trim: true },
  date_time: { type: Date, index: true },
  status: { type: String, required: true, enum: ["New", "Assigned", "In Progress", "Pending", "Resolved", "Closed"], default: "New", index: true },
  raised_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolved_at: { type: Date },
  closed_at: { type: Date },
  escalation_level: { type: Number, default: 0 },
  sla_due_date: { type: Date, default: null },
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

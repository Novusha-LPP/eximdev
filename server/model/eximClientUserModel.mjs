import mongoose from "mongoose";

const Schema = mongoose.Schema;

const eximClientUserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String },
  assignedImporterName: { type: String, default: null },
  status: { type: String, default: "active" },
  role: { type: String, default: "user" },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  assignedModules: [{ type: String }],
  columnOrder: [{ type: String }],
  allowedColumns: [{ type: String }],
  lastLogin: { type: Date, default: null },
  lastLogout: { type: Date, default: null },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  registrationIp: { type: String },
  verificationDate: { type: Date, default: null },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  assignedIeCode: { type: String, default: null },
  jobsTabVisible: { type: Boolean, default: true },
  gandhidhamTabVisible: { type: Boolean, default: true },
  passwordResetToken: { type: String, default: null },
  passwordResetExpires: { type: Date, default: null },
  ie_code_assignments: [
    {
      ie_code_no: { type: String },
      importer_name: { type: String },
      assigned_at: { type: Date },
      assigned_by: { type: mongoose.Schema.Types.ObjectId },
      assigned_by_model: { type: String }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: "eximclientusers" // Maps exactly to the eximclientusers collection in MongoDB
});

const EximClientUserModel = mongoose.model("EximClientUser", eximClientUserSchema);
export default EximClientUserModel;

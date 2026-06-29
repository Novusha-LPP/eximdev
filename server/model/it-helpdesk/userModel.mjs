import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ["Admin", "IT Team", "Manager", "Employee"],
      default: "Employee",
    },
    group: { type: String, trim: true, default: "" },
    permissions: [{ type: String }],
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    last_login: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
userSchema.plugin(auditPlugin, { documentType: "User" });

/**
 * ✅ FIX: Prevent OverwriteModelError and clash with global 'User'
 */
const ITHelpdeskUser =
  mongoose.models.ITHelpdeskUser || mongoose.model("ITHelpdeskUser", userSchema);

export default ITHelpdeskUser;
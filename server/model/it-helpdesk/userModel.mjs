import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String, trim: true, default: "" },
    last_name: { type: String, trim: true, default: "" },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      default: null,
      index: true,
    },

    phone: { type: String, trim: true, default: "" },

    role: {
      type: String,
      enum: ["Admin", "IT Support", "Manager", "User"],
      default: "User",
      index: true,
    },

    department: { type: String, trim: true, default: "" },

    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },

    last_login: {
      type: Date,
      default: null,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * ✅ FIX: Prevent OverwriteModelError in nodemon / hot reload
 */
const User =
  mongoose.models.User || mongoose.model("User", userSchema);

export default User;
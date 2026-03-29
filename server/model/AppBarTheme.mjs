import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
  start: { type: Date, default: null },
  end: { type: Date, default: null },
}, { _id: false });

const appBarThemeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // Festival preset tag e.g. "Diwali", "Holi", "Custom"
    tag: {
      type: String,
      default: "Custom",
    },
    // Full GrapesJS project data - so the editor can re-open and edit
    gjsData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // Sanitized HTML from GrapesJS
    html: {
      type: String,
      default: "",
    },
    // Scoped CSS from GrapesJS
    css: {
      type: String,
      default: "",
    },
    // Background color for the AppBar override
    bgColor: {
      type: String,
      default: null,
    },
    // Text color for the message
    textColor: {
      type: String,
      default: "#000000",
    },
    // Manual on/off toggle
    isActive: {
      type: Boolean,
      default: false,
    },
    // Scheduling
    schedule: {
      type: scheduleSchema,
      default: () => ({ start: null, end: null }),
    },
    // Audit
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const AppBarTheme = mongoose.model("AppBarTheme", appBarThemeSchema);
export default AppBarTheme;

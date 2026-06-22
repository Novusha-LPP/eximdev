import mongoose from "mongoose";

const adminEquipmentChecklistItemSchema = new mongoose.Schema({
  equipmentName: {
    type: String,
    required: true,
  },
  assetId: {
    type: String,
    default: "",
  },
  location: {
    type: String,
    default: "",
  },
  condition: {
    type: String,
    enum: ["Good", "Fair", "Poor", ""],
    default: "",
  },
  cleaningDone: {
    type: String,
    enum: ["Yes", "No", ""],
    default: "",
  },
  functionalCheck: {
    type: String,
    default: "", // OK, Not OK, Cooling OK, Working, etc.
  },
  repairRequired: {
    type: String,
    enum: ["Yes", "No", ""],
    default: "",
  },
  amcVendor: {
    type: String,
    default: "",
  },
  remarks: {
    type: String,
    default: "",
  },
  image: {
    type: String,
    default: null,
  },
});

const adminEquipmentChecklistSchema = new mongoose.Schema(
  {
    checkedBy: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    items: [adminEquipmentChecklistItemSchema],
  },
  { timestamps: true }
);

const AdminEquipmentChecklist = mongoose.model(
  "AdminEquipmentChecklist",
  adminEquipmentChecklistSchema
);

export default AdminEquipmentChecklist;

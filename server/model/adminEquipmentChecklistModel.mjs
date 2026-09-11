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
    checklistCode: {
      type: String,
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    frequency: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly", "Quarterly", ""],
      default: "Daily",
    },
    checkedBy: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    hasDefects: {
      type: Boolean,
      default: false,
    },
    items: [adminEquipmentChecklistItemSchema],
  },
  { timestamps: true }
);

// Auto-flag checklists that contain defects or required repairs
adminEquipmentChecklistSchema.pre("save", function (next) {
  if (Array.isArray(this.items)) {
    this.hasDefects = this.items.some(
      (item) => item.repairRequired === "Yes" || item.condition === "Poor"
    );
  }
  next();
});

// ─── Indexes for High-Performance Queries ─────────────────────────────────────
// 1. Primary timeline & sorting: (date desc + checkedBy)
adminEquipmentChecklistSchema.index({ date: -1, checkedBy: 1 });

// 2. Branch-scoped timeline
adminEquipmentChecklistSchema.index({ branchId: 1, date: -1 });

// 3. Fast open defects retrieval (partial index covering only checklists with defects)
adminEquipmentChecklistSchema.index(
  { hasDefects: 1, date: -1 },
  {
    partialFilterExpression: { hasDefects: true },
    name: "ChecklistDefectsPartialIndex",
  }
);

// 4. Multikey index for equipment repair status lookup
adminEquipmentChecklistSchema.index({ "items.repairRequired": 1, date: -1 });

// 5. Multikey index for asset-specific service & maintenance audit history
adminEquipmentChecklistSchema.index(
  { "items.assetId": 1, date: -1 },
  { sparse: true }
);

// 6. Unique code lookup (partial index so records without code don't collide)
adminEquipmentChecklistSchema.index(
  { checklistCode: 1 },
  {
    unique: true,
    partialFilterExpression: { checklistCode: { $type: "string" } },
    name: "UniqueChecklistCode",
  }
);

const AdminEquipmentChecklist = mongoose.model(
  "AdminEquipmentChecklist",
  adminEquipmentChecklistSchema
);

export default AdminEquipmentChecklist;

import mongoose from "mongoose";

const amcVisitorLogSchema = new mongoose.Schema(
  {
    gatePassNo: {
      type: String,
      trim: true,
      uppercase: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },
    supplierCompany: { type: String, required: true, trim: true },
    technicianName: { type: String, required: true, trim: true },
    mobileNo: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, trim: true },
    amcCategory: { type: String, required: true, trim: true },
    departmentArea: { type: String, required: true, trim: true },
    checkInTime: { type: Date, default: Date.now },
    checkOutTime: { type: Date },
    durationMinutes: { type: Number, default: null },
    workStatus: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    employeeApprovalName: { type: String, trim: true },
    remarks: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Active", "Checked Out"],
      default: "Active",
    },
  },
  { timestamps: true }
);

// Auto-compute duration on checkout
amcVisitorLogSchema.pre("save", function (next) {
  if (this.checkOutTime && this.checkInTime && !this.durationMinutes) {
    this.durationMinutes = Math.max(
      0,
      Math.round((new Date(this.checkOutTime) - new Date(this.checkInTime)) / 60000)
    );
  }
  next();
});

// ─── Indexes for High-Performance Queries ─────────────────────────────────────
// 1. PARTIAL UNIQUE INDEX: Prevents duplicate active check-ins for the same technician
amcVisitorLogSchema.index(
  { mobileNo: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "Active" },
    name: "UniqueActiveTechnicianMobile",
  }
);

// 2. Active on-premises live dashboard query (tiny partial index covering only checked-in visitors)
amcVisitorLogSchema.index(
  { status: 1, checkInTime: -1 },
  {
    partialFilterExpression: { status: "Active" },
    name: "ActiveVisitorsDashboardIndex",
  }
);

// 3. Grid listing & historical pagination
amcVisitorLogSchema.index({ status: 1, createdAt: -1 });

// 4. Branch-scoped listing
amcVisitorLogSchema.index({ branchId: 1, createdAt: -1 });

// 5. Gate pass direct lookup (partial index so records without gate passes don't collide)
amcVisitorLogSchema.index(
  { gatePassNo: 1 },
  {
    unique: true,
    partialFilterExpression: { gatePassNo: { $type: "string" } },
    name: "UniqueGatePassNo",
  }
);

// 6. AMC category reporting & trends
amcVisitorLogSchema.index({ amcCategory: 1, checkInTime: -1 });

const AmcVisitorLogModel = mongoose.model("AmcVisitorLog", amcVisitorLogSchema);
export default AmcVisitorLogModel;

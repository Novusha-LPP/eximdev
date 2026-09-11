import mongoose from "mongoose";

const amcRenewalSchema = new mongoose.Schema(
  {
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
    equipmentServiceName: { type: String, required: true, trim: true },
    vendorName: { type: String, required: true, trim: true },
    underAmc: { type: String, enum: ["Yes", "No"], default: "Yes" },
    contractNo: { type: String, trim: true },
    location: { type: String, trim: true },
    yearlyServices: { type: String, trim: true },
    startMonthDate: { type: Date },
    previousDateOfService: { type: Date },
    nextDueDate: { type: Date },
    renewalDate: { type: Date },
    expireDate: { type: Date },
    contactPerson: { type: String, trim: true },
    contactNo: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Active", "Pending", "Expired"],
      default: "Active",
    },
    remarks: { type: String, trim: true },
    documentUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

// ─── Indexes for High-Performance Queries ─────────────────────────────────────
// 1. Primary grid listing & pagination: (status + sort by createdAt desc)
amcRenewalSchema.index({ status: 1, createdAt: -1 });

// 2. Branch-scoped grid listing
amcRenewalSchema.index({ branchId: 1, status: 1, createdAt: -1 });

// 3. Upcoming renewal calendar & notifications: (status + nextDueDate)
amcRenewalSchema.index({ status: 1, nextDueDate: 1 });

// 4. Contract expiry tracking & cron jobs: (status + expireDate)
amcRenewalSchema.index({ status: 1, expireDate: 1 });

// 5. Fast unique contract lookup with partial index (only indexes non-null string contract numbers)
amcRenewalSchema.index(
  { contractNo: 1 },
  {
    unique: true,
    partialFilterExpression: { contractNo: { $type: "string" } },
    name: "UniqueContractNo",
  }
);

// 6. Compound text search across equipment, vendor, and contact person
amcRenewalSchema.index(
  { equipmentServiceName: "text", vendorName: "text", contactPerson: "text" },
  {
    weights: { equipmentServiceName: 5, vendorName: 3, contactPerson: 1 },
    name: "AmcRenewalTextIndex",
  }
);

const AmcRenewalModel = mongoose.model("AmcRenewal", amcRenewalSchema);
export default AmcRenewalModel;

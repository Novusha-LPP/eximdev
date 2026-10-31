import mongoose from "mongoose";

const procurementApproverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, uppercase: true, trim: true },
    designation: { type: String, required: true, uppercase: true, trim: true },
    role: { type: String, enum: ["CHECKED_BY", "PREPARED_BY", "APPROVED_BY", "ALL"], default: "CHECKED_BY" },
  },
  { timestamps: true }
);

procurementApproverSchema.index({ name: 1, designation: 1 }, { unique: true });

const ProcurementApproverModel =
  mongoose.models.ProcurementApprover ||
  mongoose.model("ProcurementApprover", procurementApproverSchema);

export default ProcurementApproverModel;

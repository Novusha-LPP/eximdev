import mongoose from "mongoose";

const amcVisitorLogSchema = new mongoose.Schema(
  {
    supplierCompany: { type: String, required: true, trim: true },
    technicianName: { type: String, required: true, trim: true },
    mobileNo: { type: String, required: true, trim: true },
    purpose: { type: String, required: true, trim: true },
    amcCategory: { type: String, required: true, trim: true },
    departmentArea: { type: String, required: true, trim: true },
    checkInTime: { type: Date, default: Date.now },
    checkOutTime: { type: Date },
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

const AmcVisitorLogModel = mongoose.model("AmcVisitorLog", amcVisitorLogSchema);
export default AmcVisitorLogModel;

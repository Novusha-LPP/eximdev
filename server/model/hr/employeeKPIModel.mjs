import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const Schema = mongoose.Schema;

const employeeKPISchema = new Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true, // 1-12
    },
    attendance: {
      present_days: { type: Number, default: 0 },
      working_days: { type: Number, default: 0 },
      raw_score: { type: Number, default: 0 }, // (present_days / working_days) * 10
      weighted_score: { type: Number, default: 0 }, // raw_score * 0.20
    },
    quality_of_work: {
      raw_score: { type: Number, default: 0 }, // 1-10 scale
      weighted_score: { type: Number, default: 0 }, // raw_score * 0.25
    },
    productivity: {
      completed_tasks: { type: Number, default: 0 },
      assigned_targets: { type: Number, default: 0 },
      raw_score: { type: Number, default: 0 }, // (completed_tasks / assigned_targets) * 10
      weighted_score: { type: Number, default: 0 }, // raw_score * 0.30
    },
    business_loss: {
      incidents: { type: Number, default: 0 },
      deduction_per_incident: { type: Number, default: 1 },
      raw_score: { type: Number, default: 10 }, // 10 - (incidents * deduction_per_incident)
      weighted_score: { type: Number, default: 0 }, // raw_score * 0.15
    },
    open_tasks: {
      open_items: { type: Number, default: 0 },
      deduction_per_item: { type: Number, default: 1 },
      raw_score: { type: Number, default: 10 }, // 10 - (open_items * deduction_per_item)
      weighted_score: { type: Number, default: 0 }, // raw_score * 0.10
    },
    total_kpi_score: {
      type: Number,
      default: 0, // final score out of 10
    },
    rag_status: {
      type: String,
      enum: ["GREEN", "AMBER", "RED"],
      required: true,
    },
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comments: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Ensure uniqueness: One KPI record per employee + year + month
employeeKPISchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });

employeeKPISchema.plugin(auditPlugin, { documentType: "Employee_KPI" });

const EmployeeKPI = mongoose.model("EmployeeKPI", employeeKPISchema);
export default EmployeeKPI;

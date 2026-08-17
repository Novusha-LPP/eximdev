import mongoose from 'mongoose';

const employeePayrollConfigSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

  // ─── Operator Identification ─────────────────────────────────────────
  is_operator: { type: Boolean, default: false },
  category: { type: String, default: 'Management' },
  // true  = OPERATOR  (daily wage, OT eligible)
  // false = MANAGEMENT (monthly salary, no OT)

  // ─── Payroll Type ────────────────────────────────────────────────────
  payroll_type: {
    type: String,
    enum: ['MONTHLY', 'DAILY_WAGE'],
    default: 'MONTHLY'
  },

  // ─── Compensation ────────────────────────────────────────────────────
  monthly_salary: { type: Number, default: 0 },
  daily_wage: { type: Number, default: 0 },
  overtime_rate_per_hour: { type: Number, default: 0 },
  overtime_eligible: { type: Boolean, default: false },
  overtime_grace_minutes: { type: Number, default: 20 },

  // ─── Effectivity ─────────────────────────────────────────────────────
  effective_from: { type: Date, required: true },
  effective_to: { type: Date, default: null },  // null = currently active

  // ─── Grade & Band ──────────────────────────────────────────────────
  grade: { type: String, default: '' },   // e.g., "L1", "L2", "M1", "M2", "S1"
  band: { type: String, default: '' },    // e.g., "Junior", "Senior", "Manager", "Director"

  // ─── Statutory Applicability (per-employee overrides) ─────────────
  pf_applicable: { type: Boolean, default: true },
  esi_applicable: { type: Boolean, default: true },
  pt_applicable: { type: Boolean, default: true },

  // ─── Status & Audit ──────────────────────────────────────────────────
  status: { type: String, enum: ['ACTIVE', 'SUPERSEDED', 'INACTIVE'], default: 'ACTIVE' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revision_reason: { type: String }  // e.g., "Annual increment", "Promotion"
}, { timestamps: true });

// Only one ACTIVE config per employee at a time
employeePayrollConfigSchema.index(
  { employee_id: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);
employeePayrollConfigSchema.index({ employee_id: 1, effective_from: -1 });
employeePayrollConfigSchema.index({ company_id: 1, is_operator: 1, status: 1 });

export default mongoose.model('EmployeePayrollConfig', employeePayrollConfigSchema);

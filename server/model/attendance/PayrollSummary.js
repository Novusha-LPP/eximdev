import mongoose from 'mongoose';

const payrollSummarySchema = new mongoose.Schema({
  payroll_run_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', required: true, index: true },
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  payroll_config_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeePayrollConfig' },

  payroll_month: { type: String, required: true },
  payroll_year: { type: Number, required: true },

  // Config snapshot at generation time
  is_operator: { type: Boolean },
  category: { type: String },
  payroll_type: { type: String, enum: ['MONTHLY', 'DAILY_WAGE'] },

  // Attendance aggregation
  total_days_in_month: { type: Number, default: 0 },
  present_days: { type: Number, default: 0 },
  half_days: { type: Number, default: 0 },
  absent_days: { type: Number, default: 0 },
  leave_days: { type: Number, default: 0 },
  weekly_off_days: { type: Number, default: 0 },
  holiday_days: { type: Number, default: 0 },
  payable_days: { type: Number, default: 0 },

  // Hours aggregation (derived at generation time)
  total_regular_hours: { type: Number, default: 0 },
  total_overtime_hours: { type: Number, default: 0 },
  total_shift_count: { type: Number, default: 0 },

  // Financial calculation
  basic_amount: { type: Number, default: 0 },
  overtime_amount: { type: Number, default: 0 },
  gross_amount: { type: Number, default: 0 },
  deduction_amount: { type: Number, default: 0 },
  net_payable_amount: { type: Number, default: 0 },

  // Snapshots for audit trail
  daily_wage_snapshot: { type: Number },
  monthly_salary_snapshot: { type: Number },
  ot_rate_snapshot: { type: Number },

  remarks: { type: String }
}, { timestamps: true });

payrollSummarySchema.index({ payroll_run_id: 1, employee_id: 1 }, { unique: true });
payrollSummarySchema.index({ employee_id: 1, payroll_year: 1, payroll_month: 1 });
payrollSummarySchema.index({ company_id: 1, payroll_year: 1, payroll_month: 1 });

export default mongoose.model('PayrollSummary', payrollSummarySchema);

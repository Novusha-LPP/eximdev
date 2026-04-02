import mongoose from 'mongoose';

const leavePolicySchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  policy_name: { type: String, required: true },
  leave_type: { type: String, enum: ['casual', 'sick', 'earned', 'privilege', 'maternity', 'paternity', 'compensatory', 'lwp'], required: true },
  leave_code: { type: String, required: true },

  annual_quota: { type: Number, required: true, default: 24 },

  eligibility: {
    employment_types: [{ type: String }],
    min_service_months: { type: Number, default: 0 },
    gender: { type: String }
  },

  accrual: {
    accrual_type: { type: String, enum: ['monthly', 'quarterly', 'yearly', 'daily'] },
    accrual_rate: { type: Number },
    accrual_start_date: { type: String, enum: ['joining', 'calendar_year', 'financial_year'] }
  },

  carry_forward: {
    allowed: { type: Boolean, default: false },
    max_days: { type: Number },
    encashment_allowed: { type: Boolean, default: false },
    encashment_percentage: { type: Number }
  },

  rules: {
    min_days_per_application: { type: Number, default: 1 },
    max_days_per_application: { type: Number, default: 10 },
    max_consecutive_days: { type: Number },
    min_gap_between_applications: { type: Number },
    advance_notice_days: { type: Number, default: 1 },
    backdated_allowed: { type: Boolean, default: false },
    backdated_max_days: { type: Number, default: 0 },
    sandwich_rule_enabled: { type: Boolean, default: false },
    requires_document: { type: Boolean, default: false },
    document_required_after_days: { type: Number },
    clubbing_allowed_with: [{ type: String }],
    half_day_allowed: { type: Boolean, default: true },
    can_apply_on_probation: { type: Boolean, default: true }
  },

  approval_workflow: {
    levels: [{
      level: Number,
      approver_role: String,
      is_mandatory: Boolean
    }],
    auto_approve_if_balance: { type: Boolean, default: false }
  },

  deduction_rules: {
    deduct_from_salary: { type: Boolean, default: false },
    affects_attendance_percentage: { type: Boolean, default: true },
    counted_as_absence: { type: Boolean, default: false }
  },

  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

export default mongoose.model('LeavePolicy', leavePolicySchema);
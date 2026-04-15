import mongoose from 'mongoose';

const leaveApplicationSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  application_number: { type: String, unique: true },

  leave_policy_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LeavePolicy', required: true },
  leave_type: { type: String, required: true, index: true },

  from_date: { type: Date, required: true, index: true },
  to_date: { type: Date, required: true, index: true },
  total_days: { type: Number, required: true },
  is_half_day: { type: Boolean, default: false },
  is_start_half_day: { type: Boolean, default: false },
  is_end_half_day: { type: Boolean, default: false },
  start_half_session: { type: String, enum: ['First Half', 'Second Half', null], default: null },
  end_half_session: { type: String, enum: ['First Half', 'Second Half', null], default: null },
  half_day_session: { type: String, enum: ['first_half', 'second_half', null], default: null },

  reason: { type: String, required: true },
  contact_during_leave: { type: String },
  emergency_contact: { type: String },

  attachment_urls: [{ type: String }],

  applied_on: { type: Date, default: Date.now },

  approval_status: {
    type: String,
    enum: [
      'approved', 
      'rejected', 
      'cancelled', 
      'withdrawn', 
      'pending',
      'pending_hod',
      'pending_shalini',
      'pending_final',
      'hod_approved_pending_admin',
      'in_review'
    ],
    default: 'pending'
  },

  approval_stage: {
    type: String,
    enum: ['stage_1_hod', 'stage_2_shalini', 'stage_3_final', null],
    default: 'stage_1_hod'
  },

  approval_chain: [{
    level: Number,
    stage: String,
    approver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approver_username: String,
    approver_role: String,
    action: { type: String, enum: ['pending', 'approved', 'rejected'] },
    action_date: Date,
    comments: String
  }],
  current_approver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Review metadata (backward compatible with legacy comments)
  hod_reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hod_reviewed_at: { type: Date },
  hod_review_comment: { type: String },
  final_reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  final_reviewed_at: { type: Date },
  final_review_comment: { type: String },
  rejected_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejected_at: { type: Date },
  rejection_reason: { type: String },

  approval_history: [{
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actor_name: { type: String },
    actor_role: { type: String },
    action: { type: String, enum: ['approved', 'rejected', 'forwarded'] },
    comment: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],

  sandwich_dates: [{ type: Date }],
  sandwich_days_count: { type: Number },
  breakdown: {
    total_range: { type: Number },     // N+1 days
    working_days: { type: Number },    // Actual working days absent
    holiday_days: { type: Number },    // Holidays found in range
    weekly_off_days: { type: Number }, // Week-offs found in range
    sandwich_days: { type: Number }    // Days deducted due to sandwich
  },

  is_lop: { type: Boolean, default: false }, // Loss of Pay

  cancellation_reason: { type: String },
  cancelled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelled_at: { type: Date },

  // Payroll & Audit
  payroll_status: { type: String, enum: ['pending', 'processed', 'skipped'], default: 'pending' },
  balance_snapshot: {
    available: Number,
    used: Number,
    pending: Number
  }

}, { timestamps: true });

export default mongoose.model('LeaveApplication', leaveApplicationSchema);
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
  half_day_session: { type: String, enum: ['first_half', 'second_half'] },

  reason: { type: String, required: true },
  contact_during_leave: { type: String },
  emergency_contact: { type: String },

  attachment_urls: [{ type: String }],

  applied_on: { type: Date, default: Date.now },

  approval_status: {
    type: String,
    enum: ['pending_hod', 'hod_approved_pending_admin', 'approved', 'rejected', 'cancelled', 'withdrawn', 'pending'],
    default: 'pending_hod'
  },

  approval_chain: [{
    level: Number,
    approver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approver_role: String,
    action: { type: String, enum: ['pending', 'approved', 'rejected'] },
    action_date: Date,
    comments: String
  }],
  current_approver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  sandwich_dates: [{ type: Date }],
  sandwich_days_count: { type: Number },

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
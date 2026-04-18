import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  shift_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },

  attendance_date: { type: Date, required: true }, // Date object for YYYY-MM-DD
  year_month: { type: String, required: true }, // "2025-02"

  first_in: { type: Date },
  last_out: { type: Date },
  total_punches: { type: Number, default: 0 },

  total_work_hours: { type: Number, default: 0 },
  total_break_hours: { type: Number, default: 0 },
  net_work_hours: { type: Number, default: 0 },

  overtime_hours: { type: Number, default: 0 },
  overtime_approved: { type: Boolean, default: false },

  status: {
    type: String,
    enum: ['present', 'absent', 'half_day', 'incomplete', 'leave', 'holiday', 'weekly_off', 'on_duty'],
    default: 'absent'
  },

  is_late: { type: Boolean, default: false },
  late_by_minutes: { type: Number, default: 0 },
  late_reason: String,

  is_early_exit: { type: Boolean, default: false },
  early_exit_minutes: { type: Number, default: 0 },
  early_exit_reason: String,

  // Work sessions tracking
  work_sessions: [{
    session_number: Number,
    punch_in_time: Date,
    punch_out_time: Date,
    duration_hours: Number,
    is_incomplete: Boolean  // true if OUT is missing
  }],
  total_work_sessions: { type: Number, default: 0 },
  has_incomplete_session: { type: Boolean, default: false },
  missed_punch: { type: Boolean, default: false },
  missed_punch_reason: {
    type: String,
    enum: ['timeout_12h', 'next_day_auto_close', 'scheduler_auto_close', null],
    default: null
  },
  missed_punch_marked_at: { type: Date, default: null },
  missed_punch_source: {
    type: String,
    enum: ['system', 'cron', 'next_day_punch_in', 'late_punch_out', null],
    default: null
  },

  is_holiday: { type: Boolean, default: false },
  holiday_type: { type: String }, // 'national', 'company', 'optional'

  is_weekly_off: { type: Boolean, default: false },

  is_on_leave: { type: Boolean, default: false },
  leave_application_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveApplication' },

  is_locked: { type: Boolean, default: false },
  locked_at: { type: Date },
  locked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  is_regularized: { type: Boolean, default: false },
  regularization_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RegularizationRequest' },
  regularization_approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  regularization_approved_at: { type: Date },

  remarks: String,

  processed_at: { type: Date },
  processed_by: { type: String, enum: ['system', 'admin', 'cron'], default: 'system' },

  is_half_day: { type: Boolean, default: false },
  half_day_session: { type: String, enum: ['first_half', 'second_half', null], default: null }

}, { timestamps: true });

// Compound indices for fast enterprise-scale queries
recordSchema.index({ employee_id: 1, attendance_date: 1 }, { unique: true });
recordSchema.index({ company_id: 1, attendance_date: 1 });
recordSchema.index({ company_id: 1, year_month: 1 });
recordSchema.index({ department_id: 1, attendance_date: 1 });
recordSchema.index({ team_id: 1, attendance_date: 1 });

export default mongoose.model('AttendanceRecord', recordSchema);
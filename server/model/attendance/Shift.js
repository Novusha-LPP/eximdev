import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  shift_name: { type: String, required: true },
  shift_code: { type: String, required: true },

  shift_type: { type: String, enum: ['fixed', 'rotational', 'flexible'], default: 'fixed' },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },

  is_cross_day: { type: Boolean, default: false },

  full_day_hours: { type: Number, default: 8 },
  half_day_hours: { type: Number, default: 4 },
  minimum_hours: { type: Number, default: 3 },

  late_allowed_minutes: { type: Number, default: 0 },
  early_leave_allowed_minutes: { type: Number, default: 0 },

  // Flexible window for reporting/insights (no enforcement)
  flexible_window_start: { type: String }, // e.g., "08:00"
  flexible_window_end: { type: String },   // e.g., "10:00"

  overtime_threshold_minutes: { type: Number, default: 30 },
  overtime_calculation_type: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },

  break_time_minutes: { type: Number, default: 60 },
  break_included_in_work_hours: { type: Boolean, default: false },

  max_session_hours: { type: Number, default: 18 }, // Sanity check for single session

  // Weekly offs are now managed by WeekOffPolicy – removed from Shift.

  night_shift: { type: Boolean, default: false },
  night_shift_allowance: { type: Number, default: 0 },

  // --- Applicability Scope ---
  applicability: {
    teams: {
      all:  { type: Boolean, default: true },
      list: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }]
    }
  },

  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  is_active: { type: Boolean, default: true }, // Keeping for backward compatibility if needed, else can rely on status

  // Audit
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Shift', shiftSchema);
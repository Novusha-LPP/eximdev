const mongoose = require('mongoose');

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

  grace_in_minutes: { type: Number, default: 15 },
  grace_out_minutes: { type: Number, default: 15 },

  overtime_threshold_minutes: { type: Number, default: 30 },
  overtime_calculation_type: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },

  break_time_minutes: { type: Number, default: 60 },
  break_included_in_work_hours: { type: Boolean, default: false },

  weekly_off_days: [{ type: Number }], // 0=Sunday, 6=Saturday
  alternate_saturday_pattern: { type: String }, // e.g., "1,3" for 1st and 3rd Sat off, or "2,4"

  auto_checkout_enabled: { type: Boolean, default: false },
  auto_checkout_time: { type: String },

  night_shift: { type: Boolean, default: false },
  night_shift_allowance: { type: Number, default: 0 },

  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  is_active: { type: Boolean, default: true } // Keeping for backward compatibility if needed, else can rely on status
}, { timestamps: true });

module.exports = mongoose.model('Shift', shiftSchema);
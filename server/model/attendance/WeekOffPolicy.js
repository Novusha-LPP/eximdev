import mongoose from 'mongoose';

/**
 * WeekOffPolicy – Centralised week-off rules (replaces Shift.weekly_off_days)
 */

const weekOfRulesSchema = new mongoose.Schema({
  week_number: { type: Number, default: 0 }, // 0=All, 1=1st, 2=2nd, 3=3rd, 4=4th, 5=5th
  off_type: {
      type: String,
      enum: ['full_day', 'half_day', 'none'],
      default: 'none'
  }
}, { _id: false });

const dayRuleSchema = new mongoose.Schema({
  day_index: { type: Number, required: true }, // 0=Sun ... 6=Sat
  rules: { type: [weekOfRulesSchema], default: [] }
}, { _id: false });

const weekOffPolicySchema = new mongoose.Schema({
  policy_name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  company_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

  // --- Policy Type ---
  policy_type: {
    type: String,
    enum: [
      'fixed',
      'monthly_count_paid',
      'monthly_count_present_holiday',
      'monthly_count_present_holiday_no_hourly',
      'monthly_count_present_no_hourly',
      'monthly_count_physical_present_holiday'
    ],
    default: 'fixed'
  },

  // --- Applicability Scope ---
  applicability: {
    teams: {
        all: { type: Boolean, default: true },
        list: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }]
    }
  },

  // --- Day-wise rules (replaces fixed_off_days and saturday_rules) ---
  day_rules: { type: [dayRuleSchema], default: [] },

  status: { type: String, enum: ['active', 'inactive'], default: 'active' },

  // Audit
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

// Prevent duplicate policy name + company
weekOffPolicySchema.index({ company_id: 1, policy_name: 1 }, { unique: true });

export default mongoose.model('WeekOffPolicy', weekOffPolicySchema);

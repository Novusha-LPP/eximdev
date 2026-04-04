import mongoose from 'mongoose';

/**
 * HolidayPolicy – A named collection of holidays tied to a company + year.
 *
 * Replaces individual Holiday documents.
 * Only "allowed admins" can create/edit/delete policies.
 * All users can read holidays (resolved by PolicyResolver).
 *
 * is_optional:
 *   false  → Mandatory – automatically marked as 'holiday' in attendance
 *   true   → Optional  – employee may choose to apply leave on that day
 */

const holidayEntrySchema = new mongoose.Schema({
  holiday_name: { type: String, required: true, trim: true },
  holiday_date: { type: Date, required: true },
  is_optional:  { type: Boolean, default: false },
  holiday_type: {
    type: String,
    enum: ['national', 'company', 'optional', 'restricted'],
    default: 'national'
  }
}, { _id: false });

const holidayPolicySchema = new mongoose.Schema({
  policy_name: { type: String, required: true, trim: true },
  company_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  year:        { type: Number, required: true },

  // --- Applicability Scope ---
  applicability: {
    branches: {
      all: { type: Boolean, default: true },
      list: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }]
    },
    departments: {
      all: { type: Boolean, default: true },
      list: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }]
    },
    designations: {
      all: { type: Boolean, default: true },
      list: [{ type: String }]
    },
    teams: {
      all:  { type: Boolean, default: true },
      list: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }]
    }
  },

  holidays: { type: [holidayEntrySchema], default: [] },

  status: { type: String, enum: ['active', 'inactive'], default: 'active' },

  // Audit
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true });

// Prevent duplicate policy name + year + company
holidayPolicySchema.index({ company_id: 1, year: 1, policy_name: 1 }, { unique: true });

export default mongoose.model('HolidayPolicy', holidayPolicySchema);

import mongoose from 'mongoose';

const activeSessionSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  shift_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },

  punch_in_time: { type: Date, required: true },
  punch_in_entry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendancePunch' },

  session_date: { type: Date, required: true, index: true }, // Date object for YYYY-MM-DD
  session_status: {
    type: String,
    enum: ['active', 'closed', 'abandoned'],
    default: 'active',
    index: true
  },

  expected_out_time: { type: Date }, // shift reference time for reporting
  punch_out_entry_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendancePunch' },
  punch_out_time: { type: Date },
  abandoned_at: { type: Date, default: null },
  abandoned_reason: { type: String, default: null },
  auto_marked_missed_punch: { type: Boolean, default: false },

}, { timestamps: true });

// Compound index for finding active sessions
activeSessionSchema.index({ employee_id: 1, session_date: 1, session_status: 1 });
activeSessionSchema.index({ company_id: 1, session_date: 1 });

export default mongoose.model('ActiveSession', activeSessionSchema);

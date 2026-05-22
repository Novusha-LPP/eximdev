import mongoose from 'mongoose';

export const REGULARIZATION_TYPES = [
  'missing_punch',
  'missing_out',
  'late_in',
  'early_out',
  'manual_override',
  'absent',
  'half_day'
];

const regularizationSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  
  request_number: { type: String, unique: true },
  attendance_date: { type: String, required: true }, 
  regularization_type: { type: String, enum: REGULARIZATION_TYPES, required: true },
  
  existing_attendance_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord' },
  
  // Original requested times (legacy support)
  requested_in_time: { type: Date },
  requested_out_time: { type: Date },
  
  // Corrected times for submission
  corrected_punch_in_time: { type: Date },
  corrected_punch_out_time: { type: Date },
  corrected_total_hours: { type: Number },
  
  reason: { type: String, required: true },
  supporting_documents: [{ type: String }],
  
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  
  // Approval fields
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  approved_comments: { type: String },
  
  rejected_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejected_at: { type: Date },
  rejection_reason: { type: String },

  // Resolution metadata (for manual attendance corrections)
  is_resolved: { type: Boolean, default: false },
  resolved_at: { type: Date },
  resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolution_source: { type: String, enum: ['request_approval', 'admin_manual_correction', 'hod_manual_correction', 'system'], default: 'request_approval' }
}, { timestamps: true });

export default mongoose.model('RegularizationRequest', regularizationSchema);

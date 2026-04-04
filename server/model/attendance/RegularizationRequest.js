import mongoose from 'mongoose';

const regularizationSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  
  request_number: { type: String, unique: true },
  attendance_date: { type: String, required: true }, 
  regularization_type: { type: String, enum: ['missing_punch', 'missing_out', 'manual_override'], required: true },
  
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
  rejection_reason: { type: String }
}, { timestamps: true });

export default mongoose.model('RegularizationRequest', regularizationSchema);
const mongoose = require('mongoose');

const regularizationSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  
  request_number: { type: String, unique: true },
  attendance_date: { type: String, required: true }, 
  regularization_type: { type: String, enum: ['missing_punch', 'late_in', 'early_out'], required: true },
  
  existing_attendance_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord' }, // ADDED THIS
  
  requested_in_time: { type: Date },
  requested_out_time: { type: Date },
  reason: { type: String, required: true },
  supporting_documents: [{ type: String }], // ADDED THIS
  
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  
  // Approval fields
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date },
  approved_comments: { type: String },
  
  rejected_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejected_at: { type: Date },
  rejection_reason: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('RegularizationRequest', regularizationSchema);
const mongoose = require('mongoose');

const overtimeSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  
  overtime_date: { type: String, required: true },
  overtime_hours: { type: Number, required: true },
  overtime_type: { type: String, enum: ['weekday', 'weekend', 'holiday'] },
  
  approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('OvertimeRecord', overtimeSchema);
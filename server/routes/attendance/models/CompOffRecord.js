const mongoose = require('mongoose');

const compOffSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  
  earned_date: { type: Date, required: true },
  valid_until: { type: Date, required: true },
  status: { type: String, enum: ['available', 'consumed', 'expired'], default: 'available' },
  
  overtime_record_id: { type: mongoose.Schema.Types.ObjectId, ref: 'OvertimeRecord' }
}, { timestamps: true });

module.exports = mongoose.model('CompOffRecord', compOffSchema);
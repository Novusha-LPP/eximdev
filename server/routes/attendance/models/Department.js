const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  department_name: { type: String, required: true, trim: true },
  department_code: { type: String, required: true, uppercase: true, trim: true },
  
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  hod_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  
  parent_department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null }, 

  cost_center: { type: String, trim: true },
  budget_code: { type: String, trim: true },

  full_day_hours: { type: Number, default: 8 },
  half_day_hours: { type: Number, default: 4 },

  weekly_off_days: [{ type: Number }], // 0=Sunday, 6=Saturday
  alternate_saturday_pattern: { type: String }, // e.g., "1,3" for 1st and 3rd Sat off, or "2,4"

  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  employee_count: { type: Number, default: 0, min: 0 },

}, { timestamps: true });

departmentSchema.index({ company_id: 1, department_name: 1 }, { unique: true });
departmentSchema.index({ company_id: 1, department_code: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
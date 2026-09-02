import mongoose from 'mongoose';

const componentSchema = new mongoose.Schema({
  payhead: { type: String, required: true },     // e.g., "Basic", "HRA", "DA"
  formula: { type: String },                      // e.g., "gross * 0.5" (descriptive only)
  monthly_amount: { type: Number, default: 0 },
  yearly_amount: { type: Number, default: 0 }
}, { _id: false });

const salaryStructureSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  effective_from: { type: Date, required: true },
  effective_to: { type: Date },   // null = current
  salary_type: { type: String, enum: ['GROSS', 'CTC', 'NET'], default: 'GROSS' },
  gross_salary: { type: Number, required: true },
  components: { type: [componentSchema], default: [] },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUPERSEDED'], default: 'ACTIVE' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

salaryStructureSchema.index({ employee_id: 1, status: 1 });
salaryStructureSchema.index({ employee_id: 1, effective_from: -1 });

export default mongoose.model('SalaryStructure', salaryStructureSchema);

import mongoose from 'mongoose';

const payrollRunSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  payroll_month: { type: String, required: true },   // "06"
  payroll_year: { type: Number, required: true },
  payroll_status: {
    type: String,
    enum: ['DRAFT', 'PROCESSING', 'LOCKED', 'COMPLETED'],
    default: 'DRAFT'
  },
  generated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  generated_at: { type: Date },
  locked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  locked_at: { type: Date },
  completed_at: { type: Date },
  remarks: { type: String }
}, { timestamps: true });

payrollRunSchema.index({ company_id: 1, payroll_year: 1, payroll_month: 1 }, { unique: true });

export default mongoose.model('PayrollRun', payrollRunSchema);

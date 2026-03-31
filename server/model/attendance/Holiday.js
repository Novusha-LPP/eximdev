import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  holiday_date: { type: Date, required: true, index: true },
  holiday_name: { type: String, required: true },
  holiday_type: { type: String, enum: ['national', 'company', 'optional'], default: 'national' },
  is_compulsory: { type: Boolean, default: true },
  year: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model('Holiday', holidaySchema);
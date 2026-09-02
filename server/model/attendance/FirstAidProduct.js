import mongoose from 'mongoose';

const firstAidProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  generic_name: { type: String, default: '' },
  purpose: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Prevent duplicate product names within the same company
firstAidProductSchema.index({ name: 1, company_id: 1 }, { unique: true });

export default mongoose.model('FirstAidProduct', firstAidProductSchema);

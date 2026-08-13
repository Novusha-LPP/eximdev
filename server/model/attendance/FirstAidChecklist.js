import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FirstAidProduct', required: true },
  product_name: { type: String, required: true },
  generic_name: { type: String, default: '' },
  purpose: { type: String, default: '' },
  expiry_date: { type: String, default: '' },
  week1_qty: { type: String, default: '' },
  week2_qty: { type: String, default: '' },
  week3_qty: { type: String, default: '' },
  week4_qty: { type: String, default: '' },
  week5_qty: { type: String, default: '' },
  remarks: { type: String, default: '' }
});

const signOffSchema = new mongoose.Schema({
  week_no: { type: Number, required: true },
  date: { type: Date, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user_name: { type: String, required: true }
});

const firstAidChecklistSchema = new mongoose.Schema({
  month: { type: String, required: true }, // e.g., '2026-08'
  area: { type: String, required: true, trim: true }, // e.g., 'Security Cabin'
  responsibility: { type: String, required: true, trim: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  items: [checklistItemSchema],
  checked_by_weeks: [signOffSchema],
  reviewed_by_weeks: [signOffSchema],
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Prevent multiple checklists for the same month and area in the same company
firstAidChecklistSchema.index({ month: 1, area: 1, company_id: 1 }, { unique: true });

export default mongoose.model('FirstAidChecklist', firstAidChecklistSchema);

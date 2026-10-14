import mongoose from 'mongoose';

const tacticLineFitSchema = new mongoose.Schema({
  tactic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tactic',
    required: true,
    index: true
  },
  tactic_code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  business_line: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  is_starred: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

tacticLineFitSchema.index({ tactic_id: 1, business_line: 1 }, { unique: true });

export default mongoose.model('TacticLineFit', tacticLineFitSchema, 'crm_tactic_line_fits');

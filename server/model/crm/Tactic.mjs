import mongoose from 'mongoose';

const tacticSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true, // 'T01' ... 'T30'
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true // e.g. 'Problem-Solution Chain'
  },
  stage: {
    type: String,
    required: true,
    enum: ['Foundations', 'Attraction', 'Upsell', 'Downsell', 'Continuity', 'Optimisation'],
    index: true
  },
  sort_order: {
    type: Number,
    required: true,
    default: 1
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  }
}, { timestamps: true });

export default mongoose.model('Tactic', tacticSchema, 'crm_tactics');

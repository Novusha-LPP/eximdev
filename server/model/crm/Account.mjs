import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  industry: { type: String },
  size: { 
    type: String, 
    enum: ['startup', 'small', 'medium', 'large', '1-10', '11-50', '51-200', '200+'] 
  },
  website: { type: String },
  annualRevenue: { type: Number },
  parentAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  healthScore: { type: Number, default: 0 },
  address: { type: String }
}, { timestamps: true });

export default mongoose.model('Account', accountSchema);

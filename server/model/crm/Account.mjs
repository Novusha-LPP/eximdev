import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  industry: { type: String },
  size: { 
    type: String, 
    enum: ['1-10', '11-50', '51-200', '200+'] 
  },
  website: { type: String },
  annualRevenue: { type: Number },
  parentAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  healthScore: { type: Number, default: 0 },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String }
  }
}, { timestamps: true });

export default mongoose.model('Account', accountSchema);

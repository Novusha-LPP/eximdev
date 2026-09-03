import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true },
  plan: { 
    type: String, 
    enum: ['free', 'starter', 'pro', 'enterprise'], 
    default: 'free' 
  },
  settings: {
    pipelineConfig: { type: Object },
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Organization', organizationSchema);

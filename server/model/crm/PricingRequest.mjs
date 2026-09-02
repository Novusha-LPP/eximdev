import mongoose from 'mongoose';

const pricingRequestSchema = new mongoose.Schema({
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  relatedTo: {
    model: { type: String, enum: ['Lead', 'Opportunity', 'Account'], required: true },
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String }
  },
  subject: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'approved', 'rejected'],
    default: 'pending'
  },
  targetPrice: { type: Number },
  approvedPrice: { type: Number },
  crateSize: { type: String },
  qty: { type: Number },
  additionalRequirement: { type: String },
  remarks: [{
    text: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  history: [{
    action: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model('PricingRequest', pricingRequestSchema);

import mongoose from 'mongoose';

const allowedServices = [
  'custom clearance', 
  'freight forwarding', 
  'dgft', 
  'e-lock', 
  'client', 
  'transportation', 
  'paramount', 
  'rabs', 
  'auto rack'
];

const leadSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  company: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  email: { type: String },
  phone: { type: String },
  status: { 
    type: String, 
    enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted'], 
    default: 'new' 
  },
  interestedServices: [{ 
    type: String, 
    enum: allowedServices 
  }],
  source: { 
    type: String, 
    enum: ['web', 'referral', 'email', 'social', 'event'],
    default: 'web'
  },
  score: { type: Number, default: 0 },
  convertedAt: { type: Date },
  convertedTo: {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' }
  }
}, { timestamps: true });

export default mongoose.model('Lead', leadSchema);

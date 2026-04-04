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

const opportunitySchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  primaryContactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  value: { type: Number, default: 0 },
  stage: { 
    type: String, 
    enum: ['lead', 'qualified', 'opportunity', 'proposal', 'negotiation', 'won', 'lost'],
    default: 'opportunity'
  },
  forecastCategory: {
    type: String,
    enum: ['pipeline', 'best_case', 'commit', 'closed'],
    default: 'pipeline'
  },
  services: [{ 
    type: String, 
    enum: allowedServices 
  }],
  expectedCloseDate: { type: Date },
  probability: { type: Number, min: 0, max: 100, default: 0 },
  closeReason: { type: String },
  stageHistory: [{
    stage: { type: String },
    enteredAt: { type: Date, default: Date.now },
    exitedAt: { type: Date }
  }],
  convertedFromLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }
}, { timestamps: true });

export default mongoose.model('Opportunity', opportunitySchema);

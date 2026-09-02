import mongoose from 'mongoose';

const allowedServices = [
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
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  company: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  email: { type: String },
  phone: { type: String },
  status: { 
    type: String, 
    enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost', 'rejected', 'duplicate', 'cancelled'], 
    default: 'new' 
  },
  interestedServices: [{ 
    type: String, 
    enum: allowedServices 
  }],
  source: { 
    type: String, 
    default: 'Web / Own Generated Lead'
  },
  score: { type: Number, default: 0 },
  grade: { type: String, enum: ['A', 'B', 'C', 'D'], default: 'D' },
  crateSize: { type: String },
  shipper: { type: String },
  stuffing: { type: String },
  shippingLine: { type: String },
  shipmentType: { type: String },
  pol: { type: String },
  pod: { type: String },
  containerType: { type: String },
  containerWeight: { type: String },
  containerVolume: { type: String },
  paymentTerm: { type: String },
  detentionFreeDays: { type: String },
  transitTime: { type: String },
  currentFreightIndications: { type: String },
  referralSourceName: { type: String },
  businessVertical: {
    type: String,
    enum: ['Novusha', 'Paramount', 'Transportation', 'Freight Forwarding', 'Export', 'Import'],
    default: 'Paramount'
  },
  referredFromTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesTeam' },
  referredToTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesTeam' },
  referredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isReferral: { type: Boolean, default: false },
  hasPlannedVisit: { type: Boolean, default: false },
  lastActivityAt: { type: Date, default: Date.now },
  monthlyVolume: { type: String },
  monthlyRevenue: { type: String },
  period: { type: String, default: () => new Date().toISOString().substring(0, 7) },
  convertedAt: { type: Date },
  // Cross-reference to Export Freight Forwarding enquiry_no
  freightEnquiryRef: { type: String, sparse: true, index: true },
  convertedTo: {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' }
  }
}, { timestamps: true });

export default mongoose.model('Lead', leadSchema);

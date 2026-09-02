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

const opportunitySchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  primaryContactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  value: { type: Number, default: 0 },
  stage: {
    type: String,
    enum: ['lead', 'qualified', 'opportunity', 'sales_visit', 'proposal', 'negotiation', 'won', 'lost'],
    default: 'opportunity'
  },
  forecastCategory: {
    type: String,
    enum: ['pipeline', 'best_case', 'commit', 'closed'],
    default: 'pipeline'
  },
  services: [{
    type: String
  }],
  expectedCloseDate: { type: Date },
  probability: { type: Number, min: 0, max: 100, default: 0 },
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
    enum: ['Paramount', 'Transportation', 'Freight Forwarding', 'Export', 'Import'],
    default: 'Paramount'
  },
  monthlyVolume: { type: String },
  monthlyRevenue: { type: String },
  source: { type: String },
  carry_forward: { type: Boolean, default: false },
  origin_month: { type: String },
  period: { type: String, default: () => new Date().toISOString().substring(0, 7) },
  closeReason: { type: String },
  closeNotes: { type: String },
  stageHistory: [{
    stage: { type: String },
    enteredAt: { type: Date, default: Date.now },
    exitedAt: { type: Date }
  }],
  remarks: [{
    text: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    createdAt: { type: Date, default: Date.now }
  }],
  convertedFromLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  plannedVisits: [{
    visitDate: { type: Date },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    isCancelled: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
  }],
  // Cross-reference to Export Freight Forwarding enquiry_no
  freightEnquiryRef: { type: String, sparse: true, index: true },
  // Freight Forwarding operational data synced from Export project
  freightData: {
    pipelineStage: { type: String },
    enquiryNo: { type: String },
    successNo: { type: String },
    sourceJobNo: { type: String },
    portOfLoading: { type: String },
    portOfDestination: { type: String },
    consignmentType: { type: String },
    containerSize: { type: String },
    grossWeight: { type: String },
    netWeight: { type: String },
    sailingDate: { type: String },
    etaDate: { type: String },
    arrivalDate: { type: String },
    finalDeliveryDate: { type: String },
    draftBlApproved: { type: Boolean },
    billingCompleted: { type: Boolean },
    shippingLine: { type: String },
    vesselName: { type: String },
    bookingNo: { type: String },
    blNo: { type: String },
    lastSyncedAt: { type: Date }
  }
}, { timestamps: true });

export default mongoose.model('Opportunity', opportunitySchema);

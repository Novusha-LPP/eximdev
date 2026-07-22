import mongoose from 'mongoose';

const quoteSchema = new mongoose.Schema({
  quoteNumber: { type: String, unique: true, required: true },
  
  // Reference
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Custom Invoice/Estimate Fields
  placeOfSupply: { type: String, default: 'Gujarat (24)' },
  billToAddress: { type: String },
  shipToAddress: { type: String },

  // Quote Details
  title: { type: String, required: true },
  description: { type: String },
  
  // Line items
  lineItems: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    productId: String, // Could reference product catalog
    productName: String,
    hsnSac: { type: String, default: '392310' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 }, // percentage
    tax: { type: Number, default: 0, min: 0 }, // percentage
    lineTotal: { type: Number, default: 0 },
    description: String
  }],
  
  // Pricing
  subtotal: { type: Number, default: 0, min: 0 },
  totalDiscount: { type: Number, default: 0, min: 0 },
  totalTax: { type: Number, default: 0, min: 0 },
  total: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'USD' },
  
  // Terms & Conditions
  terms: {
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    paymentTerms: { type: String, default: 'Net 30' }, // Net 15, Net 30, Net 60
    deliveryTerms: String,
    notes: String
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'],
    default: 'draft'
  },
  
  // Tracking
  tracking: {
    sentAt: Date,
    sentBy: mongoose.Schema.Types.ObjectId,
    viewedAt: Date,
    viewedCount: { type: Number, default: 0 },
    lastViewedAt: Date,
    
    // Rejection
    rejectedAt: Date,
    rejectedReason: String
  },
  
  // Email activity audit log
  emailHistory: [{
    sentAt: { type: Date, default: Date.now },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentByUsername: { type: String },
    recipientEmail: { type: String },
    subject: { type: String },
    mailClient: { type: String, enum: ['gmail', 'outlook', 'default', 'ses'], default: 'default' },
    deliveryStatus: { type: String, enum: ['drafted', 'sent', 'failed'], default: 'drafted' },
  }],

  // Version control
  version: { type: Number, default: 1 },
  previousVersions: [{
    version: Number,
    total: Number,
    createdAt: Date
  }],
  
}, { timestamps: true });

// Indexes
quoteSchema.index({ quoteNumber: 1 });
quoteSchema.index({ opportunityId: 1 });
quoteSchema.index({ accountId: 1 });
quoteSchema.index({ status: 1 });
quoteSchema.index({ createdAt: -1 });

export default mongoose.model('Quote', quoteSchema);

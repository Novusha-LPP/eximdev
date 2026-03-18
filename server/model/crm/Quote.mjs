import mongoose from 'mongoose';

const quoteSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  quoteNumber: { type: String, unique: true, required: true },
  
  // Reference
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Quote Details
  title: { type: String, required: true },
  description: { type: String },
  
  // Line items
  lineItems: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    productId: String, // Could reference product catalog
    productName: String,
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
    
    // Email tracking
    emailOpens: { type: Number, default: 0 },
    emailClicks: { type: Number, default: 0 },
    lastViewedAt: Date,
    
    // Signature
    signedAt: Date,
    signedBy: String, // Name of person who signed
    signatureUrl: String,
    
    // Rejection
    rejectedAt: Date,
    rejectedReason: String
  },
  
  // Version control
  version: { type: Number, default: 1 },
  previousVersions: [{
    version: Number,
    total: Number,
    createdAt: Date
  }],
  
  // Template used
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuoteTemplate' },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
quoteSchema.index({ tenantId: 1, quoteNumber: 1 });
quoteSchema.index({ opportunityId: 1 });
quoteSchema.index({ accountId: 1 });
quoteSchema.index({ status: 1 });
quoteSchema.index({ createdAt: -1 });

export default mongoose.model('Quote', quoteSchema);

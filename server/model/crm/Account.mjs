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
  businessVertical: {
    type: String,
    enum: ['Novusha', 'Paramount', 'Transportation', 'Freight Forwarding', 'Export', 'Import'],
    default: 'Paramount'
  },
  address: { type: String },
  billingAddress: {
    attention: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true },
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    phone: { type: String, trim: true },
    fax: { type: String, trim: true }
  },
  shippingAddress: {
    attention: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true },
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    phone: { type: String, trim: true },
    fax: { type: String, trim: true }
  },
  gstDetails: {
    gstTreatment: { type: String, default: 'Unregistered Business', trim: true },
    gstin: { type: String, trim: true, uppercase: true },
    placeOfSupply: { type: String, trim: true },
    pan: { type: String, trim: true, uppercase: true },
    taxPreference: { type: String, default: 'Taxable' },
    currency: { type: String, default: 'INR', trim: true },
    paymentTerms: { type: String, default: 'Due on Receipt', trim: true }
  },
  period: { type: String, default: () => new Date().toISOString().substring(0, 7) }
}, { timestamps: true });

export default mongoose.model('Account', accountSchema);

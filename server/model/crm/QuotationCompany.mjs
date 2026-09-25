import mongoose from 'mongoose';

const quotationCompanySchema = new mongoose.Schema({
  name: { type: String, required: true },
  tagline: { type: String, default: '' },
  logoUrl: { type: String, default: '' }, // URL or base64
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    country: { type: String, default: 'India' }
  },
  gstin: { type: String, default: '' },
  pan: { type: String, default: '' },
  cin: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  website: { type: String, default: '' },
  bankDetails: {
    bankName: { type: String, default: '' },
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    swiftCode: { type: String, default: '' },
    branch: { type: String, default: '' }
  },
  authorizedSignatory: {
    name: { type: String, default: '' },
    designation: { type: String, default: '' },
    signatureUrl: { type: String, default: '' }
  },
  isDefault: { type: Boolean, default: false },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('QuotationCompany', quotationCompanySchema);

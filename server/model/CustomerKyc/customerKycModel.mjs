import mongoose from 'mongoose';

const { Schema } = mongoose;

// Bank schema for embedded banks array
const bankSchema = new Schema({
  bankers_name: {
    type: String,
    required: false,
    trim: true
  },
  branch_address: {
    type: String,
    required: false,
    trim: true
  },
  account_no: {
    type: String,
    required: false,
    trim: true
  },
  ifsc: {
    type: String,
    required: false,
    trim: true
  },
  adCode: {
    type: String,
    required: false,
    trim: true
  },
  adCode_file: [{
    type: String
  }]
}, { _id: false });

// Factory address schema
const factoryAddressSchema = new Schema({
  factory_address_line_1: {
    type: String,
    required: false,
    trim: true
  },
  factory_address_line_2: {
    type: String,
    required: false,
    trim: true
  },
  factory_address_city: {
    type: String,
    required: false,
    trim: true
  },
  factory_address_state: {
    type: String,
    required: false,
    trim: true
  },
  factory_address_pin_code: {
    type: String,
    required: false,
    trim: true
  },
  gst: {
    type: String,
    required: false,
    trim: true
  },
  gst_reg: [{
    type: String
  }]
}, { _id: false });

// Main Customer KYC Schema
const customerKycSchema = new Schema({
  // Basic Information
  category: {
    type: String,
    required: true,
    enum: ['Individual/ Proprietary Firm', 'Partnership Firm', 'Company', 'Trust Foundations'],
    trim: true
  },
  name_of_individual: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Manufacturer', 'Trader'],
    trim: true
  },

  // Permanent Address
  permanent_address_line_1: {
    type: String,
    required: false,
    trim: true
  },
  permanent_address_line_2: {
    type: String,
    required: false,
    trim: true
  },
  permanent_address_city: {
    type: String,
    required: false,
    trim: true
  },
  permanent_address_state: {
    type: String,
    required: false,
    trim: true
  },
  permanent_address_pin_code: {
    type: String,
    required: false,
    trim: true
  },
  permanent_address_telephone: {
    type: String,
    required: false,
    trim: true
  },
  permanent_address_email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },

  // Principal Business Address
  principle_business_address_line_1: {
    type: String,
    required: false,
    trim: true
  },
  principle_business_address_line_2: {
    type: String,
    required: false,
    trim: true
  },
  principle_business_address_city: {
    type: String,
    required: false,
    trim: true
  },
  principle_business_address_state: {
    type: String,
    required: false,
    trim: true
  },
  principle_business_address_pin_code: {
    type: String,
    required: false,
    trim: true
  },
  principle_business_telephone: {
    type: String,
    required: false,
    trim: true
  },
  principle_address_email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },
  principle_business_website: {
    type: String,
    required: false,
    trim: true
  },
  sameAsPermanentAddress: {
    type: Boolean,
    default: false
  },

  // Factory Addresses
  factory_addresses: [factoryAddressSchema],

  // Authorization
  authorised_signatories: [{
    type: String
  }],
  authorisation_letter: [{
    type: String
  }],

  // IEC Information
  iec_no: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  iec_copy: [{
    type: String
  }],

  // PAN Information
  pan_no: {
    type: String,
    required: false,
    trim: true
  },
  pan_copy: [{
    type: String
  }],

  // Banking Information
  banks: [bankSchema],

  // Documents
  other_documents: [{
    type: String
  }],
  spcb_reg: [{
    type: String
  }],
  kyc_verification_images: [{
    type: String
  }],
  gst_returns: [{
    type: String
  }],

  // Individual/Proprietary Firm Documents
  individual_passport_img: [{
    type: String
  }],
  individual_voter_card_img: [{
    type: String
  }],
  individual_driving_license_img: [{
    type: String
  }],
  individual_bank_statement_img: [{
    type: String
  }],
  individual_ration_card_img: [{
    type: String
  }],
  individual_aadhar_card: [{
    type: String
  }],

  // Partnership Firm Documents
  partnership_registration_certificate_img: [{
    type: String
  }],
  partnership_deed_img: [{
    type: String
  }],
  partnership_power_of_attorney_img: [{
    type: String
  }],
  partnership_valid_document: [{
    type: String
  }],
  partnership_aadhar_card_front_photo: [{
    type: String
  }],
  partnership_aadhar_card_back_photo: [{
    type: String
  }],
  partnership_telephone_bill: [{
    type: String
  }],

  // Company Documents
  company_certificate_of_incorporation_img: [{
    type: String
  }],
  company_memorandum_of_association_img: [{
    type: String
  }],
  company_articles_of_association_img: [{
    type: String
  }],
  company_power_of_attorney_img: [{
    type: String
  }],
  company_telephone_bill_img: [{
    type: String
  }],
  company_pan_allotment_letter_img: [{
    type: String
  }],

  // Trust/Foundation Documents
  trust_certificate_of_registration_img: [{
    type: String
  }],
  trust_power_of_attorney_img: [{
    type: String
  }],
  trust_officially_valid_document_img: [{
    type: String
  }],
  trust_resolution_of_managing_body_img: [{
    type: String
  }],
  trust_telephone_bill_img: [{
    type: String
  }],
  trust_name_of_trustees: {
    type: String,
    required: false
  },
  trust_name_of_founder: {
    type: String,
    required: false
  },
  trust_address_of_founder: {
    type: String,
    required: false
  },
  trust_telephone_of_founder: {
    type: String,
    required: false
  },
  trust_email_of_founder: {
    type: String,
    required: false,
    lowercase: true
  },

  // Workflow fields
  draft: {
    type: String,
    enum: ['true', 'false'],
    default: 'false'
  },
  approval: {
    type: String,
    enum: ['Pending', 'Approved', 'Approved by HOD', 'Sent for revision'],
    default: 'Pending'
  },
  approved_by: {
    type: String,
    required: false,
    trim: true
  },
  remarks: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
customerKycSchema.index({ iec_no: 1 });
customerKycSchema.index({ approval: 1 });
customerKycSchema.index({ draft: 1 });
customerKycSchema.index({ approved_by: 1 });
customerKycSchema.index({ category: 1 });
customerKycSchema.index({ createdAt: -1 });

// Virtual for formatted creation date
customerKycSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt ? this.createdAt.toLocaleDateString() : '';
});

// Pre-save middleware
customerKycSchema.pre('save', function(next) {
  // Ensure IEC number is uppercase
  if (this.iec_no) {
    this.iec_no = this.iec_no.toUpperCase();
  }
  
  // Ensure PAN number is uppercase
  if (this.pan_no) {
    this.pan_no = this.pan_no.toUpperCase();
  }
  
  next();
});

const CustomerKycModel = mongoose.model('CustomerKyc', customerKycSchema);

export default CustomerKycModel;

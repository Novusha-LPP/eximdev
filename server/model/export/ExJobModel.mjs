import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Image Schema for document attachments
const ImageSchema = new mongoose.Schema({
  url: { type: String, trim: true },
});

// Sub-schemas for complex nested data

// Product/Item Details Schema (for multiple products per invoice)
const productDetailsSchema = new Schema({
  serialNumber: { type: Number, required: true },
  description: { type: String, required: true, maxlength: 500 },
  ritc: { 
    type: String, 
    ref: 'TariffHead',
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{4,8}(\.\d{2})?$/.test(v);
      },
      message: 'Invalid RITC/Tariff Head format'
    }
  },
  quantity: { type: Number, required: true, min: 0 },
  socQuantity: { type: Number, default: 0, min: 0 }, // SOC Qty
  unitPrice: { type: Number, required: true, min: 0 },
  per: { 
    type: String,
    ref: 'UQC',
    required: true 
  },
  amount: { type: Number, required: true, min: 0 },
  
  // Additional product fields from screenshots
  assessableValue: { type: Number, default: 0 },
  netWeight: { type: Number, default: 0 },
  grossWeight: { type: Number, default: 0 },
  
  // Re-export specific fields
  reExport: {
    isReExport: { type: Boolean, default: false },
    beNumber: String,
    invoiceSerialNo: String,
    itemSerialNo: String,
    quantityExported: Number,
    importPortCode: { type: String, ref: 'Port' },
    technicalDetails: String,
    inputCreditAvailed: { type: Boolean, default: false },
    manualBE: { type: Boolean, default: false },
    personalUseItem: { type: Boolean, default: false },
    beItemDescription: String,
    otherIdentifyingParameters: String,
    againstExportObligation: String,
    quantityImported: Number,
    totalDutyPaid: Number,
    obligationNo: String,
    drawbackAmtClaimed: Number,
    itemUnUsed: { type: Boolean, default: false },
    commissionerPermission: String,
    boardNumber: String,
    modvatAvailed: { type: Boolean, default: false },
    modvatReversed: { type: Boolean, default: false }
  }
}, { _id: true });

// Drawback Details Schema
const drawbackDetailsSchema = new Schema({
  serialNumber: { type: String, required: true },
  fobValue: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
  dbkUnder: { 
    type: String, 
    enum: ['Actual', 'Provisional'],
    default: 'Actual'
  },
  dbkDescription: { type: String, maxlength: 500 },
  dbkRate: { type: Number, default: 1.5, min: 0 },
  dbkCap: { type: Number, default: 0, min: 0 },
  dbkAmount: { type: Number, default: 0, min: 0 },
  percentageOfFobValue: String
}, { _id: true });

// Invoice Schema (multiple invoices per job)
const invoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true },
  invoiceDate: { type: Date, required: true },
  termsOfInvoice: { 
    type: String,
    enum: ['CIF', 'FOB', 'CFR', 'EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DDP'],
    default: 'FOB'
  },
  currency: { 
    type: String, 
    ref: 'Currency',
    required: true,
    default: 'USD'
  },
  invoiceValue: { type: Number, required: true, min: 0 },
  productValue: { type: Number, required: true, min: 0 },
  taxableValueForIGST: { type: Number, default: 0, min: 0 },
  priceIncludes: { 
    type: String,
    enum: ['Both', 'Freight Only', 'Insurance Only', 'Neither'],
    default: 'Both'
  },
  // packingFOB: { type: Number, default: 0, min: 0 },
  invoice_value: { type: Number, default: 0 },
  product_value_fob: { type: Number, default: 0 },
  packing_fob: { type: Number, default: 0 },

  
  // Product details for this invoice
  products: [productDetailsSchema],
  
  // Drawback details for this invoice
  drawbackDetails: [drawbackDetailsSchema],
  
  // CESS/Export Duty Details
  cessDutyDetails: {
    cessDutyApplicable: { type: Boolean, default: false },
    cessDutyRates: {
      exportDuty: { type: Number, default: 0 },
      cess: { type: Number, default: 0 },
      otherDutyCess: { type: Number, default: 0 },
      thirdCess: { type: Number, default: 0 }
    },
    tariffValue: { type: Number, default: 0 },
    qtyForCessDuty: { type: Number, default: 0 },
    cessDescription: String
  },
  
  // CENVAT Details
  cenvatDetails: {
    certificateNumber: String,
    date: Date,
    validUpto: Date,
    cexOfficeCode: String,
    assesseeCode: String
  }
}, { _id: true });

// Shipping Details Schema
const shippingDetailsSchema = new Schema({
  dischargePort: { 
    type: String, 
    ref: 'Port',
    required: true 
  },
  dischargeCountry: { 
    type: String, 
    ref: 'Country',
    required: true 
  },
  destinationPort: { 
    type: String, 
    ref: 'Port',
    required: true 
  },
  destinationCountry: { 
    type: String, 
    ref: 'Country',
    required: true 
  },
  natureOfCargo: { 
    type: String,
    enum: ['Containerised', 'Break Bulk', 'Liquid Bulk', 'Dry Bulk'],
    default: 'Containerised'
  },
  totalNoOfPackages: { type: Number, required: true, min: 1 },
  loosePackages: { type: Number, default: 0 },
  noOfContainers: { type: Number, default: 0 },
  
  shippingLine: { 
    type: String, 
    ref: 'ShippingLine'
  },
  vesselName: String,
  sailingDate: Date,
  voyageNo: String,
  
  // Bill of Lading Details
  egmNo: String,
  egmDate: Date,
  mblNo: String,
  mblDate: Date,
  hblNo: String,
  hblDate: Date,
  
  // Weight and Measurements
  grossWeight: { type: Number, required: true, min: 0 },
  netWeight: { type: Number, required: true, min: 0 },
  volume: { type: Number, default: 0 },
  chargeableWeight: { type: Number, default: 0 },
  
  // Additional shipping fields
  marksAndNos: String,
  preCarriageBy: String,
  placeOfReceipt: String,
  transhipperCode: String,
  gatewayPort: { type: String, ref: 'Port' },
  stateOfOrigin: { type: String, ref: 'State' },
  
  // Stuffing Details
  stuffingDetails: {
    goodsStuffedAt: { 
      type: String,
      enum: ['Factory', 'Warehouse', 'CFS', 'ICD', 'Port'],
      default: 'Factory'
    },
    sampleAccompanied: { type: Boolean, default: false },
    factoryAddress: String,
    warehouseCode: String,
    sealType: String,
    sealNo: String,
    agencyName: String
  }
}, { _id: false });

// Container Details Schema
const containerDetailsSchema = new Schema({
  serialNumber: { type: Number, required: true },
  containerNo: { type: String, required: true },
  sealNo: String,
  sealDate: Date,
  type: { 
    type: String,
    enum: ['20 Standard Dry', '40 Standard Dry', '40 High Cube', '20 Reefer', '40 Reefer'],
    required: true
  },
  pkgsStuffed: { type: Number, default: 0 }, // 'Pkgs Stuffed'
  grossWeight: { type: Number, default: 0 },
  sealType: { 
    type: String,
    enum: ['BTSL - Bottle', 'WIRE', 'PLASTIC', 'METAL'],
    default: 'BTSL - Bottle'
  },
  moveDocType: String,
  moveDocNo: String,
  location: String,
  grWtPlusTrWt: { type: Number, default: 0 },
  sealDeviceId: String,
  rfid: String // If needed for RFID field
}, { _id: true });

// Buyer/Third Party Information Schema
const buyerThirdPartySchema = new Schema({
  // Buyer Information
  buyer: {
    name: { type: String, required: true },
    addressLine1: String,
    city: String,
    pin: String,
    country: { type: String, ref: 'Country' },
    state: String
  },
  
  // Third Party Information (if applicable)
  thirdParty: {
    isThirdPartyExport: { type: Boolean, default: false },
    name: String,
    city: String,
    pin: String,
    country: { type: String, ref: 'Country' },
    state: String,
    address: String
  },
  
  // Manufacturer/Producer/Grower Details
  manufacturer: {
    name: String,
    ieCode: String,
    branchSerialNo: String,
    registrationNo: String,
    address: String,
    country: { type: String, ref: 'Country', default: 'IN' },
    stateProvince: String,
    postalCode: String,
    sourceState: { type: String, ref: 'State' },
    transitCountry: { type: String, ref: 'Country' }
  }
}, { _id: false });

// ARE Details Schema
const areDetailsSchema = new Schema({
  serialNumber: Number,
  areNumber: String,
  areDate: Date,
  commissionerate: String,
  division: String,
  range: String,
  remark: String
}, { _id: true });

// Document Management Schema
const documentSchema = new Schema({
  documentName: { 
    type: String,
    enum: [
      'Shipping Bill', 'Annexures', 'Invoice', 'Packing List',
      'Certificate Of Origin', 'GSP/SFTA', 'Checklist for Export', 'N-Form'
    ],
    required: true
  },
  action: { 
    type: String,
    enum: ['View', 'Generate', 'E-mail', 'Get Approval'],
    default: 'View'
  },
  published: { type: Boolean, default: false },
  generationDate: Date,
  filePath: String,
  fileSize: Number,
  status: { 
    type: String,
    enum: ['Pending', 'Generated', 'Approved', 'Rejected'],
    default: 'Pending'
  }
}, { _id: true });

// eSanchit Document Schema
const eSanchitDocumentSchema = new Schema({
  documentLevel: { 
    type: String,
    enum: ['Invoice', 'Item', 'Job'],
    required: true
  },
  scope: { 
    type: String,
    enum: ['This job only', 'All jobs'],
    default: 'This job only'
  },
  invSerialNo: String,
  itemSerialNo: String,
  irn: String, // Image Reference Number
  documentType: { 
    type: String,
    ref: 'SupportingDocumentCode'
  },
  otherIcegateId: String,
  icegateFilename: String,
  fileType: { 
    type: String,
    enum: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
    default: 'pdf'
  },
  dateTimeOfUpload: { type: Date, default: Date.now },
  documentReferenceNo: String,
  dateOfIssue: Date,
  placeOfIssue: String,
  expiryDate: Date,
  
  // Issuing Party Details
  issuingParty: {
    name: String,
    code: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    pinCode: String
  },
  
  // Beneficiary Party Details
  beneficiaryParty: {
    name: String,
    addressLine1: String,
    city: String,
    pinCode: String
  }
}, { _id: true });

// Charges Schema (for billing and payments)
const chargeSchema = new Schema({
  chargeName: { type: String, required: true },
  category: { 
    type: String,
    enum: ['Reimbursement', 'Margin', 'Service', 'Handling'],
    required: true
  },
  costCenter: String,
  
  // Revenue and Cost breakdown
  revenue: {
    basis: { 
      type: String,
      enum: ['Per S/B', 'Per Container', 'Percentage', 'Fixed'],
      default: 'Per S/B'
    },
    qtyUnit: { type: Number, default: 1 },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, ref: 'Currency', default: 'INR' },
    amountINR: Number
  },
  
  cost: {
    basis: { 
      type: String,
      enum: ['Per S/B', 'Per Container', 'Percentage', 'Fixed'],
      default: 'Per S/B'
    },
    qtyUnit: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    currency: { type: String, ref: 'Currency', default: 'INR' },
    amountINR: Number
  },
  
  // Receivable Information
  receivableType: { 
    type: String,
    enum: ['Customer', 'Third Party', 'Shipping Line'],
    default: 'Customer'
  },
  receivableFrom: { type: String, ref: 'Directory' },
  
  // Payable Information
  payableType: { 
    type: String,
    enum: ['Vendor', 'Employee', 'Government', 'Bank'],
    default: 'Vendor'
  },
  payableTo: String,
  employee: String,
  
  // Additional charge details
  overrideAutoRate: { type: Boolean, default: false },
  copyToRevenue: { type: Boolean, default: false }
}, { _id: true });

// Exchange Rates Schema
const exchangeRateSchema = new Schema({
  currencyCode: { type: String, ref: 'Currency', required: true },
  customExchangeRate: { type: Number, required: true },
  nonStdCurrency: { type: Boolean, default: false },
  
  // Different exchange rates for different purposes
  revenue: {
    exchangeRate: Number,
    cfx: Number
  },
  cost: {
    exchangeRate: Number,
    cfx: Number
  },
  agentExchangeRate: Number,
  
  // Bank details for exchange rate
  bankDetails: { type: Boolean, default: false },
  rateDate: Date
}, { _id: false });

// Payment Request Schema
const paymentRequestSchema = new Schema({
  requestType: { 
    type: String,
    enum: ['Job Expenses', 'Non Job Expenses'],
    default: 'Job Expenses'
  },
  payTo: { 
    type: String,
    enum: ['Vendor', 'Employee'],
    default: 'Vendor'
  },
  against: { 
    type: String,
    enum: ['Expense', 'Advance'],
    default: 'Expense'
  },
  referenceNo: String,
  date: { type: Date, default: Date.now },
  modeOfPayment: { 
    type: String,
    enum: ['Cheque No.', 'Bank Transfer', 'Cash', 'Online'],
    default: 'Cheque No.'
  },
  markAsUrgent: { type: Boolean, default: false },
  amount: { type: Number, required: true, min: 0 },
  narration: String,
  
  // Charge details for payment
  chargeDetails: [{
    chargeName: String,
    amountTC: Number,
    currency: { type: String, ref: 'Currency' },
    amountHC: Number,
    payableTo: String
  }],
  
  // Vendor bill details
  vendorBillDetails: [{
    purchaseBillNo: String,
    date: Date,
    vendorInvNo: String,
    currency: { type: String, ref: 'Currency' },
    billAmount: Number,
    outstandingAmount: Number,
    amountTC: Number,
    amountHC: Number
  }]
}, { _id: true });

// Milestone Tracking Schema
const milestoneSchema = new Schema({
  milestoneName: { 
    type: String,
    enum: [
      'SB Filed', 'SB Receipt', 'L.E.O', 'Container HO to Concor',
      'Rail Out', 'Ready for Billing', 'Billing Done'
    ],
    required: true
  },
  planDate: Date,
  actualDate: Date,
  status: { 
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Delayed'],
    default: 'Pending'
  },
  remarks: String,
  handledBy: String
}, { _id: true });

const vesselSchema = new mongoose.Schema({
  name: { type: String, required: true },
  voyageNumber: { type: String, required: true },
  scheduleDate: { type: Date, required: true },
  portOfLoading: String,
  portOfDischarge: String,
  carrier: String,
});

// Instead of ObjectId ref 'Vessel', embed vesselSchema or equivalent inline:

const bookingSchema = new mongoose.Schema({
  vessel: vesselSchema,  // embedded full vessel details in booking
  containerType: String,
  containerQuantity: Number,
  shippingDate: Date,
  shipperName: String,
  consigneeName: String,
  status: { type: String, enum: ['Pending', 'Confirmed', 'Rejected'], default: 'Pending' },
  bookingConfirmation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookingConfirmation',
    required: false,
  },
}, { timestamps: true });


const bookingConfirmationSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  confirmationNumber: { type: String, required: true },
  confirmedAt: { type: Date, default: Date.now },
  documents: [String], // array of file URLs or paths
});


const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['text', 'number', 'date', 'select', 'boolean'] 
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }], // For select fields
  order: { type: Number, default: 0 }
});



// Custom Field Schema for dynamic data
const customFieldSchema = new mongoose.Schema({
  fieldId: { type: mongoose.Schema.Types.ObjectId, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
});

// Account Entry Schema
const accountEntrySchema = new mongoose.Schema({
  masterTypeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterType', 
    required: true 
  },
  companyName: { type: String, required: true },
  address: { type: String, required: true },
  dueDate: { type: Date, required: true },
  reminderFrequency: { 
    type: String, 
    required: true, 
    enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'] 
  },
  customFields: [customFieldSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Export Document Schema
const exportDocumentSchema = new mongoose.Schema({
  document_name: { type: String, trim: true },
  document_code: { type: String, trim: true },
  url: [{ type: String, trim: true }],
  document_number: { type: String, trim: true },
  issue_date: { type: String, trim: true },
  expiry_date: { type: String, trim: true },
  document_check_date: { type: String, trim: true },
  is_verified: { type: Boolean, default: false },
  verification_date: { type: String, trim: true },
});

// Shipping Bill Document Schema
const shippingBillDocumentSchema = new mongoose.Schema({
  sb_number: { type: String, trim: true },
  sb_date: { type: String, trim: true },
  sb_type: { 
    type: String, 
    trim: true,
    enum: ['duty_free', 'dutiable', 'drawback', 'coastal', 'ex_bond']
  },
  sb_color_code: { type: String, trim: true }, // white, yellow, green, pink
  customs_house_code: { type: String, trim: true },
  port_of_loading: { type: String, trim: true },
  country_of_destination: { type: String, trim: true },
  url: [{ type: String, trim: true }],
  document_check_date: { type: String, trim: true },
  let_export_order_date: { type: String, trim: true },
  is_sb_filed: { type: Boolean, default: false },
  sb_filing_date: { type: String, trim: true },
});

// Container/Package Schema for Export
const exportContainerSchema = new mongoose.Schema({
  container_number: { type: String, trim: true },
  container_type: { type: String, trim: true }, // FCL, LCL
  container_size: { type: String, trim: true }, // 20ft, 40ft, 40HC
  seal_number: { type: String, trim: true },
  stuffing_date: { type: String, trim: true },
  stuffing_location: { type: String, trim: true },
  gross_weight: { type: String, trim: true },
  net_weight: { type: String, trim: true },
  tare_weight: { type: String, trim: true },
  volume: { type: String, trim: true },
  packages_count: { type: String, trim: true },
  package_type: { type: String, trim: true }, // Cartons, Pallets, Bags, etc.
  marks_and_numbers: { type: String, trim: true },
  container_images: [{ type: String, trim: true }],
  stuffing_images: [{ type: String, trim: true }],
  seal_images: [{ type: String, trim: true }],
  weighment_slip: [{ type: String, trim: true }],
  vgm_certificate: [{ type: String, trim: true }], // Verified Gross Mass
  vgm_date: { type: String, trim: true },
  gate_in_date: { type: String, trim: true },
  gate_out_date: { type: String, trim: true },
  loading_date: { type: String, trim: true },
  departure_date: { type: String, trim: true },
});

// Charges Schema for Export
const exportChargesSchema = new mongoose.Schema({
  charge_type: { type: String, trim: true }, // freight, insurance, handling, etc.
  charge_description: { type: String, trim: true },
  amount: { type: String, trim: true },
  currency: { type: String, trim: true },
  payment_terms: { type: String, trim: true },
  invoice_number: { type: String, trim: true },
  invoice_date: { type: String, trim: true },
  payment_status: { type: String, trim: true },
  payment_date: { type: String, trim: true },
  document_urls: [{ type: String, trim: true }],
});

// Certificate Schema
const certificateSchema = new mongoose.Schema({
  certificate_type: { type: String, trim: true },
  certificate_number: { type: String, trim: true },
  issue_date: { type: String, trim: true },
  expiry_date: { type: String, trim: true },
  issuing_authority: { type: String, trim: true },
  certificate_urls: [{ type: String, trim: true }],
  is_required: { type: Boolean, default: false },
  is_obtained: { type: Boolean, default: false },
});

// Main Export Job Schema
const exportJobSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },

  ////////////////////////////////////////////////// Basic Job Information

  job_type: { 
    type: String, 
    trim: true, 
    enum: ['air_export', 'sea_export', 'land_export', 'courier_export'],
    default: 'sea_export'
  },


  submission_status: {
    type: String, 
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected'], 
    default: 'draft'
  },
  submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  admin_approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  admin_approved_date_time: { type: Date },
  admin_remark: { type: String, trim: true },

  submission_status_history: [{
    status: { type: String },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date_time: { type: Date }
  }],

  // Note: These schemas need to be defined separately before this schema
  vessel: [vesselSchema],
  booking: [bookingSchema],
  bookingConfirmation: [bookingConfirmationSchema],

  ////////////////////////////////////////////////// Excel sheet
  year: { type: String, trim: true },
  // job_no: { type: String, trim: true },
  custom_house: { type: String, trim: true },
  job_date: { type: String, trim: true },
  exporter: { type: String, trim: true },
  supplier_exporter: { type: String, trim: true },
  invoice_number: { type: String, trim: true },
  invoice_date: { type: String, trim: true },
  awb_bl_no: { type: String, trim: true },
  awb_bl_date: { type: String, trim: true },
  description: { type: String, trim: true },
  hawb_hbl_no: { type: String, trim: true },
  hawb_hbl_date: { type: String, trim: true },
  sb_no: { type: String, trim: true },
  in_bond_sb_no: { type: String, trim: true },
  sb_date: { type: String, trim: true },
  sb_filing_type: { type: String, trim: true },
  in_bond_sb_date: { type: String, trim: true },
  type_of_b_e: { type: String, trim: true },
  no_of_pkgs: { type: String, trim: true },
  unit: { type: String, trim: true },
  gross_weight: { type: String, trim: true },
  firstCheck: { type: String, trim: true },
  job_net_weight: { type: String, trim: true },
  priorityJob: { type: String, trim: true, default: "Normal" },
  unit_1: { type: String, trim: true },
  gateway_igm: { type: String, trim: true },
  gateway_igm_date: { type: String, trim: true },
  hss: { type: String, trim: true, default: "No" },
  saller_name: { type: String, trim: true },
  igm_no: { type: String, trim: true },
  igm_date: { type: String, trim: true },
  loading_port: { type: String, trim: true },
  origin_country: { type: String, trim: true },
  port_of_reporting: { type: String, trim: true },
  shipping_line_airline: { type: String, trim: true },
  branchSrNo: { type: String, trim: true },
  adCode: { type: String, trim: true },
  bank_name: { type: String, trim: true },
  isDraftDoc: { type: Boolean },
  fta_Benefit_date_time: { type: String, trim: true },
  exBondValue: { type: String, trim: true },
  scheme: { type: String, trim: true },
  clearanceValue: { type: String, trim: true },
  ie_code_no: { type: String, trim: true },

  container_nos: [
    {
      container_number: { type: String, trim: true },
      arrival_date: { type: String, trim: true },
      detention_from: { type: String, trim: true },
      size: { type: String, trim: true },
      physical_weight: { type: String, trim: true },
      tare_weight: { type: String, trim: true },
      net_weight: { type: String, trim: true },
      container_gross_weight: { type: String, trim: true },
      actual_weight: { type: String, trim: true },
      transporter: { type: String, trim: true },
      vehicle_no: { type: String, trim: true },
      driver_name: { type: String, trim: true },
      driver_phone: { type: String, trim: true },
      seal_no: { type: String, trim: true },
      pre_weighment: { type: String, trim: true },
      post_weighment: { type: String, trim: true },
      weight_shortage: { type: String, trim: true },
      weight_excess: { type: String, trim: true },
      weighment_slip_images: [{ type: String, trim: true }],
      container_pre_damage_images: [{ type: String, trim: true }],
      container_images: [{ type: String, trim: true }],
      loose_material: [{ type: String, trim: true }],
      examination_videos: [{ type: String, trim: true }],
      do_revalidation_date: { type: String, trim: true },
      do_validity_upto_container_level: { type: String, trim: true },
      required_do_validity_upto: { type: String, trim: true },
      seal_number: { type: String, trim: true },
      container_rail_out_date: { type: String, trim: true },
      by_road_movement_date: { type: String, trim: true },
      emptyContainerOffLoadDate: { type: String, trim: true },
      net_weight_as_per_PL_document: { type: String, trim: true },
      delivery_chalan_file: { type: String, trim: true },
      delivery_date: {
        type: String,
        trim: true,
      },
        
      do_revalidation: [
        {
          do_revalidation_upto: { type: String },
          remarks: { type: String },
          do_Revalidation_Completed: { type: Boolean, default: false },
        },
      ],
    },
  ],
  is_checklist_aprroved: { type: Boolean, default: false },
  is_checklist_aprroved_date: { type: String, trim: true },
  is_checklist_clicked: { type: Boolean, trim: true },
  container_count: { type: String, trim: true },
  no_of_container: { type: String, trim: true },
  toi: { type: String, trim: true },
  unit_price: { type: String, trim: true },
  cif_amount: { type: String, trim: true },
  assbl_value: { type: String, trim: true },
  total_duty: { type: String, trim: true },
  out_of_charge: { type: String, trim: true },
  consignment_type: { type: String, trim: true },
  shipping_bill_no: { type: String, trim: true },
  shipping_bill_date: { type: String, trim: true },
  cth_no: { type: String, trim: true },
  exrate: { type: String, trim: true },
  inv_currency: { type: String, trim: true },
  vessel_berthing: {
    type: String,
    trim: true,
    enum: ['FCL', 'LCL', 'Air_Cargo', 'Break_Bulk', 'Courier']
  },
  incoterms: { 
    type: String, 
    trim: true,
    default: 'FOB',
    enum: ['FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'DDU', 'FCA', 'CPT', 'CIP']
  },
  ref_type: { type: String, trim: true },
  exporter_ref_no: { type: String, trim: true },
  filing_mode: { type: String, trim: true },
shipper: { type: String, trim: true },
job_received_on: { type: Date },
sb_type: { type: String, trim: true },
transport_mode: { type: String, trim: true },
exporter_type: { type: String, trim: true },

// Exporter Additional Fields (Missing)
branch_code: { type: String, trim: true },
branch_sno: { type: String, trim: true },
regn_no: { type: String, trim: true },
gstin: { type: String, trim: true },
state: { type: String, trim: true },

// DBK Fields (Missing)
dbk_bank: { type: String, trim: true },
dbk_ac: { type: String, trim: true },
dbk_edi_ac: { type: String, trim: true },

// Reference & Regulatory Fields (Missing)
ref_type: { type: String, trim: true },
sb_number_date: { type: String, trim: true },
rbi_app_no: { type: String, trim: true },
gr_waived: { type: Boolean, default: false },
gr_no: { type: String, trim: true },
rbi_waiver_no: { type: String, trim: true },
epz_code: { type: String, trim: true },
notify: { type: String, trim: true },

// Business Fields (Missing)
sales_person: { type: String, trim: true },
business_dimensions: { type: String, trim: true },
quotation: { type: String, trim: true },

// Additional Banking Fields (Missing)
bank_branch: { type: String, trim: true },
bank_ifsc_code: { type: String, trim: true },
bank_swift_code: { type: String, trim: true },

// Commercial Fields (Missing)
currency: { type: String, trim: true, default: 'USD' },
terms_of_invoice: { type: String, trim: true },
product_value_usd: { type: String, trim: true },

// Enhanced Shipping Fields (Missing)
discharge_port: { type: String, trim: true },
discharge_country: { type: String, trim: true },
destination_port: { type: String, trim: true },
destination_country: { type: String, trim: true },
vessel_sailing_date: { type: String, trim: true },
vessel_departure_date: { type: String, trim: true },
voyage_no: { type: String, trim: true },
nature_of_cargo: { type: String, trim: true },
total_no_of_pkgs: { type: String, trim: true },
loose_pkgs: { type: String, trim: true },
no_of_containers: { type: String, trim: true },
chargeable_weight: { type: String, trim: true },
marks_nos: { type: String, trim: true },

// Job Management Fields (Missing)
movement_type: { type: String, trim: true },
// Port & Delivery Fields (Missing)
place_of_delivery: { type: String, trim: true },
country_of_final_destination: { type: String, trim: true },

// Vessel/Flight Timing Fields (Missing)
etd_port_of_loading: { type: String, trim: true },
eta_port_of_discharge: { type: String, trim: true },

// Cargo Dimension Fields (Missing)
dimensions_length: { type: String, trim: true },
dimensions_width: { type: String, trim: true },
dimensions_height: { type: String, trim: true },

// Proforma Invoice Fields (Missing)
proforma_invoice_number: { type: String, trim: true },
proforma_invoice_date: { type: String, trim: true },
proforma_invoice_value: { type: String, trim: true },

// Boolean Control Fields (Missing)
buyer_other_than_consignee: { type: Boolean, default: false },

// Assignment Fields (Missing)
assigned_documentation_executive: { type: String, trim: true },
assigned_operations_executive: { type: String, trim: true },
assigned_accounts_executive: { type: String, trim: true },

// Ensure these arrays exist (some might be missing)
products: { type: Array, default: [] },
charges: { type: Array, default: [] },
documents: { type: Object, default: {} },
  priority_level: { 
    type: String, 
    trim: true, 
    default: "Normal",
    enum: ['High', 'Normal', 'Low', 'Urgent']
  },
  status: { type: String, trim: true },
  detailed_status: { type: String, trim: true },

  // Additional tracking fields for your export schema
  container_placement_date_factory: { type: String, trim: true },
  original_docs_received_date: { type: String, trim: true },
  gate_in_thar_khodiyar_date: { type: String, trim: true },
  gate_in_thar_khodiyar_time: { type: String, trim: true },
  hand_over_date: { type: String, trim: true },
  file_hand_over_date: { type: String, trim: true },
  rail_out_date_plan: { type: String, trim: true },
  rail_out_date_actual: { type: String, trim: true },
  port_gate_in_date: { type: String, trim: true },
  cargo_arrived_icd_date: { type: String, trim: true },
  customs_clearance_done: { type: Boolean, default: false },
  cntr_size: { type: String, trim: true, enum: ['20', '40', '20HC', '40HC', 'AIR'] },
  port_of_origin: { type: String, trim: true },
  docs_received_date: { type: String, trim: true },
  tracking_remarks: { type: String, trim: true },
  operation_remarks: { type: String, trim: true },

  ////////////////////////////////////////////////// Exporter Information
  exporter_name: { type: String, trim: true, required: true },
  exporter_address: { type: String, trim: true },
  exporter_city: { type: String, trim: true },
  exporter_state: { type: String, trim: true },
  exporter_country: { type: String, trim: true, default: 'India' },
  exporter_pincode: { type: String, trim: true },
  exporter_phone: { type: String, trim: true },
  exporter_email: { type: String, trim: true },
  exporter_fax: { type: String, trim: true },
  exporter_website: { type: String, trim: true },
  
  // Regulatory Information
  ie_code: { type: String, trim: true, required: true }, // Import Export Code
  exporter_pan: { type: String, trim: true },
  exporter_gstin: { type: String, trim: true },
  exporter_tan: { type: String, trim: true },
  ad_code: { type: String, trim: true }, // Authorized Dealer Code
  rcmc_number: { type: String, trim: true }, // Registration Cum Membership Certificate
  rcmc_validity: { type: String, trim: true },
  
  // Banking Information - Removed duplicate bank_name
  bank_branch: { type: String, trim: true },
  bank_account_number: { type: String, trim: true },
  bank_ifsc_code: { type: String, trim: true },
  bank_swift_code: { type: String, trim: true },

  ////////////////////////////////////////////////// Consignee/Importer Information
  consignee_name: { type: String, trim: true, required: true },
  consignee_address: { type: String, trim: true },
  consignee_city: { type: String, trim: true },
  consignee_state: { type: String, trim: true },
  consignee_country: { type: String, trim: true },
  consignee_postal_code: { type: String, trim: true },
  consignee_phone: { type: String, trim: true },
  consignee_email: { type: String, trim: true },
  consignee_fax: { type: String, trim: true },
  consignee_tax_id: { type: String, trim: true },

  // Notify Party Information
  notify_party_name: { type: String, trim: true },
  notify_party_address: { type: String, trim: true },
  notify_party_phone: { type: String, trim: true },
  notify_party_email: { type: String, trim: true },

  ////////////////////////////////////////////////// Shipment Details
  port_of_loading: { type: String, trim: true },
  port_of_discharge: { type: String, trim: true },
  final_destination: { type: String, trim: true },
  place_of_receipt: { type: String, trim: true },
  place_of_delivery: { type: String, trim: true },
  country_of_origin: { type: String, trim: true, default: 'India' },
  country_of_final_destination: { type: String, trim: true },
  
  // Vessel/Flight Information
  vessel_flight_name: { type: String, trim: true },
  voyage_flight_number: { type: String, trim: true },
  etd_port_of_loading: { type: String, trim: true }, // Estimated Time of Departure
  eta_port_of_discharge: { type: String, trim: true }, // Estimated Time of Arrival
  actual_departure_date: { type: String, trim: true },
  actual_arrival_date: { type: String, trim: true },
  
  // Carrier Information - Removed duplicate shipping_line_airline
  master_bl_awb_number: { type: String, trim: true },
  master_bl_awb_date: { type: String, trim: true },
  house_bl_awb_number: { type: String, trim: true },
  house_bl_awb_date: { type: String, trim: true },
  booking_number: { type: String, trim: true },
  booking_date: { type: String, trim: true },

  ////////////////////////////////////////////////// Cargo Information
  commodity_description: { type: String, trim: true },
  hs_code: { type: String, trim: true },
  total_packages: { type: String, trim: true },
  package_type: { type: String, trim: true },
  gross_weight_kg: { type: String, trim: true },
  net_weight_kg: { type: String, trim: true },
  volume_cbm: { type: String, trim: true },
  dimensions_length: { type: String, trim: true },
  dimensions_width: { type: String, trim: true },
  dimensions_height: { type: String, trim: true },
  marks_and_numbers: { type: String, trim: true },
  special_instructions: { type: String, trim: true },
  
  // Dangerous Goods Information
  is_dangerous_goods: { type: Boolean, default: false },
  un_number: { type: String, trim: true },
  proper_shipping_name: { type: String, trim: true },
  hazard_class: { type: String, trim: true },
  packing_group: { type: String, trim: true },

  ////////////////////////////////////////////////// Commercial Information
  // Invoice Details
  proforma_invoice_number: { type: String, trim: true },
  proforma_invoice_date: { type: String, trim: true },
  proforma_invoice_value: { type: String, trim: true },
  commercial_invoice_number: { type: String, trim: true },
  commercial_invoice_date: { type: String, trim: true },
  commercial_invoice_value: { type: String, trim: true },
  invoice_currency: { type: String, trim: true, default: 'USD' },
  exchange_rate: { type: String, trim: true },
  fob_value: { type: String, trim: true },
  freight_charges: { type: String, trim: true },
  insurance_charges: { type: String, trim: true },
  cif_value: { type: String, trim: true },
  
  // Payment Terms
  payment_terms: { type: String, trim: true },
  payment_method: { 
    type: String, 
    trim: true,
    enum: ['LC', 'TT', 'DA', 'DP', 'Advance', 'CAD', 'Open_Account']
  },
  
  // Letter of Credit Information
  lc_number: { type: String, trim: true },
  lc_date: { type: String, trim: true },
  lc_amount: { type: String, trim: true },
  lc_expiry_date: { type: String, trim: true },
  lc_issuing_bank: { type: String, trim: true },
  lc_advising_bank: { type: String, trim: true },
  lc_confirming_bank: { type: String, trim: true },
  
  // Bill of Exchange
  bill_of_exchange_number: { type: String, trim: true },
  bill_of_exchange_date: { type: String, trim: true },
  bill_of_exchange_amount: { type: String, trim: true },
  bill_of_exchange_tenor: { type: String, trim: true },

  ////////////////////////////////////////////////// Shipping Bill Information
  shipping_bill_number: { type: String, trim: true },
  shipping_bill_date: { type: String, trim: true },
  shipping_bill_type: { 
    type: String, 
    trim: true,
    enum: ['duty_free', 'dutiable', 'drawback', 'coastal', 'ex_bond']
  },
  customs_house: { type: String, trim: true },
  customs_officer_name: { type: String, trim: true },
  
  // LEO (Let Export Order)
  leo_number: { type: String, trim: true },
  leo_date: { type: String, trim: true },
  leo_validity_date: { type: String, trim: true },
  leo_copy: [{ type: String, trim: true }],
  assessed_copy: [{ type: String, trim: true }],
  gate_pass_copy: [{ type: String, trim: true }],
  
  // Gate Pass Information
  gate_pass_number: { type: String, trim: true },
  gate_pass_date: { type: String, trim: true },
  gate_pass_validity: { type: String, trim: true },
  cartage_date: { type: String, trim: true },

  ////////////////////////////////////////////////// Export Incentives & Schemes
  export_promotion_scheme: { type: String, trim: true }, // MEIS, SEIS, etc.
  scheme_code: { type: String, trim: true },
  scrip_value: { type: String, trim: true },
  duty_drawback_rate: { type: String, trim: true },
  duty_drawback_amount: { type: String, trim: true },
  duty_drawback_claimed: { type: Boolean, default: false },
  duty_drawback_received_date: { type: String, trim: true },
  
  // Export Finance
  export_finance_required: { type: Boolean, default: false },
  packing_credit_limit: { type: String, trim: true },
  packing_credit_utilized: { type: String, trim: true },
  export_bill_negotiated_date: { type: String, trim: true },
  export_proceeds_realization_date: { type: String, trim: true },

  ////////////////////////////////////////////////// Containers Information
  // Note: exportContainerSchema needs to be defined separately
  containers: [exportContainerSchema],
  // Removed duplicate container_count
  stuffing_location: { type: String, trim: true },
  stuffing_date: { type: String, trim: true },
  stuffing_time: { type: String, trim: true },
  
  // CFS/Terminal Information
  cfs_terminal_name: { type: String, trim: true },
  cfs_gate_in_date: { type: String, trim: true },
  cfs_gate_out_date: { type: String, trim: true },
  terminal_handling_charges: { type: String, trim: true },

  ////////////////////////////////////////////////// Documentation Module
  // Note: These schemas need to be defined separately
  export_documents: [exportDocumentSchema],
  shipping_bill_documents: [shippingBillDocumentSchema],
  certificates: [certificateSchema],
  all_documents: [{ type: String, trim: true }],
  
  // Certificate Requirements
  certificate_of_origin_required: { type: Boolean, default: false },
  certificate_of_origin_number: { type: String, trim: true },
  certificate_of_origin_date: { type: String, trim: true },
  certificate_of_origin_issuing_authority: { type: String, trim: true },
  
  phytosanitary_certificate_required: { type: Boolean, default: false },
  phytosanitary_certificate_number: { type: String, trim: true },
  phytosanitary_certificate_date: { type: String, trim: true },
  
  quality_inspection_certificate: { type: String, trim: true },
  quality_inspection_date: { type: String, trim: true },
  quality_inspection_agency: { type: String, trim: true },
  
  fumigation_certificate_number: { type: String, trim: true },
  fumigation_certificate_date: { type: String, trim: true },
  fumigation_validity_date: { type: String, trim: true },
  
  insurance_policy_number: { type: String, trim: true },
  insurance_policy_date: { type: String, trim: true },
  insurance_company: { type: String, trim: true },
  insurance_amount: { type: String, trim: true },

  ////////////////////////////////////////////////// Regulatory Compliance
  // Export License Information
  export_license_required: { type: Boolean, default: false },
  export_license_number: { type: String, trim: true },
  export_license_date: { type: String, trim: true },
  export_license_validity: { type: String, trim: true },
  export_license_authority: { type: String, trim: true },
  
  // FSSAI (for food products)
  fssai_license_number: { type: String, trim: true },
  fssai_license_validity: { type: String, trim: true },
  
  // Drug License (for pharmaceutical products)
  drug_license_number: { type: String, trim: true },
  drug_license_validity: { type: String, trim: true },
  
  // Textile Committee Registration
  textile_committee_registration: { type: String, trim: true },
  
  // BIS Certification
  bis_license_number: { type: String, trim: true },
  bis_license_validity: { type: String, trim: true },

  ////////////////////////////////////////////////// Milestone Tracking
  booking_confirmation_date: { type: String, trim: true },
  documentation_start_date: { type: String, trim: true },
  documentation_completion_date: { type: String, trim: true },
  pre_shipment_inspection_date: { type: String, trim: true },
  customs_clearance_date: { type: String, trim: true },
  cargo_pickup_date: { type: String, trim: true },
  port_terminal_arrival_date: { type: String, trim: true },
  loading_completion_date: { type: String, trim: true },
  vessel_departure_date: { type: String, trim: true },
  in_transit_milestone_dates: [{ 
    location: { type: String },
    date: { type: String },
    remarks: { type: String }
  }],
  destination_arrival_date: { type: String, trim: true },
  destination_customs_clearance_date: { type: String, trim: true },
  final_delivery_date: { type: String, trim: true },

  ////////////////////////////////////////////////// Charges and Financial
  // Note: exportChargesSchema needs to be defined separately
  export_charges: [exportChargesSchema],
  
  // Freight Charges
  ocean_freight: { type: String, trim: true },
  air_freight: { type: String, trim: true },
  inland_transportation: { type: String, trim: true },
  
  // Handling Charges
  origin_handling_charges: { type: String, trim: true },
  destination_handling_charges: { type: String, trim: true },
  documentation_charges: { type: String, trim: true },
  customs_clearance_charges: { type: String, trim: true },
  
  // Other Charges
  warehouse_charges: { type: String, trim: true },
  stuffing_charges: { type: String, trim: true },
  weighment_charges: { type: String, trim: true },
  survey_charges: { type: String, trim: true },
  fumigation_charges: { type: String, trim: true },
  
  // Total Calculations
  total_freight_charges: { type: String, trim: true },
  total_other_charges: { type: String, trim: true },
  total_charges: { type: String, trim: true },

  ////////////////////////////////////////////////// Agent Information
  freight_forwarder_name: { type: String, trim: true },
  freight_forwarder_code: { type: String, trim: true },
  freight_forwarder_contact_person: { type: String, trim: true },
  freight_forwarder_phone: { type: String, trim: true },
  freight_forwarder_email: { type: String, trim: true },
  
  customs_broker_name: { type: String, trim: true },
  customs_broker_license: { type: String, trim: true },
  customs_broker_contact_person: { type: String, trim: true },
  customs_broker_phone: { type: String, trim: true },
  customs_broker_email: { type: String, trim: true },
  
  origin_agent_name: { type: String, trim: true },
  origin_agent_contact_person: { type: String, trim: true },
  origin_agent_phone: { type: String, trim: true },
  origin_agent_email: { type: String, trim: true },
  
  destination_agent_name: { type: String, trim: true },
  destination_agent_contact_person: { type: String, trim: true },
  destination_agent_phone: { type: String, trim: true },
  destination_agent_email: { type: String, trim: true },

  ////////////////////////////////////////////////// Quality Control
  pre_shipment_inspection_required: { type: Boolean, default: false },
  inspection_agency: { type: String, trim: true },
  inspection_date: { type: String, trim: true },
  inspection_certificate_number: { type: String, trim: true },
  inspection_report: [{ type: String, trim: true }],
  
  quality_control_passed: { type: Boolean, default: false },
  quality_control_date: { type: String, trim: true },
  quality_control_remarks: { type: String, trim: true },
  
  quantity_verification_done: { type: Boolean, default: false },
  quantity_verification_date: { type: String, trim: true },
  weight_verification_done: { type: Boolean, default: false },
  weight_verification_date: { type: String, trim: true },

  ////////////////////////////////////////////////// Communication & Queries
  export_queries: [{
    query: { type: String },
    module: { type: String },
    raised_by: { type: String },
    assigned_to: { type: String },
    reply: { type: String },
    replied_by: { type: String },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
    created_date: { type: String },
    resolved_date: { type: String },
    resolved: { type: Boolean, default: false }
  }],
  
  documentation_queries: [{
    query: { type: String },
    reply: { type: String },
    resolved: { type: Boolean, default: false },
    raised_by: { type: String },
    resolved_by: { type: String },
    created_date: { type: String },
    resolved_date: { type: String }
  }],
  
  customs_queries: [{
    query: { type: String },
    customs_officer: { type: String },
    reply: { type: String },
    resolved: { type: Boolean, default: false },
    query_date: { type: String },
    resolved_date: { type: String }
  }],

  ////////////////////////////////////////////////// Special Requirements
  // Temperature Controlled
  temperature_controlled: { type: Boolean, default: false },
  temperature_range_min: { type: String, trim: true },
  temperature_range_max: { type: String, trim: true },
  temperature_unit: { type: String, trim: true, enum: ['Celsius', 'Fahrenheit'] },
  
  // Hazardous Materials
  hazardous_material: { type: Boolean, default: false },
  hazmat_class: { type: String, trim: true },
  hazmat_packing_group: { type: String, trim: true },
  hazmat_flash_point: { type: String, trim: true },
  
  // High Value Cargo
  high_value_cargo: { type: Boolean, default: false },
  declared_value_for_carriage: { type: String, trim: true },
  declared_value_for_customs: { type: String, trim: true },
  
  // Oversized Cargo
  oversized_cargo: { type: Boolean, default: false },
  special_equipment_required: { type: String, trim: true },
  special_handling_instructions: { type: String, trim: true },

  ////////////////////////////////////////////////// Compliance Checklist
  export_compliance_checklist: [{
    item: { type: String },
    required: { type: Boolean, default: true },
    completed: { type: Boolean, default: false },
    completion_date: { type: String },
    completed_by: { type: String },
    remarks: { type: String }
  }],
  
  document_checklist_verified: { type: Boolean, default: false },
  document_checklist_verified_date: { type: String, trim: true },
  document_checklist_verified_by: { type: String, trim: true },
  
  ready_for_shipment: { type: Boolean, default: false },
  ready_for_shipment_date: { type: String, trim: true },
  ready_for_shipment_approved_by: { type: String, trim: true },

  ////////////////////////////////////////////////// Additional Information
  remarks: { type: String, trim: true },
  internal_notes: { type: String, trim: true },
  customer_instructions: { type: String, trim: true },
  special_requirements: { type: String, trim: true },
  
  // Job Assignment
  job_owner: { type: String, trim: true },
  assigned_documentation_executive: { type: String, trim: true },
  assigned_operations_executive: { type: String, trim: true },
  assigned_accounts_executive: { type: String, trim: true },
  
  // Completion Status
  documentation_completed: { type: Boolean, default: false },
  documentation_completed_date: { type: String, trim: true },
  operations_completed: { type: Boolean, default: false },
  operations_completed_date: { type: String, trim: true },
  accounts_completed: { type: Boolean, default: false },
  accounts_completed_date: { type: String, trim: true },
  job_completed: { type: Boolean, default: false },
  job_completed_date: { type: String, trim: true },


 job_no: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true
  },
  jobReceivedOn: { type: Date, default: Date.now },
  sbNo: String, // Shipping Bill Number
  
  // Filing Information
  filingMode: { 
    type: String,
    ref: 'Directory', // Reference to exporter company
    required: true
  },
  transportMode: { 
    type: String,
    enum: ['Sea', 'Air', 'Land', 'Post', 'Rail'],
    default: 'Sea'
  },
  customHouse: { 
    type: String,
    ref: 'EDILocation',
    required: true
  },
  loadingPort: { 
    type: String,
    ref: 'Port',
    required: true
  },
  sbType: { 
    type: String,
    enum: ['Green - Drawback', 'Yellow', 'Red', 'Blue'],
    default: 'Green - Drawback'
  },
  consignmentType: { 
    type: String,
    enum: ['FCL', 'LCL', 'Break Bulk'],
    default: 'FCL'
  },
  jobOwner: String, // User who created the job
  
  // Job Status and Tracking
// Add proper validations
jobStatus: { 
  type: String,
  enum: {
    values: ['Draft', 'In Progress', 'Filed', 'Completed', 'Cancelled'],
    message: '{VALUE} is not a valid job status'
  },
  default: 'Draft',
  required: true,
  index: true
},

// Add string length limits
remarks: { 
  type: String, 
  trim: true,
  maxlength: [1000, 'Remarks cannot exceed 1000 characters']
},
  jobTrackingCompleted: { type: Boolean, default: false },
  jobCompletedDate: Date,
  customerRemark: String,
  
  // Workflow Information
  workflow: {
    location: { 
      type: String,
      enum: ['All Locations', 'Mumbai', 'Delhi', 'Chennai', 'Kolkata'],
      default: 'All Locations'
    },
    shipmentType: { 
      type: String,
      enum: ['Domestic', 'International'],
      default: 'International'
    }
  },
  
  // Multiple Invoices
  invoices: [invoiceSchema],
  
  // Shipping Details
  shippingDetails: shippingDetailsSchema,
  
  // Container Details
  containers: [containerDetailsSchema],
  
  // Buyer and Third Party Information
  buyerThirdPartyInfo: buyerThirdPartySchema,
  
  // Export Bond Details
  exportBondDetails: {
    qCertNoDate: String,
    typeOfShipment: { 
      type: String,
      enum: ['Outright Sale', 'Consignment', 'Free Sample', 'Replacement'],
      default: 'Outright Sale'
    },
    specifyIfOther: String,
    permissionNoDate: String,
    exportUnder: { 
      type: String,
      enum: ['EPCG', 'Advance License', 'DFRC', 'Other'],
      default: 'Other'
    },
    sbHeading: String,
    textToBePrintedOnSB: String,
    exportTradeControl: String
  },
  
  // ARE Details
  areDetails: [areDetailsSchema],
  
  // Other Information
  otherInfo: {
    exportContractNoDate: String,
    natureOfPayment: { 
      type: String,
      enum: ['Letter Of Credit', 'Advance Payment', 'Open Account', 'Consignment'],
      default: 'Letter Of Credit'
    },
    paymentPeriod: { type: Number, default: 0 }, // in days
    
    // AEO Details (use from directory if available)
    aeoCode: String,
    aeoCountry: { type: String, ref: 'Country', default: 'IN' },
    aeoRole: String
  },
  
  // DOC Info (Deemed Export/Special Economic Zone)
  docInfo: {
    eximCode: { 
      type: String,
      enum: ['19 : Drawback (DBK)', 'Other'],
      default: '19 : Drawback (DBK)'
    },
    nfeiCategory: String,
    rewardItem: { type: Boolean, default: false },
    strCode: String,
    endUse: String,
    ptaFtaInfo: String,
    originDistrict: String,
    originState: { type: String, ref: 'State' },
    alternateQty: Number,
    materialCode: String,
    medicinalPlant: String,
    formulation: String,
    surfaceMaterialInContact: String,
    labGrownDiamond: String
  },
  
  // PMV Info (Price Market Value)
  pmvInfo: {
    currency: { type: String, ref: 'Currency', default: 'INR' },
    calculationMethod: { 
      type: String,
      enum: ['%age', 'Fixed Amount'],
      default: '%age'
    },
    pmvPerUnit: { type: Number, default: 211141.22 },
    totalPMV: { type: Number, default: 523841.37 }
  },
  
  // IGST & Compensation Cess Info
  igstCompensationInfo: {
    igstPaymentStatus: { 
      type: String,
      enum: ['Export Against Payment', 'LUT', 'Bond'],
      default: 'Export Against Payment'
    },
    taxableValueINR: { type: Number, default: 476500.85 },
    igstRate: { type: Number, default: 18.00 },
    igstAmountINR: { type: Number, default: 85770.96 },
    compensationCessRate: { type: Number, default: 0.00 },
    compensationCessAmountINR: { type: Number, default: 0.00 }
  },
  
  // RODTEP Info (Remission of Duties and Taxes on Exported Products)
  rodtepInfo: {
    rodtepClaim: { 
      type: String,
      enum: ['Not Applicable', 'Applicable'],
      default: 'Not Applicable'
    },
    quantity: { type: Number, default: 0.000000 },
    rateInPercentage: { type: Number, default: 0.000 },
    capValue: { type: Number, default: 0.00 },
    capValuePerUnits: { type: Number, default: 1 },
    rodtepAmountINR: { type: Number, default: 0.00 }
  },
  
  // Annex C1 Details (for EOU/SEZ units)
  annexC1Details: {
    ieCodeOfEOU: String,
    branchSerialNo: { type: Number, default: 0 },
    examinationDate: Date,
    examiningOfficer: String,
    supervisingOfficer: String,
    commissionerate: String,
    verifiedByExaminingOfficer: { type: Boolean, default: false },
    sealNumber: String,
    
    // Documents for Annex C1
    documents: [{
      serialNo: Number,
      documentName: String
    }],
    
    // Additional C1 fields
    designation: String,
    division: String,
    range: String,
    sampleForwarded: { type: Boolean, default: false }
  },
  
  // Freight, Insurance & Other Charges
  freightInsuranceCharges: {
    freight: {
      currency: { type: String, ref: 'Currency', default: 'USD' },
      exchangeRate: { type: Number, default: 87.300000 },
      rate: { type: Number, default: 0.00 },
      baseValue: { type: Number, default: 63883.17 },
      amount: { type: Number, default: 30.00 }
    },
    insurance: {
      currency: { type: String, ref: 'Currency', default: 'USD' },
      exchangeRate: { type: Number, default: 87.300000 },
      rate: { type: Number, default: 0.0000 },
      baseValue: { type: Number, default: 63883.17 },
      amount: { type: Number, default: 7.73 }
    },
    discount: {
      currency: { type: String, ref: 'Currency', default: 'USD' },
      exchangeRate: { type: Number, default: 87.300000 },
      rate: { type: Number, default: 0.00 },
      amount: { type: Number, default: 0.00 }
    },
    otherDeduction: {
      currency: { type: String, ref: 'Currency', default: 'USD' },
      exchangeRate: { type: Number, default: 87.300000 },
      rate: { type: Number, default: 0.00 },
      amount: { type: Number, default: 0.00 }
    },
    commission: {
      currency: { type: String, ref: 'Currency', default: 'USD' },
      exchangeRate: { type: Number, default: 87.300000 },
      rate: { type: Number, default: 0.00 },
      amount: { type: Number, default: 0.00 }
    },
    fobValue: {
      currency: { type: String, ref: 'Currency', default: 'USD' },
      amount: { type: Number, default: 63845.44 }
    }
  },
  
  // Exchange Rates
  exchangeRates: [exchangeRateSchema],
  
  // Charges and Billing
  charges: [chargeSchema],
  
  // Payment Requests
  paymentRequests: [paymentRequestSchema],
  
  // AR/AP Invoices
  arInvoices: [{
    date: Date,
    billNo: String,
    type: String,
    organization: { type: String, ref: 'Directory' },
    currency: { type: String, ref: 'Currency' },
    amount: Number,
    balance: Number,
    vendorBillNo: String
  }],
  
  apInvoices: [{
    date: Date,
    billNo: String,
    type: String,
    organization: { type: String, ref: 'Directory' },
    currency: { type: String, ref: 'Currency' },
    amount: Number,
    balance: Number
  }],
  
  // Document Management
  documents: [documentSchema],
  
  // eSanchit Documents
  eSanchitDocuments: [eSanchitDocumentSchema],
  
  // Milestone Tracking
  milestones: [milestoneSchema],
  
  // System Fields
  createdBy: { type: String, required: true },
  updatedBy: String,
  
  // History/Audit Trail
  history: [{
    action: String,
    user: String,
    timestamp: { type: Date, default: Date.now },
    changes: Schema.Types.Mixed,
    remarks: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
// Remove redundant indexes and add compound indexes
exportJobSchema.index({ jobNumber: 1 }, { unique: true });
exportJobSchema.index({ filingMode: 1, jobStatus: 1 }); // Compound index
exportJobSchema.index({ jobDate: -1, customHouse: 1 }); // Common query pattern
exportJobSchema.index({ createdAt: -1 }); // For recent jobs
exportJobSchema.index({ 'invoices.invoiceNumber': 1 }, { sparse: true });


// Virtual fields
exportJobSchema.virtual('totalInvoiceValue').get(function() {
  return this.invoices.reduce((total, invoice) => total + invoice.invoiceValue, 0);
});

exportJobSchema.virtual('totalCharges').get(function() {
  return this.charges.reduce((total, charge) => total + charge.revenue.amount, 0);
});

exportJobSchema.virtual('isCompleted').get(function() {
  return this.jobStatus === 'Completed';
});

// Pre-save middleware
exportJobSchema.pre('save', function(next) {
  if (this.isNew) {
    this.jobReceivedOn = this.jobReceivedOn || new Date();
  }
  this.updatedBy = this.modifiedPaths().length > 0 ? 'system' : this.updatedBy;
  next();
});

// Methods
exportJobSchema.methods.addMilestone = function(milestoneName, planDate, actualDate = null) {
  this.milestones.push({
    milestoneName,
    planDate,
    actualDate,
    status: actualDate ? 'Completed' : 'Pending'
  });
  return this.save();
};

exportJobSchema.methods.updateMilestone = function(milestoneName, actualDate) {
  const milestone = this.milestones.find(m => m.milestoneName === milestoneName);
  if (milestone) {
    milestone.actualDate = actualDate;
    milestone.status = 'Completed';
  }
  return this.save();
};

exportJobSchema.methods.addCharge = function(chargeDetails) {
  this.charges.push(chargeDetails);
  return this.save();
};

// Static methods
exportJobSchema.statics.findByJobNumber = function(jobNumber) {
  return this.findOne({ jobNumber: jobNumber.toUpperCase() });
};

exportJobSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    jobDate: {
      $gte: startDate,
      $lte: endDate
    }
  });
};

exportJobSchema.statics.findByStatus = function(status) {
  return this.find({ jobStatus: status });
};

// Create and export the model
const ExJobModel = mongoose.model("ExportJob", exportJobSchema);
export default ExJobModel;

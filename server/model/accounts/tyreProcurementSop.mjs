import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const statusEnum = [
  "Draft",
  "PR Raised",
  "Preparing for Quotation",
  "Quotation Received",
  "Finance Approved",
  "Payment Done",
  "Order Placed",
  "GRN Done",
  "Closed",
];

// ─── Stage 1 ───
const tyreItemSchema = new mongoose.Schema(
  {
    sNo: { type: Number, default: 1 },
    tyreType: { type: String, default: "New Tyre" }, // New Tyre / Remould Tyre
    brandPreference: String,
    sizeSpec: String,
    loadRating: String,
    rimSize: String,
    qty: { type: Number, default: 0 },
    estUnitCost: { type: Number, default: 0 },
    estTotal: { type: Number, default: 0 },
  },
  { _id: true }
);

const routingChecklistSchema = new mongoose.Schema(
  {
    step: String,
    action: String,
    responsible: String,
    date: Date,
    status: { type: String, enum: ["Pending", "Done", ""], default: "" },
  },
  { _id: true }
);

const stage1Schema = new mongoose.Schema(
  {
    prNumber: String,
    prDate: Date,
    preparedBy: String,
    contactNumber: String,
    departmentLocation: String,
    neededByDate: Date,
    hodValidation: {
      validatedBy: String,
      designation: String,
      approvalMode: { type: String, enum: ["WhatsApp", "Phone Call", "Email", "In-Person", ""], default: "" },
      dateTimeOfApproval: Date,
      hodSignature: String,
    },
    itemsRequired: { type: [tyreItemSchema], default: [] },
    estimatedTotalCost: { type: Number, default: 0 },
    specificationDetails: String,
    preferredSupplier: String,
    supplierContact: String,
    currentStockNew: { type: Number, default: 0 },
    currentStockUsedRemould: { type: Number, default: 0 },
    comments: String,
    routingChecklist: { type: [routingChecklistSchema], default: [] },
  },
  { _id: false }
);

// ─── Stage 2 ───
const supplierQuoteSchema = new mongoose.Schema(
  {
    supplierName: String,
    contactPerson: String,
    phoneNumber: String,
    emailWhatsApp: String,
    gstNumber: String,
    selectedTyreType: String,
    bankAccountNo: String,
    bankName: String,
    bankIfscCode: String,
    bankBranchCode: String,
    supplierNameInBank: String,
    tyreBrand: String,
    sizeSpecification: String,
    unitPriceNew: { type: Number, default: 0 },
    unitPriceRemould: { type: Number, default: 0 },
    qtyAvailable: { type: Number, default: 0 },
    freightCharges: { type: Number, default: 0 },
    deliveryTimeline: String,
    deliveryLocation: String,
    warrantyGuarantee: String,
    paymentTerms: String,
    discountOffered: { type: Number, default: 0 },
    remarks: String,
  },
  { _id: true }
);

const selectedSupplierSchema = new mongoose.Schema(
  {
    selectedSupplier: String,
    priceQuoted: { type: Number, default: 0 },
    totalOrderValue: { type: Number, default: 0 },
    reasonForSelection: String,
  },
  { _id: true }
);

const stage2Schema = new mongoose.Schema(
  {
    prNumber: String,
    poNumber: String,
    purchaseOfficerName: String,
    poDate: Date,
    suppliers: { type: [supplierQuoteSchema], default: [] },
    selectedSupplierL1: String,
    l1PriceQuoted: { type: Number, default: 0 },
    reasonForSelection: String,
    totalOrderValue: { type: Number, default: 0 },
    selectedSuppliers: { type: [selectedSupplierSchema], default: [] },
    declaration: String,
    routingChecklist: { type: [routingChecklistSchema], default: [] },
  },
  { _id: false }
);

// ─── Stage 3 ───
const stage3Schema = new mongoose.Schema(
  {
    poNumber: String,
    poDate: Date,
    selectedSupplierL1: String,
    totalOrderValue: { type: Number, default: 0 },
    purchaseOfficerName: String,
    dateReceivedByFinance: Date,
    reviewChecklist: {
      budgetAvailable: { type: String, enum: ["Yes", "No", ""], default: "" },
      priceReasonable: { type: String, enum: ["Yes", "No", ""], default: "" },
      gstVerified: { type: String, enum: ["Yes", "No", ""], default: "" },
      paymentTermsAccepted: { type: String, enum: ["Yes", "No", ""], default: "" },
      docsAttached: { type: String, enum: ["Yes", "No", ""], default: "" },
    },
    decision: {
      decision: { type: String, enum: ["APPROVED", "REJECTED", "On Hold", ""], default: "" },
      remarksRejectionReason: String,
    },
    signOff: {
      financeManagerName: String,
      dateOfApproval: Date,
      signatureDigitalApprovalRef: String,
      timeOfApproval: String,
    },
  },
  { _id: false }
);

// ─── Stage 4 ───
const supplierPaymentSchema = new mongoose.Schema(
  {
    supplierName: String,
    paymentTerms: String,
    paymentMethod: String,
    utrNumber: String,
    paymentDate: Date,
    isPaid: { type: Boolean, default: false },
    creditDays: { type: Number, default: 0 },
    dueDate: Date,
  },
  { _id: true }
);

const stage4Schema = new mongoose.Schema(
  {
    poNumberDate: String,
    financeApprovalDate: Date,
    supplierName: String,
    totalPaymentAmount: { type: Number, default: 0 },
    supplierBankDetails: {
      accountName: String,
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      accountType: String,
      branch: String,
      upiVpa: String,
    },
    supplierPayments: { type: [supplierPaymentSchema], default: [] },
    paymentDetails: {
      paymentMethod: String,
      paymentDate: Date,
      amountPaid: { type: Number, default: 0 },
      paymentReferenceUtr: String,
      bankAppUsed: String,
      timeOfTransfer: String,
    },
    accountingSignOff: {
      processedByName: String,
      designation: String,
      signatureApprovalRef: String,
      dateConfirmed: Date,
    },
    utrSharing: {
      utrSharedWithPoOn: Date,
      modeOfSharing: String,
    },
  },
  { _id: false }
);

// ─── Stage 5 ───
const supplierDispatchSchema = new mongoose.Schema(
  {
    supplierName: String,
    utrNumber: String,
    orderPlacedBy: String,
    orderPlacedDate: Date,
    orderConfirmation: String,
    modeOfConfirmation: String,
    dispatchDetails: {
      dispatchDate: Date,
      expectedDeliveryDate: Date,
      vehicleNumber: String,
      transporterName: String,
      driverName: String,
      driverContactNumber: String,
      dcNumber: String,
      lrNumber: String,
      invoiceNumber: String,
      invoiceAmount: { type: Number, default: 0 },
      deliveryLocationSite: String,
      noOfTyresDispatched: { type: Number, default: 0 },
    },
  },
  { _id: true }
);

const stage5Schema = new mongoose.Schema(
  {
    prNumber: String,
    poNumber: String,
    supplierName: String,
    utrNumber: String,
    orderPlacedBy: String,
    orderPlacedDate: Date,
    orderConfirmation: String,
    modeOfConfirmation: String,
    dispatchDetails: {
      dispatchDate: Date,
      expectedDeliveryDate: Date,
      vehicleNumber: String,
      transporterName: String,
      driverName: String,
      driverContactNumber: String,
      dcNumber: String,
      lrNumber: String,
      invoiceNumber: String,
      invoiceAmount: { type: Number, default: 0 },
      deliveryLocationSite: String,
      noOfTyresDispatched: { type: Number, default: 0 },
    },
    supplierDispatches: { type: [supplierDispatchSchema], default: [] },
    remarks: String,
  },
  { _id: false }
);

// ─── Stage 6 ───
const grnTyreItemSchema = new mongoose.Schema(
  {
    sNo: { type: Number, default: 1 },
    tyreNumber: String,
    tyreBrand: String,
    sizeSpec: String,
    type: { type: String, default: "New" }, // New / Remould
    hotStampDone: { type: String, enum: ["Yes", "No", ""], default: "" },
    photoTaken: { type: String, enum: ["Yes", "No", ""], default: "" },
    acceptedRejected: { type: String, enum: ["Accepted", "Rejected", ""], default: "" },
    remarks: String,
  },
  { _id: true }
);

const approvalSchema = new mongoose.Schema(
  {
    role: String,
    name: String,
    date: Date,
    signature: String,
  },
  { _id: true }
);

const stage6Schema = new mongoose.Schema(
  {
    grnSeriesNo: String,
    dateOfReceipt: Date,
    prNumber: String,
    poNumber: String,
    supplierName: String,
    supplierContactNo: String,
    deliveryNoteDcNo: String,
    lrNumber: String,
    vehicleNumber: String,
    deliveryLocation: String,
    itemsReceived: { type: [grnTyreItemSchema], default: [] },
    qualityConformanceCheck: {
      tyresVerified: { type: String, enum: ["Yes", "No", ""], default: "" },
      tyreNumbersMatched: { type: String, enum: ["Yes", "No", ""], default: "" },
      hotStampingCompleted: { type: String, enum: ["Yes", "No", ""], default: "" },
      photosTaken: { type: String, enum: ["Yes", "No", ""], default: "" },
      invoiceVerified: { type: String, enum: ["Yes", "No", ""], default: "" },
      returnClauseReviewed: { type: String, enum: ["Yes", "No", ""], default: "" },
    },
    inspectionNotes: String,
    approvals: { type: [approvalSchema], default: [] },
  },
  { _id: false }
);

// ─── Main Schema ───
const tyreProcurementSopSchema = new mongoose.Schema(
  {
    prNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    poNumber: String,
    status: {
      type: String,
      enum: statusEnum,
      default: "Draft",
    },
    stage1: { type: stage1Schema, default: () => ({}) },
    stage2: { type: stage2Schema, default: () => ({}) },
    stage3: { type: stage3Schema, default: () => ({}) },
    stage4: { type: stage4Schema, default: () => ({}) },
    stage5: { type: stage5Schema, default: () => ({}) },
    stage6: { type: stage6Schema, default: () => ({}) },
  },
  { timestamps: true }
);

tyreProcurementSopSchema.plugin(auditPlugin, { documentType: "TyreProcurementSop" });

const TyreProcurementSopModel = mongoose.model(
  "TyreProcurementSop",
  tyreProcurementSopSchema
);
export default TyreProcurementSopModel;

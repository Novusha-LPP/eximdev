import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

export const statusEnum = [
  "Draft",
  "HoD Approval Pending",
  "HoD Validated",
  "Pending Purchase Action",
  "PR Raised",
  "Preparing for Quotation",
  "Quotation Received",
  "Quotation Updated",
  "Finance Approved",
  "Payment Done",
  "Order Placed",
  "Dispatched",
  "Dispatched / Site GRN Ready",
  "GRN Ready",
  "GRN Received",
  "GRN Completed",
  "GRN Done",
  "Closed",
];

export const statusEnumMap = statusEnum.reduce((acc, s) => {
  acc[s.toUpperCase()] = s;
  return acc;
}, {
  DRAFT: "Draft",
});

const attachmentSchema = new mongoose.Schema(
  {
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ─── Stage 1 ───
const tyreItemSchema = new mongoose.Schema(
  {
    sNo: { type: Number, default: 1 },
    productName: { type: String, default: "" }, // Generic product name (e.g. Paper, Ink, Printer, Tyre, etc.)
    tyreType: { type: String, default: "" }, // Kept for backward compatibility
    brandPreference: String,
    sizeSpec: String,
    loadRating: String,
    rimSize: String,
    qty: { type: Number, default: 0 },
    estUnitCost: { type: Number, default: 0 },
    estTotal: { type: Number, default: 0 },
    tyreCategory: { type: String, default: "" }, // PR-2: New Nylon Tyre, New Radial Tyre, Remould Nylon Tyre, Remould Radial Tyre, New China Tyre
    isCancelled: { type: Boolean, default: false }, // PR-7: Cancel item post-payment
    cancelledAt: Date,
    cancelledBy: String,
    cancellationReason: String,
  },
  { _id: true }
);

const routingChecklistSchema = new mongoose.Schema(
  {
    step: String,
    action: String,
    responsible: String,
    date: Date,
    status: { type: String, enum: ["Pending", "Done", "In Progress", "PENDING", "DONE", "IN PROGRESS", ""], default: "" },
  },
  { _id: true }
);

const stage1Schema = new mongoose.Schema(
  {
    companyKey: { type: String, default: "SRCC" },
    companyShortName: { type: String, default: "SRCC" },
    companyName: { type: String, default: "S R CONTAINER CARRIERS" },
    buyerAddress: String,
    buyerGstin: String,
    buyerEmail: String,
    buyerPhone: String,
    poFormatStyle: { type: String, default: "standard" },
    prNumber: String,
    prDate: Date,
    preparedBy: String,
    contactNumber: String,
    departmentLocation: String,
    deliveryLocation: String,
    deliveryContactPerson: String,
    deliveryContactNumber: String,
    neededByDate: Date,
    checkedBy: { type: String, default: "MOHIT SINGH" },
    checkedByDesignation: { type: String, default: "CEO" },
    hodValidation: {
      validatedBy: { type: String, default: "MOHIT SINGH" },
      designation: { type: String, default: "CEO" },
      approvalMode: { type: String, enum: ["WhatsApp", "Phone Call", "Email", "In-Person", "WHATSAPP", "PHONE CALL", "EMAIL", "IN-PERSON", ""], default: "" },
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
    attachments: { type: [attachmentSchema], default: [] },
    additionalInformation: { type: String, default: "" },
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
    supplierAddress: String,
    address: String,
    selectedTyreType: String,
    selectedProduct: String,
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
    deliveryContact: String,
    warrantyGuarantee: String,
    paymentTerms: String,
    discountOffered: { type: Number, default: 0 },
    gstRate: { type: String, default: "" },
    gstAmount: { type: Number, default: 0 },
    remarks: String,
  },
  { _id: true }
);

const selectedSupplierSchema = new mongoose.Schema(
  {
    selectedSupplier: String,
    poNumber: String,
    contactPerson: String,
    supplierAddress: String,
    address: String,
    deliveryLocation: String,
    deliveryContact: String,
    priceQuoted: { type: Number, default: 0 },
    totalOrderValue: { type: Number, default: 0 },
    allocatedQty: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
    gstRate: { type: String, default: "" },
    gstAmount: { type: Number, default: 0 },
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
    checkedBy: { type: String, default: "MOHIT SINGH" },
    checkedByDesignation: { type: String, default: "CEO" },
    deliveryLocation: String,
    deliveryContactPerson: String,
    deliveryContactNumber: String,
    suppliers: { type: [supplierQuoteSchema], default: [] },
    selectedSupplierL1: String,
    l1PriceQuoted: { type: Number, default: 0 },
    reasonForSelection: String,
    totalOrderValue: { type: Number, default: 0 },
    selectedSuppliers: { type: [selectedSupplierSchema], default: [] },
    declaration: String,
    additionalRemarks: { type: String, default: "" }, // PR-5: Additional Remarks in Supplier Quotation Shown in PO
    poCreatedBy: String, // PR-4: Audit trail
    poCreatedByName: String,
    poCreatedAt: Date,
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
      budgetAvailable: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
      priceReasonable: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
      gstVerified: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
      paymentTermsAccepted: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
      docsAttached: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
    },
    decision: {
      decision: { type: String, enum: ["APPROVED", "REJECTED", "On Hold", ""], default: "" },
      remarksRejectionReason: String,
    },
    signOff: {
      financeManagerName: { type: String, default: "CHIRAG SHAH" },
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
    dispatchDone: { type: Boolean, default: false },
    isDispatchDone: { type: Boolean, default: false },
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
    dispatchDone: { type: Boolean, default: false },
    isDispatchDone: { type: Boolean, default: false },
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
    hotStampDone: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
    photoTaken: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
    acceptedRejected: { type: String, enum: ["Accepted", "Rejected", "ACCEPTED", "REJECTED", ""], default: "" },
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
    checked: { type: Boolean, default: false },
    status: { type: String, enum: ["Pending", "Done", "PENDING", "DONE", ""], default: "Pending" },
  },
  { _id: true }
);

const grnReferenceInfoSchema = new mongoose.Schema(
  {
    supplierName: String,
    supplierContactNo: String,
    deliveryNoteDcNo: String,
    lrNumber: String,
    vehicleNumber: String,
    deliveryLocation: String,
    invoiceNumber: String,
    invoiceDate: Date,
    invoiceAmount: { type: Number, default: 0 },
    // S3 URL of the uploaded supplier invoice — case-sensitive, never uppercased
    invoiceAttachment: String,
    invoiceAttachmentName: String,
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
    referenceInfos: { type: [grnReferenceInfoSchema], default: [] },
    itemsReceived: { type: [grnTyreItemSchema], default: [] },
    qualityConformanceCheck: {
      tyresVerified: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
      tyreNumbersMatched: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
      hotStampingCompleted: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
      photosTaken: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
      invoiceVerified: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
      returnClauseReviewed: { type: String, enum: ["Yes", "No", "YES", "NO", ""], default: "" },
    },
    inspectionNotes: String,
    grnCreatedBy: String, // PR-4: Audit trail
    grnCreatedByName: String,
    grnCreatedAt: Date,
    approvals: { type: [approvalSchema], default: [] },
  },
  { _id: false }
);

// ─── Main Schema ───
const tyreProcurementSopSchema = new mongoose.Schema(
  {
    companyKey: { type: String, default: "SRCC" },
    companyShortName: { type: String, default: "SRCC" },
    companyName: { type: String, default: "S R CONTAINER CARRIERS" },
    buyerAddress: String,
    buyerGstin: String,
    buyerEmail: String,
    buyerPhone: String,
    poFormatStyle: { type: String, default: "standard" },
    prNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    poNumber: String,
    checkedBy: { type: String, default: "MOHIT SINGH" },
    checkedByDesignation: { type: String, default: "CEO" },
    attachments: { type: [attachmentSchema], default: [] },
    additionalInformation: { type: String, default: "" },
    tatDays: { type: Number, default: 0 },
    createdBy: { type: String, default: "" }, // PR-4: Audit trail
    createdByName: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
    updatedByName: { type: String, default: "" },
    auditTrail: [
      {
        action: String, // "PR Created", "PO Created", "GRN Completed", "Item Cancelled", etc.
        performedBy: String,
        performedByName: String,
        timestamp: { type: Date, default: Date.now },
        details: String,
      },
    ],
    status: {
      type: String,
      set: (val) => {
        if (!val) return "Draft";
        const upper = String(val).trim().toUpperCase();
        return statusEnumMap[upper] || val;
      },
      enum: [
        ...statusEnum,
        ...statusEnum.map((s) => s.toUpperCase()),
      ],
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

tyreProcurementSopSchema.pre("validate", function (next) {
  if (this.status) {
    const upper = String(this.status).trim().toUpperCase();
    this.status = statusEnumMap[upper] || this.status;
  }
  next();
});

tyreProcurementSopSchema.plugin(auditPlugin, { documentType: "TyreProcurementSop" });

const TyreProcurementSopModel = mongoose.model(
  "TyreProcurementSop",
  tyreProcurementSopSchema
);
export default TyreProcurementSopModel;

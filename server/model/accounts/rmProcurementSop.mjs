import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const statusEnum = [
  "Draft",
  "Sales Order",
  "PR Raised",
  "Quotation Received",
  "Pricing Validated",
  "Finance Approved",
  "Payment Done",
  "Order Placed",
  "GRN Done",
  "Closed",
];

// ─── Sheet 1 ───
const productLineSchema = new mongoose.Schema(
  {
    sNo: { type: Number, default: 1 },
    productType: String,
    binSize: String,
    bottomType: { type: String, enum: ["Flat", "Ribbed", ""], default: "" },
    handleType: { type: String, enum: ["Open", "Close", ""], default: "" },
    lidRequired: { type: String, enum: ["Yes", "No", ""], default: "" },
    colour: String,
    qtyOrdered: { type: Number, default: 0 },
    estUnitWeight: { type: Number, default: 0 },
  },
  { _id: true }
);

const rmEstimateSchema = new mongoose.Schema(
  {
    rmType: String,
    grade: String,
    requiredQty: { type: Number, default: 0 },
    unit: { type: String, default: "kg" },
    currentStock: { type: Number, default: 0 },
    netRmToPurchase: { type: Number, default: 0 },
  },
  { _id: true }
);

const stage1Schema = new mongoose.Schema(
  {
    customerName: String,
    customerContactPoNo: String,
    orderDate: Date,
    requiredDeliveryDate: Date,
    salesPersonName: String,
    salesOrderRefNo: String,
    productLines: { type: [productLineSchema], default: [] },
    rmEstimates: { type: [rmEstimateSchema], default: [] },
    partitionDetails: {
      binCrateSize: String,
      noOfPartitions: String,
      partitionSize: String,
      noOfPocketPartitions: String,
      partitionMaterialColour: String,
      specialInstructions: String,
    },
    productionTimeline: {
      estProductionStartDate: Date,
      estCompletionDate: Date,
      productionHeadIntimatedOn: Date,
      rmRequiredByDate: Date,
    },
    signOff: {
      salesPersonSignatureName: String,
      salesPersonDate: Date,
      reviewedByProductionHead: String,
      productionHeadDate: Date,
    },
  },
  { _id: false }
);

// ─── Sheet 2 ───
const prMaterialSchema = new mongoose.Schema(
  {
    sNo: { type: Number, default: 1 },
    rmType: String,
    grade: String,
    requiredQty: { type: Number, default: 0 },
    unit: { type: String, default: "kg" },
    preferredSupplier: String,
    requiredCertificatesDocuments: String,
  },
  { _id: true }
);

const actionLogSchema = new mongoose.Schema(
  {
    step: Number,
    actionTask: String,
    responsiblePerson: String,
    dateTime: Date,
    status: { type: String, enum: ["Pending", "Done", ""], default: "" },
  },
  { _id: true }
);

const stage2Schema = new mongoose.Schema(
  {
    prNumber: String,
    prDate: Date,
    raisedBy: String,
    contactNumber: String,
    salesOrderRefNo: String,
    rmRequiredByDate: Date,
    rawMaterials: { type: [prMaterialSchema], default: [] },
    binProductReference: {
      binCrateTypesRequired: String,
      totalProductionQuantity: String,
      totalEstimatedRmWeight: String,
    },
    productionHeadApproval: {
      productionHeadName: String,
      approvalDate: Date,
      approvalDecision: { type: String, enum: ["APPROVED", "REJECTED", ""], default: "" },
      remarks: String,
      signatureApprovalMode: String,
    },
    actionLog: { type: [actionLogSchema], default: [] },
  },
  { _id: false }
);

// ─── Sheet 3 ───
const supplierItemSchema = new mongoose.Schema(
  {
    supplierName: String,
    contactPerson: String,
    phone: String,
    email: String,
    gstNumber: String,
    virginHdpe: {
      ratePerKg: { type: Number, default: 0 },
      qtyAvailable: { type: Number, default: 0 },
      brandOrigin: String,
      certificatesProvided: String,
    },
    rhdpe: {
      ratePerKg: { type: Number, default: 0 },
      materialQualityDeclarationProvided: { type: String, enum: ["Yes", "No", ""], default: "" },
    },
    colourMasterbatch: {
      ratePerKg: { type: Number, default: 0 },
      tdsProvided: { type: String, enum: ["Yes", "No", ""], default: "" },
    },
    uvMasterbatch: {
      ratePerKg: { type: Number, default: 0 },
      tdsProvided: { type: String, enum: ["Yes", "No", ""], default: "" },
    },
    general: {
      paymentTerms: String,
      deliveryTimeline: String,
      minimumOrderQuantity: String,
      discountSpecialOffer: String,
      remarks: String,
    },
  },
  { _id: true }
);

const stage3Schema = new mongoose.Schema(
  {
    prNumber: String,
    comparisonDate: Date,
    purchaseOfficerName: String,
    contactNumber: String,
    suppliers: { type: [supplierItemSchema], default: [] },
    selectedSupplierL1: String,
    l1OverallRate: { type: Number, default: 0 },
    reasonForSelection: String,
    estTotalOrderValue: { type: Number, default: 0 },
    documentsVerified: {
      coa: { type: Boolean, default: false },
      msds: { type: Boolean, default: false },
      mfgCert: { type: Boolean, default: false },
      materialQualityDecl: { type: Boolean, default: false },
      tdsCm: { type: Boolean, default: false },
      tdsUv: { type: Boolean, default: false },
    },
    declaration: String,
    actionLog: { type: [actionLogSchema], default: [] },
  },
  { _id: false }
);

// ─── Sheet 4 ───
const rateValidationSchema = new mongoose.Schema(
  {
    rmType: String,
    l1QuotedRate: { type: Number, default: 0 },
    marketRate: { type: Number, default: 0 },
    acceptable: { type: String, enum: ["Yes", "No", ""], default: "" },
    remarks: String,
  },
  { _id: true }
);

const stage4Schema = new mongoose.Schema(
  {
    prNumber: String,
    dateReceivedFromPo: Date,
    selectedSupplierL1: String,
    totalOrderValue: { type: Number, default: 0 },
    pricingTeamMember: String,
    validationDate: Date,
    rateValidations: { type: [rateValidationSchema], default: [] },
    overallChecklist: {
      last3PoRatesCompared: { type: String, enum: ["Yes", "No", ""], default: "" },
      marketBenchmarkVerified: { type: String, enum: ["Yes", "No", ""], default: "" },
      rmDocumentsAttachedVerified: { type: String, enum: ["Yes", "No", ""], default: "" },
      supplierGstCredentialsChecked: { type: String, enum: ["Yes", "No", ""], default: "" },
      noAbnormalDeviation: { type: String, enum: ["Yes", "No", ""], default: "" },
    },
    decision: {
      validationResult: { type: String, enum: ["VALIDATED", "QUERY RAISED", ""], default: "" },
      remarks: String,
      validatedBy: String,
      signatureDate: Date,
    },
    actionLog: { type: [actionLogSchema], default: [] },
  },
  { _id: false }
);

// ─── Sheet 5 ───
const stage5Schema = new mongoose.Schema(
  {
    prNumber: String,
    pricingValidationDate: Date,
    selectedSupplierL1: String,
    totalOrderValue: { type: Number, default: 0 },
    purchaseOfficerName: String,
    dateReceivedByFinance: Date,
    reviewChecklist: {
      budgetAvailable: { type: String, enum: ["Yes", "No", ""], default: "" },
      pricingValidationAttached: { type: String, enum: ["Yes", "No", ""], default: "" },
      l1RateWithinBudget: { type: String, enum: ["Yes", "No", ""], default: "" },
      supplierGstVerified: { type: String, enum: ["Yes", "No", ""], default: "" },
      paymentTermsAcceptable: { type: String, enum: ["Yes", "No", ""], default: "" },
      supportingDocumentsComplete: { type: String, enum: ["Yes", "No", ""], default: "" },
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
    actionLog: { type: [actionLogSchema], default: [] },
  },
  { _id: false }
);

// ─── Sheet 6 ───
const stage6Schema = new mongoose.Schema(
  {
    prNumber: String,
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
    paymentDetails: {
      paymentMethod: String,
      paymentDate: Date,
      amountPaid: { type: Number, default: 0 },
      utrReferenceNo: String,
      bankPlatformUsed: String,
      timeOfTransfer: String,
    },
    accountingSignOff: {
      processedByName: String,
      designation: String,
      signatureApprovalRef: String,
      dateConfirmed: Date,
    },
    utrIntimation: {
      utrSharedWithPurchaseOfficerOn: Date,
      modeOfSharing: String,
    },
    actionLog: { type: [actionLogSchema], default: [] },
  },
  { _id: false }
);

// ─── Sheet 7 ───
const followUpLogSchema = new mongoose.Schema(
  {
    date: Date,
    followUpMode: String,
    personSpokenTo: String,
    supplierUpdateCommitment: String,
    nextFollowUpDate: Date,
  },
  { _id: true }
);

const rmDispatchBreakdownSchema = new mongoose.Schema(
  {
    rmType: String,
    grade: String,
    qtyDispatchedKg: { type: Number, default: 0 },
    noOfBags: String,
    batchNo: String,
    remarks: String,
  },
  { _id: true }
);

const stage7Schema = new mongoose.Schema(
  {
    prNumber: String,
    utrPaymentReference: String,
    supplierName: String,
    supplierContactNo: String,
    orderPlacedBy: String,
    orderPlacedDate: Date,
    supplierOrderConfirmationRef: String,
    confirmationMode: String,
    followUpLog: { type: [followUpLogSchema], default: [] },
    dispatchDetails: {
      dispatchDate: Date,
      expectedDeliveryDate: Date,
      pickUpLoadingLocation: String,
      deliveryLocation: String,
      lrNumber: String,
      dcNumber: String,
      invoiceNumber: String,
      invoiceAmount: { type: Number, default: 0 },
      transportCompanyName: String,
      transporterContactNo: String,
      driverName: String,
      driverContactNumber: String,
      vehicleNumber: String,
      noOfBagsPackagesDispatched: String,
      totalWeightDispatchedKg: { type: Number, default: 0 },
      materialTrackingEWayBillNo: String,
    },
    rmDispatchBreakdown: { type: [rmDispatchBreakdownSchema], default: [] },
  },
  { _id: false }
);

// ─── Sheet 8 ───
const rmReceiptInspectionSchema = new mongoose.Schema(
  {
    rmType: String,
    grade: String,
    orderedQty: { type: Number, default: 0 },
    receivedQty: { type: Number, default: 0 },
    physicalCondition: { type: String, enum: ["OK", "Damaged", ""], default: "" },
    documentsReceived: {
      coa: { type: Boolean, default: false },
      tds: { type: Boolean, default: false },
      mqd: { type: Boolean, default: false },
    },
    acceptedRejected: { type: String, enum: ["Accepted", "Rejected", ""], default: "" },
    batchLotNo: String,
  },
  { _id: true }
);

const approvalSchema = new mongoose.Schema(
  {
    role: String,
    name: String,
    signature: String,
    date: Date,
    status: { type: String, enum: ["GRN Done", "PR Closed", ""], default: "" },
  },
  { _id: true }
);

const stage8Schema = new mongoose.Schema(
  {
    grnNumber: String,
    dateOfReceipt: Date,
    prNumber: String,
    poOrderReferenceNo: String,
    supplierName: String,
    supplierContactNo: String,
    lrDcNumber: String,
    invoiceNumber: String,
    vehicleNumber: String,
    noOfBagsPackagesReceived: String,
    rmReceiptInspection: { type: [rmReceiptInspectionSchema], default: [] },
    documentChecklist: {
      virginHdpeCoa: { type: String, enum: ["Yes", "No", ""], default: "" },
      virginHdpeMsds: { type: String, enum: ["Yes", "No", ""], default: "" },
      virginHdpeMfgCert: { type: String, enum: ["Yes", "No", ""], default: "" },
      virginHdpeTestReport: { type: String, enum: ["Yes", "No", ""], default: "" },
      rhdpeMqd: { type: String, enum: ["Yes", "No", ""], default: "" },
      colourMasterbatchTds: { type: String, enum: ["Yes", "No", ""], default: "" },
      uvMasterbatchTds: { type: String, enum: ["Yes", "No", ""], default: "" },
      invoiceMatchesPo: { type: String, enum: ["Yes", "No", ""], default: "" },
      eWayBillReceived: { type: String, enum: ["Yes", "No", ""], default: "" },
    },
    qualityInspectionNotes: String,
    returnRejectionNote: {
      rmToBeReturnedRejected: String,
      actionTakenSupplierNotifiedOn: Date,
      creditReplacementExpectedBy: Date,
    },
    approvals: { type: [approvalSchema], default: [] },
  },
  { _id: false }
);

// ─── Main Schema ───
const rmProcurementSopSchema = new mongoose.Schema(
  {
    prNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    salesOrderRefNo: String,
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
    stage7: { type: stage7Schema, default: () => ({}) },
    stage8: { type: stage8Schema, default: () => ({}) },
  },
  { timestamps: true }
);

rmProcurementSopSchema.plugin(auditPlugin, { documentType: "RmProcurementSop" });

const RmProcurementSopModel = mongoose.model(
  "RmProcurementSop",
  rmProcurementSopSchema
);
export default RmProcurementSopModel;

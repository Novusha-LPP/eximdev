import mongoose from "mongoose";
import auditPlugin from "../plugins/auditPlugin.mjs";

const paymentRequestSchema = new mongoose.Schema({
  requestNo: { type: String, required: true, unique: true },
  requestDate: { type: String },
  jobNo: { type: String, index: true },
  chargeRef: { type: String, index: true },
  jobRef: { type: String, index: true },
  importer: { type: String },
  bankFrom: { type: String },
  paymentTo: { type: String, index: true },
  againstBill: { type: String },
  amount: { type: Number },
  transactionType: { type: String, default: 'NEFT' },
  accountNo: { type: String },
  ifscCode: { type: String },
  bankName: { type: String },
  instrumentNo: { type: String },
  instrumentDate: { type: String },
  transferMode: { type: String, default: 'Online' },
  beneficiaryCode: { type: String },
  utrNumber: { type: String },
  utrAddedBy: { type: String },
  utrAddedAt: { type: Date },
  paymentReceiptUrl: { type: String },
  isApproved: { type: Boolean, default: false },
  approvedByFirst: { type: String, trim: true },
  approvedByLast: { type: String, trim: true },
  approvedAt: { type: Date },
  isRejected: { type: Boolean, default: false },
  rejectedByFirst: { type: String, trim: true },
  rejectedByLast: { type: String, trim: true },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  chargeDescription: { type: String },
  chargeHeadCategory: { type: String },
  status: { type: String, default: '' },
  requestedBy: { type: String },
  createdAt: { type: Date, default: Date.now }

}, { timestamps: true });

paymentRequestSchema.plugin(auditPlugin, { documentType: "paymentRequest" });

const PaymentRequestModel = mongoose.model(
  "paymentRequest",
  paymentRequestSchema
);

export default PaymentRequestModel;

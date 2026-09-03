import mongoose from 'mongoose';

const salesIncentiveSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  dealValue: { type: Number, required: true },
  incentiveAmount: { type: Number, required: true },
  calculatedPercentage: { type: Number, default: 2 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid'],
    default: 'pending'
  },
  payoutPeriod: { type: String }, // format: YYYY-MM
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  paidAt: { type: Date }
}, { timestamps: true });

// Indexes for fast querying
salesIncentiveSchema.index({ tenantId: 1, userId: 1 });
salesIncentiveSchema.index({ tenantId: 1, status: 1 });
salesIncentiveSchema.index({ opportunityId: 1 });
salesIncentiveSchema.index({ payoutPeriod: 1 });

export default mongoose.model('SalesIncentive', salesIncentiveSchema);

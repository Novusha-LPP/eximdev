import mongoose from 'mongoose';

const leaveBalanceSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  leave_policy_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LeavePolicy', required: true },
  leave_type: { type: String, required: true },

  year: { type: Number, required: true },

  opening_balance: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  pending_approval: { type: Number, default: 0 }, // locked during approval
  carried_forward: { type: Number, default: 0 },
  encashed: { type: Number, default: 0 },
  lapsed: { type: Number, default: 0 },
  closing_balance: { type: Number, default: 0 },

  monthly_breakup: [{
    month: { type: Number },
    used: { type: Number },
    balance: { type: Number }
  }],

  last_updated: { type: Date, default: Date.now }
}, { timestamps: true });

leaveBalanceSchema.index({ employee_id: 1, leave_policy_id: 1, year: 1 }, { unique: true });
leaveBalanceSchema.index({ employee_id: 1, leave_type: 1, year: 1 });

export default mongoose.model('LeaveBalance', leaveBalanceSchema);
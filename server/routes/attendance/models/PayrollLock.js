const mongoose = require('mongoose');

const payrollLockSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    year_month: { type: String, required: true }, // 'YYYY-MM'
    is_locked: { type: Boolean, default: true },
    locked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    unlocked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    locked_at: { type: Date, default: Date.now },
    unlocked_at: { type: Date }
}, { timestamps: true });

// Ensure one lock record per company per month
payrollLockSchema.index({ company_id: 1, year_month: 1 }, { unique: true });

module.exports = mongoose.model('PayrollLock', payrollLockSchema);

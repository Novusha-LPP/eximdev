const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    action: { type: String, required: true }, // e.g., 'CREATE_HOLIDAY', 'UPDATE_LEAVE_POLICY', 'LOCK_PAYROLL'
    module: { type: String, required: true }, // e.g., 'HOLIDAY', 'SETTING', 'PAYROLL', 'SHIFT'

    details: { type: String }, // Human readable description
    metadata: { type: Object }, // Raw technical details (old_value, new_value)

    ip_address: String,
    user_agent: String

}, { timestamps: true });

// Index for dashboard "Recent Activity" queries
activityLogSchema.index({ company_id: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

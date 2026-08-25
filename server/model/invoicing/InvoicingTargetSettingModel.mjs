import mongoose from "mongoose";

const InvoicingTargetSettingSchema = new mongoose.Schema(
    {
        company_key: {
            type: String, // 'SFPL_GUJ', 'SFPL_NON_GUJ', 'SRCC', 'PARAMOUNT', 'ALLUVIUM', 'NOVUSHA_ALV', 'NOVUSHA_NEXT', 'RABS', 'GROUP_TOTAL'
            required: true,
            index: true
        },
        financial_year: {
            type: String, // e.g. '26-27' or '2026-2027'
            required: true,
            index: true
        },
        month: {
            type: Number, // 0-11 (Jan=0..Dec=11) or 1-12
            required: true
        },
        monthly_target: {
            type: Number,
            default: 0
        },
        projection_days: {
            type: Number,
            default: 30 // SRCC default: 36, SFPL: custom, Others: actual month days
        },
        projection_rule_type: {
            type: String,
            enum: ["FIXED_DAYS", "CALENDAR_DAYS", "CUSTOM"],
            default: "FIXED_DAYS"
        },
        daily_target: {
            type: Number,
            default: 0
        },
        is_active: {
            type: Boolean,
            default: true
        },
        audit_trail: [
            {
                changed_at: { type: Date, default: Date.now },
                changed_by: { type: String, default: "Admin" },
                user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                old_target: { type: Number },
                new_target: { type: Number },
                old_projection_days: { type: Number },
                new_projection_days: { type: Number },
                notes: { type: String }
            }
        ]
    },
    {
        timestamps: true,
        collection: "invoicing_target_settings"
    }
);

InvoicingTargetSettingSchema.index({ company_key: 1, financial_year: 1, month: 1 }, { unique: true });

const InvoicingTargetSettingModel = mongoose.model("InvoicingTargetSetting", InvoicingTargetSettingSchema);
export default InvoicingTargetSettingModel;

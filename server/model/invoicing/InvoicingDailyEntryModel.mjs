import mongoose from "mongoose";

const InvoicingDailyEntrySchema = new mongoose.Schema(
    {
        date: {
            type: String, // Format: YYYY-MM-DD
            required: true,
            index: true
        },
        company_key: {
            type: String, // e.g. 'SFPL_GUJ', 'SFPL_NON_GUJ', 'SRCC', 'PARAMOUNT', 'ALLUVIUM', 'NOVUSHA_ALV', 'NOVUSHA_NEXT', 'RABS'
            required: true,
            index: true
        },
        company_name: {
            type: String,
            required: true
        },
        display_name: {
            type: String,
            required: true
        },
        sales_amount: {
            type: Number,
            default: 0
        },
        invoice_count: {
            type: Number,
            default: 0
        },
        credit_notes_amount: {
            type: Number,
            default: 0
        },
        cancelled_invoices_amount: {
            type: Number,
            default: 0
        },
        net_amount: {
            type: Number,
            default: 0
        },
        is_off_day: {
            type: Boolean,
            default: false // Sundays and 2nd Saturdays
        },
        off_day_reason: {
            type: String, // 'Sunday', 'Second Saturday', 'Holiday', null
            default: null
        },
        source: {
            type: String,
            enum: ["TALLY", "MANUAL", "HYBRID"],
            default: "TALLY"
        },
        invoices: [
            {
                invoice_no: { type: String },
                invoice_date: { type: String },
                amount: { type: Number, default: 0 },
                status: { type: String, enum: ["ACTIVE", "CANCELLED", "CREDITED"], default: "ACTIVE" },
                customer_name: { type: String },
                tally_guid: { type: String }
            }
        ],
        last_refreshed_at: {
            type: Date,
            default: Date.now
        },
        refreshed_by: {
            type: String,
            default: "SYSTEM_SYNC"
        },
        manual_edit_history: [
            {
                field: { type: String },
                previous_value: { type: mongoose.Schema.Types.Mixed },
                new_value: { type: mongoose.Schema.Types.Mixed },
                changed_by: { type: String },
                user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                changed_at: { type: Date, default: Date.now },
                reason: { type: String }
            }
        ]
    },
    {
        timestamps: true,
        collection: "invoicing_daily_entries"
    }
);

InvoicingDailyEntrySchema.index({ date: 1, company_key: 1 }, { unique: true });
InvoicingDailyEntrySchema.index({ date: 1 });
InvoicingDailyEntrySchema.index({ company_key: 1 });

const InvoicingDailyEntryModel = mongoose.model("InvoicingDailyEntry", InvoicingDailyEntrySchema);
export default InvoicingDailyEntryModel;

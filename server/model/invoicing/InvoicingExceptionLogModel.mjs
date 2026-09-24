import mongoose from "mongoose";

const InvoicingExceptionLogSchema = new mongoose.Schema(
    {
        exception_type: {
            type: String,
            required: true,
            enum: [
                "MISSING_TALLY_DATE",
                "ZERO_BILLING_WORKING_DAY",
                "LARGE_VARIANCE",
                "HISTORICAL_CORRECTION",
                "UNMAPPED_COMPANY",
                "PROFORMA_PENDING",
                "UNBILLED_JOBS_THRESHOLD",
                "SYNC_FAILURE",
                "TARGET_LIMIT_CHANGED"
            ],
            index: true
        },
        severity: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            default: "MEDIUM"
        },
        company_key: {
            type: String,
            default: null
        },
        display_name: {
            type: String,
            default: null
        },
        affected_date: {
            type: String, // YYYY-MM-DD
            default: null
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        responsible_person: {
            type: String, // Yash, Ayan, Naresh
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ["PENDING", "IN_REVIEW", "RESOLVED", "IGNORED"],
            default: "PENDING",
            index: true
        },
        resolved_by: {
            type: String,
            default: null
        },
        resolved_at: {
            type: Date,
            default: null
        },
        resolution_notes: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true,
        collection: "invoicing_exception_logs"
    }
);

InvoicingExceptionLogSchema.index({ status: 1, responsible_person: 1 });
InvoicingExceptionLogSchema.index({ createdAt: -1 });

const InvoicingExceptionLogModel = mongoose.model("InvoicingExceptionLog", InvoicingExceptionLogSchema);
export default InvoicingExceptionLogModel;

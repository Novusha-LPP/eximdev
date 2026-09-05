import mongoose from "mongoose";

const ImportPendingProductivitySchema = new mongoose.Schema(
    {
        date: {
            type: String, // YYYY-MM-DD
            required: true,
            index: true
        },
        branch_code: {
            type: String,
            default: "ALL",
            index: true
        },
        exception_reason: {
            type: String,
            enum: [
                "Target achieved",
                "Exception – Justified",
                "Query",
                "Document Pending",
                "Client Dependency",
                "System Issue",
                "Other"
            ],
            default: "Target achieved"
        },
        justification: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            enum: ["GREEN", "YELLOW", "RED"],
            default: "GREEN"
        },
        opening_pending_override: {
            type: Number,
            default: null
        },
        configured_target: {
            type: Number,
            default: null
        },
        configured_ageing_limit: {
            type: Number,
            default: 7
        },
        notes: {
            type: String,
            default: ""
        },
        recorded_by: {
            type: String,
            default: "System"
        }
    },
    {
        timestamps: true,
        collection: "import_pending_productivity_logs"
    }
);

ImportPendingProductivitySchema.index({ date: 1, branch_code: 1 }, { unique: true });

const ImportPendingProductivityModel = mongoose.model(
    "ImportPendingProductivity",
    ImportPendingProductivitySchema
);

export default ImportPendingProductivityModel;

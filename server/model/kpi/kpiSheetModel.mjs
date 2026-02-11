import mongoose from "mongoose";

const Schema = mongoose.Schema;

const KPISheetRowSchema = new Schema({
    row_id: {
        type: String,
        required: true, // Matches template row.id
    },
    label: {
        type: String, // Copied from template to ensure immutability of display even if template changes
    },
    type: { // "numeric" | "checkbox" - copied from template
        type: String,
        default: "numeric"
    },
    daily_values: {
        type: Map,
        of: Number, // Key is day number "1", "2", ... "31"
        default: {},
    },
    total: {
        type: Number,
        default: 0,
    },
    is_custom: {
        type: Boolean,
        default: false, // True for rows added by user, false for template rows
    },
});

const KPISheetSchema = new Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true, // "User First Name + Last Name"
        },
        department: {
            type: String,
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
        month: {
            type: Number,
            required: true, // 1-12
        },
        template_version: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "KPITemplate",
            required: true,
        },
        rows: [KPISheetRowSchema],

        // Holiday Management
        holidays: [{
            type: Number // Day numbers marked as leave by employee
        }],

        // Festival Holidays (separate from leaves)
        festivals: [{
            type: Number // Day numbers marked as festival holidays
        }],

        // Half Days (separate from leaves/festivals)
        half_days: [{
            type: Number // Day numbers marked as half-day
        }],

        // Sunday Working (explicitly marked as working)
        working_sundays: [{
            type: Number // Day numbers marked as working sunday
        }],

        status: {
            type: String,
            enum: ["DRAFT", "SUBMITTED", "CHECKED", "VERIFIED", "APPROVED", "REJECTED"],
            default: "DRAFT",
        },

        // Locking
        locked_weeks: [{
            type: Number // Week numbers or End-Dates that are locked
        }],
        is_fully_locked: {
            type: Boolean,
            default: false // Set to true after Approval
        },

        // Approval Workflow
        approval_history: [{
            action: String, // SUBMIT, APPROVE, REJECT
            by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            date: { type: Date, default: Date.now },
            comments: String
        }],

        // Summary Section
        summary: {
            business_loss: { type: Number, default: 0 },
            root_cause: { type: String, default: "" },
            action_plan: { type: String, default: "" },
            overall_percentage: { type: Number, default: 0 },
            blockers: { type: String, default: "" },
            blockers_root_cause: { type: String, default: "" }, // Rootcause for blockers
            can_hod_solve: { type: String, enum: ["Yes", "No", ""], default: "" },
            total_workload_percentage: { type: Number, default: 0 },
            submission_date: Date
        },

        // Signature Metadata
        signatures: {
            prepared_by: { type: String }, // Name captured at creation/submission
            checked_by: { type: String },
            verified_by: { type: String },
            approved_by: { type: String }
        },

        // Assigned Signatories (Usernames or IDs selected at creation)
        assigned_signatories: {
            checked_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            verified_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
        },

        // Audit Trail
        audit_log: [{
            field: String, // e.g., "row:Calls:3", "status", "summary.business_loss"
            old_value: mongoose.Schema.Types.Mixed,
            new_value: mongoose.Schema.Types.Mixed,
            changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            changed_by_name: String,
            timestamp: { type: Date, default: Date.now },
            action: { type: String, enum: ["CREATE", "UPDATE", "DELETE", "ADD_ROW", "REMOVE_ROW"] }
        }]
    },
    { timestamps: true }
);

// Ensure uniqueness: "Only one KPI sheet can exist for a given User + Department + Year + Month"
KPISheetSchema.index({ user: 1, department: 1, year: 1, month: 1 }, { unique: true });

const KPISheet = mongoose.model("KPISheet", KPISheetSchema);
export default KPISheet;

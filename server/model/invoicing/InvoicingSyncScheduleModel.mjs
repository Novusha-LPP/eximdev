import mongoose from "mongoose";

const InvoicingSyncScheduleSchema = new mongoose.Schema(
    {
        config_key: {
            type: String,
            required: true,
            unique: true,
            default: "PRIMARY_TALLY_SCHEDULE"
        },
        auto_retrieve_enabled: {
            type: Boolean,
            default: true
        },
        frequency: {
            type: String,
            enum: ["HOURLY", "DAILY", "CUSTOM"],
            default: "CUSTOM"
        },
        scheduled_times: {
            type: [String], // Array of 24-hr times e.g. ["09:00", "13:00", "18:00"]
            default: ["09:00", "13:00", "18:00"]
        },
        last_sync_status: {
            type: String,
            enum: ["SUCCESS", "IN_PROGRESS", "FAILED", "DELAYED", "IDLE"],
            default: "IDLE"
        },
        last_successful_sync: {
            type: Date,
            default: null
        },
        last_attempt_at: {
            type: Date,
            default: null
        },
        next_scheduled_sync: {
            type: Date,
            default: null
        },
        last_error_message: {
            type: String,
            default: null
        },
        retry_count: {
            type: Number,
            default: 0
        },
        schedule_audit_trail: [
            {
                changed_at: { type: Date, default: Date.now },
                changed_by: { type: String, default: "Admin" },
                user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                previous_schedule: { type: mongoose.Schema.Types.Mixed },
                new_schedule: { type: mongoose.Schema.Types.Mixed },
                reason: { type: String }
            }
        ]
    },
    {
        timestamps: true,
        collection: "invoicing_sync_schedules"
    }
);

const InvoicingSyncScheduleModel = mongoose.model("InvoicingSyncSchedule", InvoicingSyncScheduleSchema);
export default InvoicingSyncScheduleModel;

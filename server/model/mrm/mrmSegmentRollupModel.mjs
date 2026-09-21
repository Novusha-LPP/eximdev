import mongoose from 'mongoose';
import auditPlugin from "../../plugins/auditPlugin.mjs";

const mrmSegmentRollupSchema = new mongoose.Schema({
    month: { type: String, required: true }, // e.g., "01", "08"
    year: { type: Number, required: true }, // e.g., 2026
    department: { type: String, required: true, trim: true, index: true },
    sub_team: { type: String, required: true, trim: true, index: true },
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    contributing_members: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, default: '' },
        task_count: { type: Number, default: 0 },
        business_loss: { type: Number, default: 0 },
        business_loss_nothing_to_report: { type: Boolean, default: false },
        business_loss_remarks: { type: String, default: '' },
        has_blockers: { type: Boolean, default: false },
        blockers_summary: { type: String, default: '' },
        blockers_recurrence_key: { type: String, default: '' },
        open_points_count: { type: Number, default: 0 },
        open_points_items: [{
            title: { type: String },
            targetDate: { type: Date },
            responsibility: { type: String },
            priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' }
        }],
        submitted: { type: Boolean, default: false },
        submitted_at: { type: Date },
        is_submitted_on_time: { type: Boolean, default: true },
        has_targets: { type: Boolean, default: false },
        attendance_score: { type: Number, default: 0 },
        kpi_score: { type: Number, default: 0 },
        karma_points: { type: Number, default: 0 }
    }],

    has_targets: { type: Boolean, default: false },
    total_tasks: { type: Number, default: 0 },
    trailing_3m_avg: { type: Number, default: null },
    trend_deviation_pct: { type: Number, default: null },
    is_cold_start: { type: Boolean, default: false },
    trend_status: { 
        type: String, 
        enum: ['Green', 'Amber', 'Red', 'ColdStart'], 
        default: 'ColdStart' 
    },

    flags: {
        business_loss_total: { type: Number, default: 0 },
        has_business_loss: { type: Boolean, default: false },
        has_blockers: { type: Boolean, default: false },
        blockers_count: { type: Number, default: 0 },
        has_unsubmitted: { type: Boolean, default: false },
        unsubmitted_members: [{ type: String }]
    },

    flag_status: { type: String, enum: ['Green', 'Red'], default: 'Green' },
    final_rag: { type: String, enum: ['Green', 'Amber', 'Red'], default: 'Green' },
    reason_badge: { type: String, default: '' },
    segment_score: { type: Number, default: 100 }, // 100=Green, 70=Amber, 40=Red(1 trigger), 20=Red(both), 0=Unsubmitted

    task_breakdown: [{
        task_name: { type: String },
        total_count: { type: Number, default: 0 },
        total_target: { type: Number, default: null },
        total_actual: { type: Number, default: 0 },
        has_target: { type: Boolean, default: false },
        member_counts: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String },
            count: { type: Number, default: 0 },
            actual: { type: Number, default: 0 },
            target: { type: Number, default: null },
            has_target: { type: Boolean, default: false }
        }],
        historical_3m_trend: { type: Number, default: null }
    }],

    status: { 
        type: String, 
        enum: ['Draft', 'Approved', 'Locked'], 
        default: 'Draft',
        index: true
    },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Compound index to guarantee one rollup per sub-team per month
mrmSegmentRollupSchema.index({ month: 1, year: 1, department: 1, sub_team: 1 }, { unique: true });
mrmSegmentRollupSchema.index({ month: 1, year: 1, hodId: 1 });

mrmSegmentRollupSchema.plugin(auditPlugin, { documentType: "MRM_SegmentRollup" });

const MRMSegmentRollup = mongoose.model('MRMSegmentRollup', mrmSegmentRollupSchema);
export default MRMSegmentRollup;

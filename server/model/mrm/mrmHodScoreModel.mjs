import mongoose from 'mongoose';
import auditPlugin from "../../plugins/auditPlugin.mjs";

const mrmHodScoreSchema = new mongoose.Schema({
    month: { type: String, required: true }, // e.g., "01", "08"
    year: { type: Number, required: true }, // e.g., 2026
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    department: { type: String, required: true, trim: true, index: true },

    team_score: { 
        type: Number, 
        required: true, 
        default: 0,
        min: 0,
        max: 100 
    }, // S_Team (70% weight)

    focus_score: { 
        type: Number, 
        required: true, 
        default: 0,
        min: 0,
        max: 100 
    }, // S_Focus (30% weight)

    final_score: { 
        type: Number, 
        required: true, 
        default: 0,
        min: 0,
        max: 100 
    }, // (S_Team * 0.70) + (S_Focus * 0.30)

    segments_count: { type: Number, default: 0 },
    segments_summary: [{
        sub_team: { type: String },
        rag: { type: String, enum: ['Green', 'Amber', 'Red'] },
        score: { type: Number },
        reason: { type: String }
    }],

    focus_areas_count: { type: Number, default: 0 },
    focus_areas_summary: {
        green: { type: Number, default: 0 },
        yellow: { type: Number, default: 0 },
        red: { type: Number, default: 0 }
    },

    monthly_rank: { type: Number, default: null },
    total_hods_ranked: { type: Number, default: null },

    annual_cumulative_team_business_loss: { type: Number, default: 0 },
    annual_business_loss_incident_count: { type: Number, default: 0 },

    status: { 
        type: String, 
        enum: ['Draft', 'Approved', 'Locked'], 
        default: 'Draft',
        index: true 
    },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Ensure unique monthly score document per HOD
mrmHodScoreSchema.index({ month: 1, year: 1, hodId: 1 }, { unique: true });
mrmHodScoreSchema.index({ month: 1, year: 1, final_score: -1 });

mrmHodScoreSchema.plugin(auditPlugin, { documentType: "MRM_HodScore" });

const MRMHodScore = mongoose.model('MRMHodScore', mrmHodScoreSchema);
export default MRMHodScore;

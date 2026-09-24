import mongoose from 'mongoose';
import auditPlugin from "../../plugins/auditPlugin.mjs";

const mrmMemberWeightSchema = new mongoose.Schema({
    month: { type: String, required: true }, // e.g., "01", "08"
    year: { type: Number, required: true }, // e.g., 2026
    department: { type: String, required: true, trim: true },
    hodId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    isHodLevel: { type: Boolean, default: false }, // true for org-level HOD weighting

    members: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, default: '' },
        weight_pct: { type: Number, required: true, default: 0 },
        is_manual: { type: Boolean, default: false },
        attendance_score: { type: Number, default: 0 },
        kpi_score: { type: Number, default: 0 },
        karma_points: { type: Number, default: 0 },
        composite_score: { type: Number, default: 0 },
        component_weights: {
            attendance: { type: Number, default: 34 },
            kpi: { type: Number, default: 33 },
            karma: { type: Number, default: 33 }
        }
    }],

    component_weights: {
        attendance: { type: Number, default: 34 },
        kpi: { type: Number, default: 33 },
        karma: { type: Number, default: 33 }
    },

    team_score: { type: Number, default: 0 },
    is_locked: { type: Boolean, default: false }
}, { timestamps: true });

// Compound unique index ensuring one config per HOD/department/month/year (or org-level)
mrmMemberWeightSchema.index(
    { month: 1, year: 1, department: 1, hodId: 1, isHodLevel: 1 }, 
    { unique: true }
);

mrmMemberWeightSchema.plugin(auditPlugin, { documentType: "MRM_Member_Weight" });

const MRMMemberWeight = mongoose.model('MRMMemberWeight', mrmMemberWeightSchema);
export default MRMMemberWeight;

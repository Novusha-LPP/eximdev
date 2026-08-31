import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const Schema = mongoose.Schema;

const auditScoreSchema = new Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    dailyScores: {
        type: Map,
        of: Number, // 0, 1, 2
        default: {}
    }
});

const audit5sChecklistSchema = new Schema({
    month: {
        type: String, // "YYYY-MM"
        required: true,
        trim: true
    },
    zoneId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Audit5sZone",
        required: true
    },
    zoneNo: {
        type: String,
        required: true,
        trim: true
    },
    zoneName: {
        type: String,
        required: true,
        trim: true
    },
    responsiblePerson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    docNo: {
        type: String,
        trim: true
    },
    revNo: {
        type: String,
        trim: true
    },
    revDate: {
        type: Date
    },
    scores: [auditScoreSchema],
    auditorSignatures: {
        type: Map,
        of: String, // day number ("1" to "31") -> auditor initials
        default: {}
    },
    leaderPhoto: {
        type: String,
        default: ""
    },
    prevMonthData: {
        type: Map,
        of: new Schema({
            actual: { type: Number, default: 0 },
            max: { type: Number, default: 0 }
        }, { _id: false }),
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

audit5sChecklistSchema.index({ month: 1, zoneId: 1 }, { unique: true });

audit5sChecklistSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

audit5sChecklistSchema.plugin(auditPlugin, { documentType: "Audit5sChecklist" });

const Audit5sChecklistModel = mongoose.model("Audit5sChecklist", audit5sChecklistSchema);
export default Audit5sChecklistModel;

import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const Schema = mongoose.Schema;

const templateItemSchema = new Schema({
    text: {
        type: String,
        required: true,
        trim: true
    }
});

const templateCategorySchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    subName: {
        type: String,
        trim: true
    },
    items: [templateItemSchema]
});

const audit5sZoneSchema = new Schema({
    zoneNo: {
        type: String,
        required: true,
        unique: true,
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
    isActive: {
        type: Boolean,
        default: true
    },
    docNo: {
        type: String,
        default: "RI/QAD/R/04",
        trim: true
    },
    revNo: {
        type: String,
        default: "00",
        trim: true
    },
    revDate: {
        type: Date,
        default: () => new Date("2024-12-10")
    },
    categories: [templateCategorySchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

audit5sZoneSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

audit5sZoneSchema.plugin(auditPlugin, { documentType: "Audit5sZone" });

const Audit5sZoneModel = mongoose.model("Audit5sZone", audit5sZoneSchema);
export default Audit5sZoneModel;

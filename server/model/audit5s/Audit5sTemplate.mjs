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
    totalScore: {
        type: Number,
        default: 0
    },
    items: [templateItemSchema]
});

const audit5sTemplateSchema = new Schema({
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

audit5sTemplateSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

audit5sTemplateSchema.plugin(auditPlugin, { documentType: "Audit5sTemplate" });

const Audit5sTemplateModel = mongoose.model("Audit5sTemplate", audit5sTemplateSchema);
export default Audit5sTemplateModel;

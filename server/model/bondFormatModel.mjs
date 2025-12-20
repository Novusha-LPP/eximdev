import mongoose from "mongoose";

const bondFormatSchema = new mongoose.Schema({
    shippingLine: { type: String, required: true, unique: true },
    content: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
});

bondFormatSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

const BondFormatModel = mongoose.model("BondFormat", bondFormatSchema);
export default BondFormatModel;

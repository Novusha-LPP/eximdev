import mongoose from "mongoose";

const importerBondSchema = new mongoose.Schema({
    shippingLine: { type: String, required: true },
    importer: { type: String, required: true },
    fileUrl: { type: String, default: "" },
    validityDate: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
});

importerBondSchema.index({ shippingLine: 1, importer: 1 }, { unique: true });

importerBondSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

const ImporterBondModel = mongoose.model("ImporterBond", importerBondSchema);
export default ImporterBondModel;

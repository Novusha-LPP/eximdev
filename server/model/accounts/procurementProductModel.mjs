import mongoose from "mongoose";

const procurementProductSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, unique: true, uppercase: true, trim: true },
    brandPreference: { type: String, uppercase: true, trim: true },
    specification: { type: String, uppercase: true, trim: true },
    estUnitCost: { type: Number },
  },
  { timestamps: true }
);

const ProcurementProductModel =
  mongoose.models.ProcurementProduct ||
  mongoose.model("ProcurementProduct", procurementProductSchema);

export default ProcurementProductModel;

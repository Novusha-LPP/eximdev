import mongoose from "mongoose";

const procurementProductSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, unique: true, uppercase: true, trim: true },
  },
  { timestamps: true }
);

const ProcurementProductModel =
  mongoose.models.ProcurementProduct ||
  mongoose.model("ProcurementProduct", procurementProductSchema);

export default ProcurementProductModel;

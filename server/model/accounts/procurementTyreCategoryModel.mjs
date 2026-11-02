import mongoose from "mongoose";

const procurementTyreCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const DEFAULT_TYRE_CATEGORIES = [
  "New Nylon Tyre",
  "New Radial Tyre",
  "Remould Nylon Tyre",
  "Remould Radial Tyre",
  "New China Tyre",
];

const ProcurementTyreCategoryModel = mongoose.model(
  "ProcurementTyreCategory",
  procurementTyreCategorySchema
);

export default ProcurementTyreCategoryModel;

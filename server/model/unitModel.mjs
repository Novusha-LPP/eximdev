import mongoose from "mongoose";

const unitSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  pluralUnit: { type: String, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  unitType: { type: String, required: true, trim: true },
  active: { type: String, default: "Yes" },
  conversionFactor: { type: String, trim: true },
  decimal: { type: Number, default: 0 },
  ediCode: { type: String, trim: true },
  numericCode: { type: String, trim: true },
  created_at: { type: Date, default: Date.now },
});

const UnitModel = mongoose.model("Unit", unitSchema, "unitsimp");
export default UnitModel;

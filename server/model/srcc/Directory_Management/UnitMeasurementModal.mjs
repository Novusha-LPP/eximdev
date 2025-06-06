import mongoose from "mongoose";

const measurementSchema = new mongoose.Schema({
  unit: { type: String, trim: true },
  symbol: { type: String, trim: true },
  decimal_places: {
    type: Number,
    min: 0,
    default: 2,
  },
});

const unitMeasurementSchema = new mongoose.Schema({
  name: { type: String, trim: true }, // e.g., "Length"
  measurements: [measurementSchema],
});

export default mongoose.model("UnitMeasurement", unitMeasurementSchema);

import mongoose from "mongoose";

const unitMeasurementSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  symbol: { type: String, trim: true },
  unit_type: {
    type: String,
    enum: [
      "number",
      "weight",
      "distance",
      "volume",
      "area",
      "time",
      "pressure",
      "power",
      "temperature",
    ],
    required: true,
  },
  decimal_places: {
    type: Number,
    min: 0,
    default: 2,
  },
});

export default mongoose.model("UnitMeasurement", unitMeasurementSchema);

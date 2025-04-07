import mongoose from "mongoose";

const VehicleTypeSchema = new mongoose.Schema(
  {
    vehicleType: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true },
    loadCapacity: {
      value: { type: Number, required: true, min: 0 },
      unit: { type: String, required: true, trim: true }, // e.g., kg, ton
    },
    engineCapacity: {
      value: { type: Number, required: true, min: 0 },
      unit: { type: String, required: true, trim: true }, // e.g., kg, ton
    },
    cargoTypeAllowed: [{ type: String, trim: true }],
    CommodityCarry: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

const VehicleType = mongoose.model("VehicleType", VehicleTypeSchema);

export default VehicleType;

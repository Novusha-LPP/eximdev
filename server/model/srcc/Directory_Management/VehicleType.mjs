import mongoose from "mongoose";

const VehicleTypeSchema = new mongoose.Schema(
  {
    vehicleType: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true },
    loadCapacity: { type: String, required: true, trim: true },
    engineCapacity: { type: String, required: true, trim: true },
    cargoTypeAllowed: [{ type: String, trim: true }],
    CommodityCarry: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

const VehicleType = mongoose.model("VehicleType", VehicleTypeSchema);

export default VehicleType;

import mongoose from "mongoose";

const VehicleTypeSchema = new mongoose.Schema(
  {
    vehicleType: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true },
    loadCapacity: { type: String, required: true, trim: true },
    engineCapacity: { type: String, required: true, trim: true },
    cargoTypeAllowed: {
      type: String,
      enum: ["Package", "LiquidBulk", "Bulk", "Container"], // Change here: use strings
      required: true,
    },
    CommodityCarry: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const VehicleType = mongoose.model("VehicleType", VehicleTypeSchema);

export default VehicleType;

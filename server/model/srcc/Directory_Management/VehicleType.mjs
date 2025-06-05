import mongoose from "mongoose";

const VehicleTypeSchema = new mongoose.Schema(
  {
    vehicleType: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true },
    loadCapacity: {
      value: { type: Number, required: true, min: 0 },
      unit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UnitMeasurement",
        required: true,
      },
    },
    engineCapacity: {
      value: { type: Number, required: true, min: 0 },
      unit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UnitMeasurement",
        required: true,
      },
    },
    cargoTypeAllowed: [{ type: String, trim: true }],
    CommodityCarry: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommodityCode",
        required: true,
      },
    ],
  },
  { timestamps: true }
);

const VehicleType = mongoose.model("VehicleType", VehicleTypeSchema);

export default VehicleType;

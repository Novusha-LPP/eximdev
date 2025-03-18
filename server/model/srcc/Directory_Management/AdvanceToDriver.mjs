import mongoose from "mongoose";

const AdvanceToDriverSchema = new mongoose.Schema(
  {
    startingLocation: {
      type: String,
      required: true,
      trim: true,
    },
    destinationLocation: {
      type: String,
      required: true,
      trim: true,
    },
    returnLocation: {
      type: String,
      required: true,
      trim: true,
    },
    // This can be a string referencing the actual "vehicleType" name. 
    // If you want to store the ObjectId, you can do that instead.
    vehicleType: {
      type: String,
      required: true,
      trim: true,
    },
    loadVehicleKms: {
      type: Number,
      required: true,
    },
    emptyVehicleKms: {
      type: Number,
      required: true,
    },
    loadVehicleMileage: {
      type: Number,
      required: true,
    },
    emptyVehicleMileage: {
      type: Number,
      required: true,
    },
    loadingExtraFuelVolume: {
      type: Number,
      required: true,
    },
    unloadingExtraFuelVolume: {
      type: Number,
      required: true,
    },
    totalRequiredFuelVolume: {
      type: Number,
      required: true,
    },
    fuelRate: {
      type: Number,
      required: true,
    },
    cash: {
      type: Number,
      required: true,
    },
    totalAdvancePayableAmount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const AdvanceToDriver = mongoose.model("AdvanceToDriver", AdvanceToDriverSchema);

export default AdvanceToDriver;

import mongoose from "mongoose";

const VehicleRegistrationSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
    },
    registrationName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleType", // Reference to the VehicleType model
      required: true,
    },
    shortName: {
      type: String,
      required: true,
      trim: true,
    },
    depotName: {
      type: String,
      required: true,
      trim: true,
    },
    // Updated initialOdometer as an object with value and unit
    initialOdometer: {
      value: { type: Number, required: true, min: 0 },
      unit: { type: String, required: true, trim: true },
    },
    // Updated loadCapacity as an object with value and unit
    loadCapacity: {
      value: { type: Number, required: true, min: 0 },
      unit: { type: String, required: true, trim: true },
    },
    driver: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DriverType", // Make sure your Driver model is named this
        required: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phoneNumber: { type: String, required: true, trim: true },
    },
    purchase: {
      type: Date,
      required: false,
    },
    vehicleManufacturingDetails: {
      type: String,
      trim: true,
    },
    isOccupied: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const VehicleRegistration = mongoose.model(
  "VehicleRegistration",
  VehicleRegistrationSchema
);

export default VehicleRegistration;

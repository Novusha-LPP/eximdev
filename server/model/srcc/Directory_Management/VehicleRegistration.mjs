import mongoose from "mongoose";

const VehicleRegistrationSchema = new mongoose.Schema(
  {
    registrationName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
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
      type: String,
      trim: true,
    },
    purchase: {
      type: Date,
      required: false,
    },
    vehicleManufacturingDetails: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const VehicleRegistration = mongoose.model(
  "VehicleRegistration",
  VehicleRegistrationSchema
);

export default VehicleRegistration;

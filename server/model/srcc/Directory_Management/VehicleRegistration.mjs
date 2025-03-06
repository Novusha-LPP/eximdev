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
    initialOdometer: {
      type: Number,
      required: true,
    },
    loadCapacity: {
      type: String,
      required: true,
      trim: true,
    },
    driver: {
      type: String,
      trim: true,
    },
    purchase: {
      // Adjust type as needed, for instance Date or a reference to another document
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

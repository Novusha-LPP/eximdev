import mongoose from "mongoose";

const DriverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    alias: { type: String, required: true, trim: true },
    photoUpload: { type: String, required: true, trim: true },
    licenseUpload: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, trim: true },
    licenseIssueAuthority: { type: String, required: true, trim: true },
    licenseExpiryDate: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    alternateNumber: { type: String, required: true, trim: true },
    residentialAddress: { type: String, required: true, trim: true },
    drivingVehicleTypes: { type: String, required: true, trim: true },
    remarks: { type: String, required: true, trim: true },
    notes: [
      {
        date: { type: String },
        note: { type: String },
        attachment: { type: String },
      },
    ],
  },
  { timeseries: true }
);

const DriverType = mongoose.model("DriverType", DriverSchema);

export default DriverType;

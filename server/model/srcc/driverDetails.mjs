import mongoose from "mongoose";

const driverDetailsSchema = new mongoose.Schema({
  driver_name: { type: String, trim: true },
  driver_address: { type: String, trim: true },
  driver_phone: { type: String, trim: true },
  driver_license: { type: String, trim: true },
  license_validity: { type: String, trim: true },
  joining_date: { type: String, trim: true },
  blood_group: { type: String, trim: true },
  driver_photo: { type: String, trim: true },
  license_photo: [{ type: String, trim: true }],
});

export default mongoose.model("DriverDetails", driverDetailsSchema);

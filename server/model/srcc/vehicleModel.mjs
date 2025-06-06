import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
  truck_no: { type: String, trim: true },
  type_of_vehicle: { type: String },
  max_tyres: { type: String, trim: true },
  units: { type: String, trim: true },
  drivers: [
    {
      driver_name: { type: String },
      driver_address: { type: String },
      driver_phone: { type: String },
      driver_license: { type: String },
      license_validity: { type: String },
      assign_date: { type: String },
      assign_date_odometer: { type: String },
    },
  ],
  tyres: [
    {
      tyre_no: { type: String },
      location: { type: String },
      fitting_date: { type: String },
      fitting_date_odometer: { type: String },
      withdrawal_date: { type: String },
      withdrawal_date_odometer: { type: String },
    },
  ],
  rto: {
    inspection_due_date: { type: String },
    mv_tax: { type: String },
    mv_tax_date: { type: String },
    insurance_expiry_date: { type: String },
    puc_expiry_date: { type: String },
    goods_permit_no: { type: String },
    goods_permit_validity_date: { type: String },
    national_permit_no: { type: String },
    national_permit_validity_date: { type: String },
    hp: { type: String },
    hp_financer_name: { type: String },
    number_plate: { type: String },
    supd: { type: String },
    mv_tax_photo: { type: [String] }, // Changed to array of strings
    insurance_photo: { type: [String] }, // Changed to array of strings
    puc_photo: { type: [String] }, // Changed to array of strings
    goods_permit_photo: { type: [String] }, // Changed to array of strings
    national_permit_photo: { type: [String] }, // Changed to array of strings
    rc_front_photo: { type: [String] }, // Changed to array of strings
    rc_rear_photo: { type: [String] }, // Changed to array of strings
  },
  challans: [
    {
      challan_no: { type: String },
      challan_date: { type: String },
      challan_amount: { type: Number },
      challan_driver_contact: { type: String },
      challan_reason: { type: String },
      challan_location: { type: String },
      challan_document: { type: [String] },
    },
  ],
  accidents: [
    {
      third_party_vehicle_no: { type: String },
      date: { type: String },
      time: { type: String },
      driver_name: { type: String },
      opposite_party_name: { type: String },
      vehicle_type: { type: String },
      insured: { type: String },
      location: { type: String },
      settlement_amount: { type: Number },
      remarks: { type: String },
      image: { type: [String] },
    },
  ],
});

export default mongoose.model("Vehicles", vehicleSchema);

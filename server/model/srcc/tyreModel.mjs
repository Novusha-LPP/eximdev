import mongoose from "mongoose";

const tyreSchema = new mongoose.Schema({
  tyre_no: { type: String },
  vendor_name: { type: String },
  vendor_address: { type: String },
  vendor_phone: { type: String },
  bill_no: { type: String },
  bill_date: { type: String },
  warranty_date: { type: String },
  tyre_brand: { type: String },
  tyre_model: { type: String },
  tyre_type: { type: String },
  tyre_size: { type: String },
  ply_rating: { type: String },
  blast_truck_no: { type: String },
  blast_date: { type: String },
  blast_driver: { type: String },
  blast_odometer: { type: String },
  blast_remarks: { type: String },
  blast_images: [{ type: String }],
  tyre_invoice_image: { type: String },
  trucks: [
    {
      truck_no: { type: String },
      location: { type: String },
      fitting_date: { type: String },
      removal_date: { type: String },
      fitting_date_odometer: { type: String },
      removal_date_odometer: { type: String },
      _fitting_date_added: { type: String, trim: true },
      repairs: [
        {
          bill_no: { type: String },
          bill_date: { type: String },
          amount: { type: String },
          repair_type: { type: String },
          repair_date_odometer: { type: String },
          tyre_repair_invoice_images: [{ type: String }],
          vendor: { type: String },
          _repair_date_added: { type: String, trim: true },
        },
      ],
      retreading: [
        {
          retreading_date: { type: String },
          amount: { type: String },
          retreading_date_odometer: { type: String },
          vendor: { type: String },
          tread_pattern: { type: String },
          tyre_retreading_invoice_images: [{ type: String }],
          _retreading_date_added: { type: String, trim: true },
        },
      ],
      drivers: [
        {
          driver_name: { type: String },
          driver_address: { type: String },
          driver_phone: { type: String },
          driver_license: { type: String },
          license_validity: { type: String },
          assign_date: { type: String },
          assign_date_odometer: { type: String },
          _driver_assign_date_added: { type: String, trim: true },
        },
      ],
    },
  ],
});

const Tyre = mongoose.model("Tyre", tyreSchema);
export default Tyre;

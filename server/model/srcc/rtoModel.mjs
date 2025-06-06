import mongoose from "mongoose";

const rtoSchema = new mongoose.Schema({
  truck_no: { type: String },
  fitness_document: { type: String },
  fitness_document_expiry_date: { type: String },
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
  fitness_document_photo: { type: String },
  mv_tax_photo: { type: String },
  insurance_photo: { type: String },
  puc_photo: { type: String },
  goods_permit_photo: { type: String },
  national_permit_photo: { type: String },
  rc_front_photo: { type: String },
  rc_rear_photo: { type: String },
});

const RTO = mongoose.model("Rto", rtoSchema);
export default RTO;

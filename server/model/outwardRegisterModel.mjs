import mongoose from "mongoose";

const outwardRegisterSchema = new mongoose.Schema({
  bill_given_date: { type: String },
  party: { type: String },
  division: { type: String },
  courier_details: { type: String },
  weight: { type: String },
  docket_no: { type: String },
  outward_consignment_photo: { type: String },
  party_email: { type: String },
  description: { type: String },
  kind_attention: { type: String },
});

const OutwardRegisterModel = mongoose.model(
  "outwardRegister",
  outwardRegisterSchema
);
export default OutwardRegisterModel;

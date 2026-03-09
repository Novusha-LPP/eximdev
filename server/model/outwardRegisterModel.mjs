import mongoose from "mongoose";
import auditPlugin from "../plugins/auditPlugin.mjs";

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

outwardRegisterSchema.plugin(auditPlugin, { documentType: "outwardRegister" });

const OutwardRegisterModel = mongoose.model(
  "outwardRegister",
  outwardRegisterSchema
);
export default OutwardRegisterModel;

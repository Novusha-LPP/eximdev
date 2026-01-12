import mongoose from "mongoose";
import { createDynamicModel } from "../utils/modelHelper.mjs";

const inwardRegisterSchema = new mongoose.Schema({
  time: { type: String },
  date: { type: String },
  from: { type: String },
  type: { type: String },
  details_of_document: { type: String },
  contact_person_name: { type: String },
  inward_consignment_photo: { type: String },
  courier_handed_over: { type: String },
  courier_received: { type: String },
});

const InwardRegisterModel = createDynamicModel("inwardRegister", inwardRegisterSchema);
export default InwardRegisterModel;

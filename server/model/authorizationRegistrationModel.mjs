import mongoose from "mongoose";

const authorizationRegistrationSchema = new mongoose.Schema(
  {
    job_no: { type: String },
    job_status: { type: String },
    date: { type: String },
    party_name: { type: String },
    job_type: { type: String },
    port_name: { type: String },
    category: { type: String },
    licence_no: { type: String },
    licence_date: { type: String },
    licence_amount: { type: String },
    lic_recd_from_party: { type: String },
    date_send_to_icd_ports: { type: String },
    bond_challan_no: { type: String },
    iec_no: { type: String },
    completed: { type: String },
    registration_date: { type: String },
    month: { type: String },
    billing_done_or_not: { type: String },
    bill_number: { type: String },
  },
  { timestamps: true }
);

const AuthorizationRegistrationModel = mongoose.model(
  "authorizationRegistration",
  authorizationRegistrationSchema
);

export default AuthorizationRegistrationModel;

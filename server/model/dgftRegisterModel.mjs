import mongoose from "mongoose";
import auditPlugin from "../plugins/auditPlugin.mjs";

const dgftRegisterSchema = new mongoose.Schema(
  {
    sr_no: { type: String },
    job_status: { type: String },
    job_no: { type: String },
    date: { type: String },
    party_name: { type: String },
    category: { type: String },
    licence_cif_value: { type: String },
    docs_received_date: { type: String },
    application_prepared_on: { type: String },
    submitted_at_dgft_on: { type: String },
    eft_amount: { type: String },
    bid_no: { type: String },
    bid_date: { type: String },
    file_no_key_no: { type: String },
    file_date: { type: String },
    dh: { type: String },
    ft_do: { type: String },
    adg: { type: String },
    d_dg: { type: String },
    licence_no: { type: String },
    licence_date: { type: String },
    matter_closed_date: { type: String },
    matter_closed_inv_no: { type: String },
    matter_closed_inv_date: { type: String },
    docs_handed_over_to_ac: { type: String },
    remarks: { type: String },
    accounts_inv_no: { type: String },
    accounts_inv_date: { type: String },
  },
  { timestamps: true }
);

dgftRegisterSchema.plugin(auditPlugin, { documentType: "dgftRegister" });

const DgftRegisterModel = mongoose.model(
  "dgftRegister",
  dgftRegisterSchema
);

export default DgftRegisterModel;

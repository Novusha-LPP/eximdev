import mongoose from "mongoose";
import auditPlugin from "../plugins/auditPlugin.mjs";

const dgftRegisterSchema = new mongoose.Schema(
  {
    sr_no: { type: String },
    job_status: { type: String },
    job_no: { type: String },
    date: { type: String },
    party_name: { type: String },
    iec_no: { type: String },
    scheme: { type: String },
    file_no: { type: String },
    port_of_registration: { type: String },
    category: { type: String },
    licence_cif_value: { type: String },
    docs_received_date: { type: String },
    online_submission_date: { type: String },
    documents_send_to_accounts_date: { type: String },
    payment_details: { type: String },
    transaction_id: { type: String },
    transaction_amount: { type: String },
    transaction_date: { type: String },
    import_validity: { type: String },
    export_validity: { type: String },
    qty_export: { type: String },
    unit_export: { type: String },
    export_value_fob_usd: { type: String },
    export_value_rs: { type: String },
    hs_code_export: { type: String },
    item_description_export: { type: String },
    qty_import: { type: String },
    unit_import: { type: String },
    import_value_fob_usd: { type: String },
    import_value_rs: { type: String },
    hs_code_import: { type: String },
    item_description_import: { type: String },
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

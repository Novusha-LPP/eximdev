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
    bg_number: { type: String },
    bg_amount: { type: String },
    bg_date: { type: String },
    bg_expiry_date: { type: String },
    bond_number: { type: String },
    bond_date: { type: String },

    iec_no: { type: String },
    completed: { type: String },
    registration_date: { type: String },
    month: { type: String },
    billing_done_or_not: { type: String },
    bill_number: { type: String },
    port_code: { type: String },
    // Details fields
    import_validity: { type: String },
    export_validity: { type: String },
    hs_code: { type: String },
    import_item_description: { type: String },
    export_item_description: { type: String },
    import_qty: { type: String },
    export_qty: { type: String },
    balance_qty_import: { type: String },
    balance_qty_export: { type: String },
    utilisation_details_import: { type: String },
    utilisation_details_export: { type: String },
    import_value_usd: { type: String },
    import_value_rs: { type: String },
    export_value_usd: { type: String },
    export_value_rs: { type: String },
    bg_expiry_date: { type: String },
    bond_expiry_date: { type: String },
    documents_received_date: { type: String },
    documents_send_to_icd: { type: String },
    documents_send_to_accounts: { type: String },

    // Legacy/Unused (Keeping for backward compatibility if any)
    item_description: { type: String },
    value_usd: { type: String },
    value_rs: { type: String },
    qty: { type: String },
    utilized_qty: { type: String },
    balance_qty: { type: String },
    boe_details: { type: String },
    sb_details: { type: String },
    documents_send_to_account: { type: String },
  },
  { timestamps: true }
);

const AuthorizationRegistrationModel = mongoose.model(
  "authorizationRegistration",
  authorizationRegistrationSchema
);

export default AuthorizationRegistrationModel;

import mongoose from "mongoose";
import auditPlugin from "../plugins/auditPlugin.mjs";

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
    bond_challan_amount: { type: String },
    bg_number: { type: String },
    bg_amount: { type: String },
    bg_date: { type: String },
    bg_expiry_date: { type: String },
    bond_number: { type: String },
    bond_amount: { type: String },
    bond_date: { type: String },

    iec_no: { type: String },
    completed: { type: String },
    registration_date: { type: String },
    month: { type: String },
    billing_done_or_not: { type: String },
    bill_number: { type: String },
    port_code: { type: String },

    // Validity details
    import_validity: { type: String },
    export_validity: { type: String },

    // Legacy scalar details (kept for backward compatibility)
    hs_code_import: { type: String },
    export_hs_code: { type: String },
    import_item_description: { type: String },
    export_item_description: { type: String },
    import_qty: { type: String },
    import_unit: { type: String },
    export_qty: { type: String },
    export_unit: { type: String },
    balance_qty_import: { type: String },
    balance_import_unit: { type: String },
    balance_qty_export: { type: String },
    balance_export_unit: { type: String },
    utilisation_details_import: { type: String },
    utilisation_details_export: { type: String },
    import_value_usd: { type: String },
    import_value_rs: { type: String },
    export_value_usd: { type: String },
    export_value_rs: { type: String },

    bond_expiry_date: { type: String },
    documents_received_date: { type: String },
    documents_send_to_icd: { type: String },
    documents_send_to_accounts: { type: String },
    accounts_billing_invoice_no: { type: String },
    accounts_billing_invoice_date: { type: String },

    registration_no: { type: String },
    auth_date: { type: String },
    // Scheme Code — dropdown value from defined list
    scheme_code: { type: String },
    notification_number: { type: String },

    // Future EPCG Support placeholders
    export_obligation_required: { type: Number, default: 0 },
    export_obligation_achieved: { type: Number, default: 0 },
    export_obligation_pending: { type: Number, default: 0 },

    // Legacy manual be_details table (kept for backward compat)
    be_details: [{ type: mongoose.Schema.Types.Mixed }],

    // ── Enhanced Import Details Array (with utilization tracking) ──
    import_details_array: [
      {
        sr_no: { type: Number },                  // Item serial number 1, 2, 3…
        item_description: { type: String },
        hs_code: { type: String },
        // Licensed qty/values (entered manually in DGFT screen)
        qty: { type: String },                     // Licensed qty (string for display)
        unit: { type: String },
        value_usd: { type: String },              // Licensed CIF USD
        value_rs: { type: String },               // Licensed CIF INR
        balance_qty: { type: String },            // Legacy manual balance (kept)
        balance_unit: { type: String },
        // Numeric licensed totals (parsed from qty/value_usd/value_rs for calculation)
        licensed_qty: { type: Number, default: 0 },
        licensed_cif_usd: { type: Number, default: 0 },
        licensed_cif_inr: { type: Number, default: 0 },
        // Auto-calculated utilization summary fields
        total_utilized_qty: { type: Number, default: 0 },
        total_utilized_usd: { type: Number, default: 0 },
        total_utilized_inr: { type: Number, default: 0 },
        balance_qty: { type: Number, default: 0 },
        balance_cif_usd: { type: Number, default: 0 },
        balance_cif_inr: { type: Number, default: 0 },
        utilization_percent: { type: Number, default: 0 },

        // Keep auto_balance_* fields for backward compatibility
        auto_balance_qty: { type: Number, default: 0 },
        auto_balance_cif_usd: { type: Number, default: 0 },
        auto_balance_cif_inr: { type: Number, default: 0 },
      }
    ],

    // ── Enhanced Export Details Array (with sr_no) ──
    export_details_array: [
      {
        sr_no: { type: Number },                  // Item serial number 1, 2, 3…
        item_description: { type: String },
        hs_code: { type: String },
        qty: { type: String },
        unit: { type: String },
        value_usd: { type: String },
        value_rs: { type: String },
        balance_qty: { type: String },
        balance_unit: { type: String },
      }
    ],

    // ── Auto-Generated Utilization Records (from DSR Product Details) ──
    // Populated/updated automatically by licenseUtilizationService on DSR save/update/delete
    utilization_records: [
      {
        sr_no: { type: Number },                  // Matches import_details_array[].sr_no
        authorization_no: { type: String },
        authorization_date: { type: String },
        scheme_code: { type: String },
        item_description: { type: String },
        be_no: { type: String },
        be_date: { type: String },
        qty: { type: Number },
        unit: { type: String },
        cif_usd: { type: Number },
        cif_inr: { type: Number },
        port: { type: String },
        job_no: { type: String },
        job_id: { type: mongoose.Schema.Types.ObjectId },
        created_at: { type: Date, default: Date.now },
      }
    ],

    // Legacy/Unused (Keeping for backward compatibility)
    bond_challan_no: { type: String },
    hs_code: { type: String },
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

authorizationRegistrationSchema.plugin(auditPlugin, { documentType: "AuthorizationRegistration" });

const AuthorizationRegistrationModel = mongoose.model(
  "authorizationRegistration",
  authorizationRegistrationSchema
);

export default AuthorizationRegistrationModel;

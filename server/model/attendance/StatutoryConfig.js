import mongoose from 'mongoose';

const ptSlabSchema = new mongoose.Schema({
  from: { type: Number, required: true },   // e.g., 0
  to: { type: Number, required: true },     // e.g., 10000 (use 999999999 for "above")
  amount: { type: Number, required: true }  // Fixed PT amount for this slab
}, { _id: false });

const statutoryConfigSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },

  // ─── PF (Provident Fund) ──────────────────────────────────────────────
  pf_rate_employee: { type: Number, default: 12 },    // Percentage
  pf_rate_employer: { type: Number, default: 12 },    // Percentage
  pf_ceiling: { type: Number, default: 15000 },       // PF applies on Basic up to this ceiling
  pf_enabled: { type: Boolean, default: true },

  // ─── ESI (Employee State Insurance) ───────────────────────────────────
  esi_rate_employee: { type: Number, default: 0.75 },  // Percentage
  esi_rate_employer: { type: Number, default: 3.25 },  // Percentage
  esi_ceiling: { type: Number, default: 21000 },       // Gross salary ceiling for ESI applicability
  esi_enabled: { type: Boolean, default: true },

  // ─── PT (Professional Tax) ────────────────────────────────────────────
  pt_enabled: { type: Boolean, default: true },
  pt_state: { type: String, default: 'Maharashtra' },
  pt_slabs: {
    type: [ptSlabSchema],
    default: [
      // Default Maharashtra PT slabs (2024-25)
      { from: 0, to: 7500, amount: 0 },
      { from: 7501, to: 10000, amount: 175 },
      { from: 10001, to: 999999999, amount: 200 }
      // Note: For Feb, amount for last slab is 300 — handled in code
    ]
  },

  // ─── TDS ──────────────────────────────────────────────────────────────
  tds_enabled: { type: Boolean, default: false },

  // ─── Payslip ──────────────────────────────────────────────────────────
  payslip_password_rule: {
    type: String,
    enum: ['DOB', 'PAN', 'CUSTOM'],
    default: 'DOB'
  },
  payslip_company_name: { type: String },     // Name to show on payslip header
  payslip_company_address: { type: String },  // Address on payslip
  payslip_company_logo_url: { type: String }, // Logo URL (S3)

  // ─── Audit ────────────────────────────────────────────────────────────
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('StatutoryConfig', statutoryConfigSchema);

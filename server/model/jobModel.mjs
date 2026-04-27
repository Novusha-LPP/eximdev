import mongoose from "mongoose";
import auditPlugin from "../plugins/auditPlugin.mjs";
import { type } from "os";
import { determineDetailedStatus } from "../utils/determineDetailedStatus.mjs";
import { getRowColorFromStatus } from "../utils/statusColorMapper.mjs";
import { getJobStatusRank, getJobSortDate } from "../utils/jobRanking.mjs";
import BranchModel from "./branchModel.mjs";
const ImageSchema = new mongoose.Schema({
  url: { type: String, trim: true },
});

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["text", "number", "date", "select", "boolean"],
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }], // For select field


  order: { type: Number, default: 0 },
});

const masterTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  fields: [fieldSchema],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const customFieldSchema = new mongoose.Schema({
  fieldId: { type: mongoose.Schema.Types.ObjectId, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
});

const accountEntrySchema = new mongoose.Schema({
  masterTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MasterType",
    required: true,
  },
  companyName: { type: String, required: true },
  address: { type: String, required: true },
  dueDate: { type: Date, required: true },
  reminderFrequency: {
    type: String,
    required: true,
    enum: ["monthly", "quarterly", "half-yearly", "yearly"],
  },
  customFields: [customFieldSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const cthDocumentSchema = new mongoose.Schema({
  cth: { type: Number, trim: true },
  document_name: { type: String, trim: true },
  document_code: { type: String, trim: true },
  url: [{ type: String, trim: true }],
  irn: { type: String, trim: true },
  document_check_date: { type: String, trim: true },
  is_sent_to_esanchit: { type: Boolean, default: false },
  send_date: { type: String, trim: true },
});





const documentSchema = new mongoose.Schema({
  document_name: { type: String, trim: true },
  document_code: { type: String, trim: true },
  url: [{ type: String, trim: true }],
  irn: { type: String, trim: true },
  document_check_date: { type: String, trim: true },
});

const invoiceDetailsSchema = new mongoose.Schema(
  {
    invoice_number: { type: String, trim: true },
    invoice_date: { type: String, trim: true },
    po_no: { type: String, trim: true },
    po_date: { type: String, trim: true },
    product_value: { type: String, trim: true },
    other_charges: { type: String, trim: true },
    total_inv_value: { type: String, trim: true },
    inv_currency: { type: String, trim: true },
    toi: { type: String, trim: true },
    freight: { type: String, trim: true },
    insurance: { type: String, trim: true },
  },
  { _id: false }
);

const descriptionDetailsSchema = new mongoose.Schema(
  {
    description: { type: String, trim: true },
    cth_no: { type: String, trim: true },
    clearance_under: { type: String, trim: true },
    sr_no_invoice: { type: String, trim: true },
    sr_no_lic: { type: String, trim: true },
    quantity: { type: String, trim: true },
    unit: { type: String, trim: true },
    unit_price: { type: String, trim: true },
    amount: { type: String, trim: true },
  },
  { _id: false }
);

const ChargeLineSchema = new mongoose.Schema({
  chargeDescription: String,
  basis: {
    type: String,
    enum: [
      "Per Package", "By Gross Wt", "By Chg Wt", "By Volume",
      "Per Container", "Per TEU", "Per FEU", "% of Other Charges",
      "% of Assessable Value", "% of AV+Duty", "% of CIF Value",
      "Per Vehicle", "% of Invoice Value", "Per License",
      "Per B/E - Per Shp", "% of Product Value", "Per Labour",
      "Per Product", "By Net Wt", "Per Invoice"
    ],
    default: "Per B/E - Per Shp"
  },
  qty: { type: Number, default: 1 },
  unit: { type: String, default: "" },
  currency: { type: String, default: "INR" },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  amountINR: { type: Number, default: 0 },
  exchangeRate: { type: Number, default: 1 },
  overrideAutoRate: { type: Boolean, default: false },
  isPosted: { type: Boolean, default: false },
  party: { type: mongoose.Schema.Types.ObjectId },
  partyName: { type: String },
  partyType: { type: String },
  branchCode: { type: String },
  url: [{ type: String }],

  // GST & TDS Fields
  isGst: { type: Boolean, default: false },
  gstRate: { type: Number, default: 18 },
  gstAmount: { type: Number, default: 0 },
  basicAmount: { type: Number, default: 0 },
  isTds: { type: Boolean, default: false },
  tdsPercent: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  netPayable: { type: Number, default: 0 }
}, { _id: false });

const ChargeSchema = new mongoose.Schema({
  chargeHead: { type: String, required: true },
  chargeHeadRef: { type: mongoose.Schema.Types.ObjectId, ref: "ChargeHead" },
  category: { type: String },
  costCenter: { type: String },
  remark: { type: String },
  invoice_number: { type: String, trim: true },
  invoice_date: { type: String, trim: true },
  invoice_value: { type: String, trim: true },
  purchase_book_no: { type: String, trim: true },
  purchase_book_status: { type: String, default: '' },
  payment_request_no: { type: String, trim: true },
  payment_request_status: { type: String, default: '' },
  isPurchaseBookMandatory: { type: Boolean, default: false },
  payment_request_is_approved: { type: Boolean, default: false },
  payment_request_approved_byFirst: { type: String, trim: true },
  payment_request_approved_byLast: { type: String, trim: true },
  payment_request_approved_at: { type: Date },
  payment_request_requested_by: { type: String, trim: true },
  payment_request_transaction_type: { type: String, trim: true },
  payment_request_receipt_url: { type: String, trim: true },
  purchase_book_is_approved: { type: Boolean, default: false },
  purchase_book_approved_byFirst: { type: String, trim: true },
  purchase_book_approved_byLast: { type: String, trim: true },
  purchase_book_approved_at: { type: Date },
  purchase_book_requested_by: { type: String, trim: true },
  purchase_book_receipt_url: { type: String, trim: true },
  utrNumber: { type: String, trim: true },
  utrAddedBy: { type: String, trim: true },
  utrAddedAt: { type: Date },

  revenue: ChargeLineSchema,
  cost: ChargeLineSchema,
  copyToCost: { type: Boolean, default: true },

  // New fields for heading and tax reporting
  isHeader: { type: Boolean, default: false },
  sacHsn: { type: String, trim: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ChargeSchema.pre("save", function (next) {
  if (this.revenue) {
    this.revenue.amount = (this.revenue.rate || 0) * (this.revenue.qty || 0);
    this.revenue.amountINR = this.revenue.amount * (this.revenue.exchangeRate || 1);
  }
  if (this.cost) {
    this.cost.amount = (this.cost.rate || 0) * (this.cost.qty || 0);
    this.cost.amountINR = this.cost.amount * (this.cost.exchangeRate || 1);
  }

  if (this.isNew && this.copyToCost && this.revenue && this.cost) {
    this.cost.rate = this.revenue.rate;
    this.cost.amount = this.revenue.amount;
    this.cost.amountINR = this.revenue.amountINR;
    this.cost.currency = this.revenue.currency;
    this.cost.basis = this.revenue.basis;
  }

  this.updatedAt = Date.now();
  next();
});

const jobSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now, // Automatically sets the current date and time
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },

  job_date: {
    type: String,
    trim: true,
    default: () => new Date().toISOString(), // Optional for specific fields like `job_date`
  },

  ////////////////////////////////////////////////// Excel sheet
  year: { type: String, trim: true },
  job_no: { type: String, trim: true },

  // New Structured Fields
  job_number: { type: String, trim: true, unique: true, sparse: true },
  branch_id: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
  branch_code: { type: String, trim: true },
  trade_type: { type: String, trim: true, enum: ["IMP", "EXP"] },
  mode: { type: String, trim: true, enum: ["SEA", "AIR"] },
  sequence_number: { type: Number },
  financial_year: { type: String, trim: true },

  custom_house: { type: String, trim: true },
  job_date: { type: String, trim: true },
  importer: { type: String, trim: true },
  importer_type: { type: String, trim: true },
  commercial_tax_type: { type: String, trim: true },
  supplier_exporter: { type: String, trim: true },
  invoice_number: { type: String, trim: true },
  invoice_date: { type: String, trim: true },
  po_no: { type: String, trim: true },
  po_date: { type: String, trim: true },
  awb_bl_no: { type: String, trim: true },
  awb_bl_date: { type: String, trim: true },
  description: { type: String, trim: true },
  description_details: [descriptionDetailsSchema],
  invoice_details: [invoiceDetailsSchema],
  hawb_hbl_no: { type: String, trim: true },
  hawb_hbl_date: { type: String, trim: true },
  be_no: { type: String, trim: true },
  in_bond_be_no: { type: String, trim: true },
  be_date: { type: String, trim: true },
  be_filing_type: { type: String, trim: true },
  in_bond_be_date: { type: String, trim: true },
  type_of_b_e: { type: String, trim: true },
  no_of_pkgs: { type: String, trim: true },
  unit: { type: String, trim: true },
  gross_weight: { type: String, trim: true },
  firstCheck: { type: String, trim: true },
  job_net_weight: { type: String, trim: true },
  priorityJob: { type: String, trim: true, default: "Normal" },
  unit_1: { type: String, trim: true },
  gateway_igm: { type: String, trim: true },
  gateway_igm_date: { type: String, trim: true },
  hss: { type: String, trim: true, default: "No" },
  saller_name: { type: String, trim: true },
  igm_no: { type: String, trim: true },
  igm_date: { type: String, trim: true },
  loading_port: { type: String, trim: true },
  origin_country: { type: String, trim: true },
  port_of_reporting: { type: String, trim: true },
  shipping_line_airline: { type: String, trim: true },
  branchSrNo: { type: String, trim: true },
  adCode: { type: String, trim: true },
  bank_name: { type: String, trim: true },
  hss_address: {
    category: { type: String, trim: true },
    details: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postal_code: { type: String, trim: true },
    country: { type: String, trim: true },
    ad_code: { type: String, trim: true },
  },
  hss_branch_id: { type: String, trim: true },
  hss_ie_code_no: { type: String, trim: true },
  isDraftDoc: { type: Boolean },
  fta_Benefit_date_time: { type: String, trim: true },
  exBondValue: { type: String, trim: true },
  scheme: { type: String, trim: true },
  clearanceValue: { type: String, trim: true },
  line_no: { type: String, trim: true },
  ie_code_no: { type: String, trim: true },
  gst_no: { type: String, trim: true },
  nfims_no: { type: String, trim: true },
  nfims_date: { type: String, trim: true },
  sims_no: { type: String, trim: true },
  sims_date: { type: String, trim: true },
  container_nos: [
    {
      container_number: { type: String, trim: true },
      arrival_date: { type: String, trim: true },
      detention_from: { type: String, trim: true },
      size: { type: String, trim: true },
      physical_weight: { type: String, trim: true },
      tare_weight: { type: String, trim: true },
      net_weight: { type: String, trim: true },
      container_gross_weight: { type: String, trim: true },
      actual_weight: { type: String, trim: true },
      transporter: { type: String, trim: true },
      vehicle_no: { type: String, trim: true },
      driver_name: { type: String, trim: true },
      driver_phone: { type: String, trim: true },
      seal_no: { type: String, trim: true },
      pre_weighment: { type: String, trim: true },
      post_weighment: { type: String, trim: true },
      weight_shortage: { type: String, trim: true },
      weight_excess: { type: String, trim: true },
      weighment_slip_images: [{ type: String, trim: true }],
      container_pre_damage_images: [{ type: String, trim: true }],
      container_images: [{ type: String, trim: true }],
      loose_material: [{ type: String, trim: true }],
      examination_videos: [{ type: String, trim: true }],
      do_revalidation_date: { type: String, trim: true },
      do_validity_upto_container_level: { type: String, trim: true },
      required_do_validity_upto: { type: String, trim: true },
      seal_number: [{ type: String, trim: true }],
      wire_seal: [{ type: String, trim: true }],
      container_rail_out_date: { type: String, trim: true },
      by_road_movement_date: { type: String, trim: true },
      emptyContainerOffLoadDate: { type: String, trim: true },
      net_weight_as_per_PL_document: { type: String, trim: true },
      delivery_chalan_file: { type: String, trim: true },
      delivery_date: {
        type: String,
        trim: true,
      },

      do_revalidation: [
        {
          do_revalidation_upto: { type: String },
          remarks: { type: String },
          do_Revalidation_Completed: { type: Boolean, default: false },
        },
      ],
    },
  ],
  lockBankDetails: { type: Boolean, default: false },
  is_checklist_aprroved: { type: Boolean, default: false },
  is_checklist_aprroved_date: { type: String, trim: true },
  client_remark: { type: String, trim: true },
  is_checklist_clicked: { type: Boolean, trim: true },
  container_count: { type: String, trim: true },
  no_of_container: { type: String, trim: true },
  toi: { type: String, trim: true },
  unit_price: { type: String, trim: true },
  cif_amount: { type: String, trim: true },
  assbl_value: { type: String, trim: true },
  total_duty: { type: String, trim: true },
  out_of_charge: { type: String, trim: true },
  consignment_type: { type: String, trim: true },
  bill_no: { type: String, trim: true },
  bill_date: { type: String, trim: true },
  cth_no: { type: String, trim: true },
  exrate: { type: String, trim: true },
  inv_currency: { type: String, trim: true },
  vessel_berthing: {
    type: String,
    trim: true,
  },
  importer_address: {
    details: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postal_code: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  vessel_flight: { type: String },
  voyage_no: { type: String },
  job_owner: { type: String },
  hss_name: { type: String },
  total_inv_value: { type: String },

  ////////////////////////////////////////////////// DSR
  importerURL: { type: String, trim: true },
  checklist: [{ type: String }],
  checkedDocs: [{ type: String }],
  // *******
  status: { type: String, trim: true },
  detailed_status: { type: String, trim: true },
  row_color: { type: String, trim: true },
  status_rank: { type: Number, default: 999 },
  status_sort_date: {
    type: Date,
    default: () => new Date("9999-12-31T23:59:59.999Z"),
  },
  // *******
  obl_telex_bl: { type: String },
  document_received_date: { type: String, trim: true },
  doPlanning: { type: Boolean },
  do_planning_date: { type: String, trim: true },
  type_of_Do: { type: String },
  do_validity_upto_job_level: { type: String, trim: true },
  do_revalidation_upto_job_level: { type: String, trim: true },
  cfs_name: { type: String, trim: true },
  do_revalidation: { type: Boolean },
  do_revalidation_date: { type: String },
  // rail_out_date: { type: String },
  examinationPlanning: { type: Boolean },
  examination_planning_date: { type: String, trim: true },
  processed_be_attachment: [{ type: String }],
  ooc_copies: [{ type: String }],
  in_bond_ooc_copies: [{ type: String }],
  gate_pass_copies: [{ type: String }],
  // *******
  sims_reg_no: {
    type: String,
    trim: true,
  },
  pims_reg_no: {
    type: String,
    trim: true,
  },
  nfmims_reg_no: {
    type: String,
    trim: true,
  },
  sims_date: {
    type: String,
    trim: true,
  },
  pims_date: {
    type: String,
    trim: true,
  },
  nfmims_date: {
    type: String,
    trim: true,
  },
  // *******
  discharge_date: {
    type: String,
    trim: true,
  },
  assessment_date: {
    type: String,
    trim: true,
  },
  duty_paid_date: {
    type: String,
    trim: true,
  },
  do_validity: { type: String, trim: true },
  // delivery_date: {
  //   type: String,
  //   trim: true,
  // },
  containers_arrived_on_same_date: Boolean,
  // *******
  remarks: { type: String, trim: true },
  // *******
  free_time: { type: Number, trim: true, default: 0 },
  is_free_time_updated: { type: Boolean, default: false },
  factory_weighment_slip: { type: String, trim: true },
  assessable_ammount: { type: String, trim: true },
  bcd_ammount: { type: String, trim: true },
  igst_ammount: { type: String, trim: true },
  sws_ammount: { type: String, trim: true },
  intrest_ammount: { type: String, trim: true },
  fine_amount: { type: String, trim: true },
  penalty_amount: { type: String, trim: true },
  penalty_by_us: { type: Boolean, default: false },
  penalty_by_importer: { type: Boolean, default: false },
  zero_penalty_as_per_bill_of_entry: { type: Boolean, default: false },

  ////////////////////////////////////////////////// E-sanchit
  esanchit_completed_date_time: { type: String, trim: true },

  ////////////////////////////////////////////////// DO
  shipping_line_bond_completed: { type: String, trim: true },
  shipping_line_bond_charges: {
    type: String,
    trim: true,
  },
  shipping_line_bond_completed_date: { type: String, trim: true },
  shipping_line_kyc_completed: { type: String, trim: true },
  shipping_line_kyc_completed_date: { type: String, trim: true },
  shipping_line_invoice_received: { type: String, trim: true },
  shipping_line_invoice_received_date: { type: String, trim: true },
  shipping_line_insurance: [{ type: String, trim: true }],
  // *******
  do_shipping_line_invoice: [
    {
      document_name: { type: String, trim: true },
      url: [{ type: String, trim: true }],
      is_draft: { type: Boolean },
      is_final: { type: Boolean },
      document_check_date: { type: String, trim: true }, // This will store ISO string when checked
      document_check_status: { type: Boolean, default: false }, // New field to track if document is checked
    },
  ],

  insurance_copy: [
    {
      document_name: { type: String, trim: true },
      url: [{ type: String, trim: true }],
      is_draft: { type: Boolean },
      is_final: { type: Boolean },
      document_check_date: { type: String, trim: true }, // This will store ISO string when checked
      document_check_status: { type: Boolean, default: false }, // New field to track if document is checked
    },
  ],

  security_deposit: [
    {
      document_name: { type: String, trim: true },
      url: [{ type: String, trim: true }],
      is_draft: { type: Boolean },
      is_final: { type: Boolean },
      document_check_date: { type: String, trim: true }, // This will store ISO string when checked
      document_check_status: { type: Boolean, default: false }, // New field to track if document is checked
    },
  ],
  security_amount: { type: String },
  utr: [
    {
      type: String,
      trim: true,
    },
  ],
  shipping_line_attachment: [
    {
      type: String,
      trim: true,
    },
  ],
  other_invoices: { type: String, trim: true },
  other_invoices_img: [{ type: String, trim: true }],
  other_invoices_date: { type: String, trim: true },
  payment_made: { type: String, trim: true },
  payment_made_date: { type: String, trim: true },
  payment_method: { type: String, trim: true, default: "Transaction" },
  do_processed: { type: String, trim: true },
  do_documents: [{ type: String, trim: true }],
  do_processed_date: { type: String, trim: true },
  do_copies: [{ type: String }],
  shipping_line_invoice: { type: String, trim: true },
  shipping_line_invoice_date: { type: String },
  shipping_line_invoice_imgs: [{ type: String, trim: true }],
  do_queries: [
    {
      query: { type: String },
      reply: { type: String },
      resolved: { type: Boolean, default: false },
    },
  ],
  dsr_queries: [
    {
      query: { type: String },
      current_module: { type: String },
      select_module: { type: String },
      reply: { type: String },
      resolved: { type: Boolean, default: false },
      resolved_by: { type: String },
      send_by: { type: String },
      replied_by: { type: String },
    },
  ],
  do_completed: { type: String, trim: true },
  misc_charges: [
    {
      charge_type: { type: String, trim: true },
      currency: { type: String, trim: true },
      exchange_rate: { type: Number, default: 1 },
      rate_percent: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
      amount_inr: { type: Number, default: 0 },
      remark: { type: String, trim: true }
    }
  ],
  // *******
  icd_cfs_invoice: { type: String, trim: true },

  icd_cfs_invoice_date: { type: String, trim: true },

  import_terms: { type: String, trim: true },
  cifValue: { type: String, trim: true },
  freight: { type: String, trim: true },
  insurance: { type: String, trim: true },

  do_received: { type: String, trim: true },
  do_received_date: { type: String, trim: true },
  is_obl_recieved: { type: Boolean, default: false },
  obl_recieved_date: { type: String, trim: true },
  og_doc_recieved_date: { type: String, trim: true },

  do_completed_updated: {
    type: Date,
  },
  doPlanning_updated: {
    type: Date,
  },
  met_do_billing_conditions_date: {
    type: Date,
  },

  is_do_doc_recieved: { type: Boolean, default: false },
  do_doc_recieved_date: { type: String, trim: true },
  is_do_doc_prepared: { type: Boolean, default: false },
  is_og_doc_recieved: { type: Boolean, default: false },
  do_doc_prepared_date: { type: String, trim: true },
  ////////////////////////////////////////////////// documentation
  documentation_completed_date_time: { type: String, trim: true },

  ////////////////////////////////////////////////// Operations
  pcv_date: { type: String },
  examination_date: {
    type: String,
    trim: true,
  },
  concor_gate_pass_date: { type: String, trim: true },
  concor_gate_pass_validate_up_to: { type: String, trim: true },
  completed_operation_date: { type: String, trim: true },
  custodian_gate_pass: [{ type: String, trim: true }],
  concor_invoice_and_receipt_copy: [{ type: String, trim: true }],
  thar_invoices: [{ type: String, trim: true }],
  hasti_invoices: [{ type: String, trim: true }],

  ////////////////////////////////////////////////// LR
  pr_no: { type: String, trim: true },
  pr_date: { type: String, trim: true },
  consignor: { type: String },
  consignee: { type: String },
  type_of_vehicle: { type: String },
  description_srcc: { type: String },
  container_loading: { type: String },
  container_offloading: { type: String },
  instructions: { type: String },
  goods_pickup: { type: String },
  goods_delivery: { type: String },

  ////////////////////////////////////////////form data
  account_fields: [masterTypeSchema],

  account_types: [accountEntrySchema],

  ////////////////////////////////////////////////// CTH Documents
  cth_documents: [cthDocumentSchema],
  eSachitQueries: [
    {
      query: { type: String },
      reply: { type: String },
      resolved: { type: Boolean, default: false },
    },
  ],

  ////////////////////////////////////////////////////// Documents
  documents: [documentSchema],
  all_documents: [{ type: String, trim: true }],

  ////////////////////////////////////////////////////// Documentation
  document_entry_completed: { type: Boolean },
  documentationQueries: [
    {
      query: { type: String },
      reply: { type: String },
      resolved: { type: Boolean, default: false },
    },
  ],

  charges: [ChargeSchema],




  ////////////////////////////////////////////////////// Submission
  checklist_verified_on: { type: String },
  submission_date: { type: String },
  submissionQueries: [
    {
      query: { type: String },
      reply: { type: String },
      resolved: { type: Boolean, default: false },
    },
  ],
  verified_checklist_upload: [{ type: String, trim: true }],
  verified_checklist_upload_date_and_time: { type: String },
  submission_completed_date_time: { type: String },
  is_sent_to_submission: { type: Boolean, default: false },
  sent_to_submission_user_name: { type: String },
  sent_to_submission_date_time: { type: String },
  job_sticker_upload: [{ type: String, trim: true }],
  job_sticker_upload_date_and_time: { type: String },

  ////////////////////////////////////////////////// accounts

  billing_completed_date: { type: String },
  bill_document_sent_to_accounts: { type: String, trim: true },
  icd_cfs_invoice_img: [{ type: String, trim: true }],
  upload_agency_bill_img: { type: String },
  upload_reimbursement_bill_img: { type: String },
  bill_amount: { type: String },
  do_list: { type: String, trim: true },

  advanced_payment_done: { type: Boolean, default: false },
  advanced_payment_date: { type: Date },
  advanced_payment_by: { type: String },

  imexcube_uploaded: { type: Boolean, default: false },
  imexcube_uploaded_at: { type: Date },
  imexcube_response: { type: mongoose.Schema.Types.Mixed },
  imexcube_last_action: { type: String, enum: ["created", "updated", "duplicate", "error"] },
  imexcube_last_status_code: { type: Number },
  imexcube_last_message: { type: String },

  ////////////////////////////////////////////////// Display
});

// Automatically update `updatedAt` before saving
jobSchema.pre("save", async function (next) {
  this.updatedAt = Date.now();

  try {
    const jobObj = this.toObject();

    // Fetch branch configuration for conditional status logic
    let branchConfig = null;
    if (this.branch_id) {
      const branch = await BranchModel.findById(this.branch_id)
        .select("configuration")
        .lean();
      branchConfig = branch?.configuration;
    }

    const detStatus = determineDetailedStatus(jobObj, branchConfig);

    // Only update if not explicitly set (or always update? usually computed overrides manual)
    // We'll update it to ensure consistency.
    this.detailed_status = detStatus;
    this.row_color = getRowColorFromStatus(detStatus);
    this.status_rank = getJobStatusRank(detStatus);
    this.status_sort_date = getJobSortDate(jobObj, detStatus);

    // Automatic Container Count Calculation
    if (this.container_nos && Array.isArray(this.container_nos)) {
      const counts = {};
      this.container_nos.forEach(container => {
        const size = container.size || "Unknown";
        counts[size] = (counts[size] || 0) + 1;
      });

      const summary = Object.entries(counts)
        .map(([size, count]) => `${count}x${size}`)
        .join(", ");

      this.no_of_container = summary;
      this.container_count = this.container_nos.length.toString();
    }
  } catch (err) {
    console.error("Error computing derived job fields:", err);
    // Don't block save, but maybe log?
  }

  next();
});

// Systematic fix for address object transition
jobSchema.pre("validate", function (next) {
  // If importer_address is a string, convert it to an object with the string in 'details'
  if (typeof this.importer_address === "string") {
    const originalValue = this.importer_address;
    this.importer_address = {
      details: originalValue,
    };
  }

  // If hss_address is a string, convert it to an object with the string in 'details'
  if (typeof this.hss_address === "string") {
    const originalValue = this.hss_address;
    this.hss_address = {
      details: originalValue,
    };
  }
  next();
});

// ==================== PERFORMANCE OPTIMIZATION INDEXES ====================
// These indexes dramatically improve search performance for the most common queries

// Existing indexes - keep for compatibility, but drop the overly restrictive duplicate key check
jobSchema.index({ importerURL: 1, year: 1, status: 1 });
// Allowed duplicate job_no across modes and trade types for the same branch and year
jobSchema.index({ branch_id: 1, year: 1, trade_type: 1, mode: 1, job_no: 1 }, { unique: true });

// New indexes for structured job numbers and branch management
jobSchema.index({ job_number: 1 }, { unique: true, sparse: true });
jobSchema.index({ branch_id: 1 });
jobSchema.index({ branch_id: 1, createdAt: 1 });
jobSchema.index({ branch_code: 1, trade_type: 1, mode: 1, financial_year: 1 });

// NEW: Indexes for primary search filters
jobSchema.index({ year: 1, status: 1, detailed_status: 1 });
jobSchema.index({ year: 1, importer: 1, status: 1 });
jobSchema.index({ year: 1, custom_house: 1, status: 1 });

// NEW: Indexes for searchable fields (50-100x faster than collection scan)
jobSchema.index({ job_no: 1, year: 1 });
jobSchema.index({ awb_bl_no: 1, year: 1 });
jobSchema.index({ be_no: 1, year: 1 });
jobSchema.index({ supplier_exporter: 1, year: 1 });
jobSchema.index({ importer: 1, year: 1 });

// NEW: Full-text search index (100-500x faster than regex for text searches)
// Supports searching across multiple fields simultaneously
jobSchema.index({
  job_no: "text",
  importer: "text",
  awb_bl_no: "text",
  supplier_exporter: "text",
  custom_house: "text",
  be_no: "text",
  type_of_b_e: "text",
  consignment_type: "text",
  vessel_berthing: "text",
});

// NEW: Composite index for sorting by status and detention date (common operation)
jobSchema.index({ year: 1, status: 1, "container_nos.detention_from": 1 });

// NEW: Optimized indexes for Status Ranking and Sorting
jobSchema.index({ year: 1, status_rank: 1, status_sort_date: 1 });
jobSchema.index({ year: 1, detailed_status: 1 });

jobSchema.plugin(auditPlugin, { documentType: "Job" });

const JobModel = new mongoose.model("Job", jobSchema);
export default JobModel;

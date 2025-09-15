import mongoose from "mongoose";

// Image Schema for document attachments
const ImageSchema = new mongoose.Schema({
  url: { type: String, trim: true },
});

// Field Schema for dynamic custom fields
const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['text', 'number', 'date', 'select', 'boolean'] 
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }], // For select fields
  order: { type: Number, default: 0 }
});



// Custom Field Schema for dynamic data
const customFieldSchema = new mongoose.Schema({
  fieldId: { type: mongoose.Schema.Types.ObjectId, required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
});

// Account Entry Schema
const accountEntrySchema = new mongoose.Schema({
  masterTypeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterType', 
    required: true 
  },
  companyName: { type: String, required: true },
  address: { type: String, required: true },
  dueDate: { type: Date, required: true },
  reminderFrequency: { 
    type: String, 
    required: true, 
    enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'] 
  },
  customFields: [customFieldSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Export Document Schema
const exportDocumentSchema = new mongoose.Schema({
  document_name: { type: String, trim: true },
  document_code: { type: String, trim: true },
  url: [{ type: String, trim: true }],
  document_number: { type: String, trim: true },
  issue_date: { type: String, trim: true },
  expiry_date: { type: String, trim: true },
  document_check_date: { type: String, trim: true },
  is_verified: { type: Boolean, default: false },
  verification_date: { type: String, trim: true },
});

// Shipping Bill Document Schema
const shippingBillDocumentSchema = new mongoose.Schema({
  sb_number: { type: String, trim: true },
  sb_date: { type: String, trim: true },
  sb_type: { 
    type: String, 
    trim: true,
    enum: ['duty_free', 'dutiable', 'drawback', 'coastal', 'ex_bond']
  },
  sb_color_code: { type: String, trim: true }, // white, yellow, green, pink
  customs_house_code: { type: String, trim: true },
  port_of_loading: { type: String, trim: true },
  country_of_destination: { type: String, trim: true },
  url: [{ type: String, trim: true }],
  document_check_date: { type: String, trim: true },
  let_export_order_date: { type: String, trim: true },
  is_sb_filed: { type: Boolean, default: false },
  sb_filing_date: { type: String, trim: true },
});

// Container/Package Schema for Export
const exportContainerSchema = new mongoose.Schema({
  container_number: { type: String, trim: true },
  container_type: { type: String, trim: true }, // FCL, LCL
  container_size: { type: String, trim: true }, // 20ft, 40ft, 40HC
  seal_number: { type: String, trim: true },
  stuffing_date: { type: String, trim: true },
  stuffing_location: { type: String, trim: true },
  gross_weight: { type: String, trim: true },
  net_weight: { type: String, trim: true },
  tare_weight: { type: String, trim: true },
  volume: { type: String, trim: true },
  packages_count: { type: String, trim: true },
  package_type: { type: String, trim: true }, // Cartons, Pallets, Bags, etc.
  marks_and_numbers: { type: String, trim: true },
  container_images: [{ type: String, trim: true }],
  stuffing_images: [{ type: String, trim: true }],
  seal_images: [{ type: String, trim: true }],
  weighment_slip: [{ type: String, trim: true }],
  vgm_certificate: [{ type: String, trim: true }], // Verified Gross Mass
  vgm_date: { type: String, trim: true },
  gate_in_date: { type: String, trim: true },
  gate_out_date: { type: String, trim: true },
  loading_date: { type: String, trim: true },
  departure_date: { type: String, trim: true },
});

// Charges Schema for Export
const exportChargesSchema = new mongoose.Schema({
  charge_type: { type: String, trim: true }, // freight, insurance, handling, etc.
  charge_description: { type: String, trim: true },
  amount: { type: String, trim: true },
  currency: { type: String, trim: true },
  payment_terms: { type: String, trim: true },
  invoice_number: { type: String, trim: true },
  invoice_date: { type: String, trim: true },
  payment_status: { type: String, trim: true },
  payment_date: { type: String, trim: true },
  document_urls: [{ type: String, trim: true }],
});

// Certificate Schema
const certificateSchema = new mongoose.Schema({
  certificate_type: { type: String, trim: true },
  certificate_number: { type: String, trim: true },
  issue_date: { type: String, trim: true },
  expiry_date: { type: String, trim: true },
  issuing_authority: { type: String, trim: true },
  certificate_urls: [{ type: String, trim: true }],
  is_required: { type: Boolean, default: false },
  is_obtained: { type: Boolean, default: false },
});

// Main Export Job Schema
const exportJobSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },

  ////////////////////////////////////////////////// Basic Job Information
  year: { type: String, trim: true },
  job_no: { type: String, trim: true },
  job_date: {
    type: String,
    trim: true,
    default: () => new Date().toISOString(),
  },
  job_type: { 
    type: String, 
    trim: true, 
    enum: ['air_export', 'sea_export', 'land_export', 'courier_export'],
    default: 'sea_export'
  },
  movement_type: { 
    type: String, 
    trim: true,
    enum: ['FCL', 'LCL', 'Air_Cargo', 'Break_Bulk', 'Courier']
  },
  incoterms: { 
    type: String, 
    trim: true,
    enum: ['FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'DDU', 'FCA', 'CPT', 'CIP']
  },
  priority_level: { 
    type: String, 
    trim: true, 
    default: "Normal",
    enum: ['High', 'Normal', 'Low', 'Urgent']
  },
  status: { type: String, trim: true },
  detailed_status: { type: String, trim: true },

  // Additional tracking fields for your export schema
container_placement_date_factory: { type: String, trim: true },
original_docs_received_date: { type: String, trim: true },
gate_in_thar_khodiyar_date: { type: String, trim: true },
gate_in_thar_khodiyar_time: { type: String, trim: true },
hand_over_date: { type: String, trim: true },
file_hand_over_date: { type: String, trim: true },
rail_out_date_plan: { type: String, trim: true },
rail_out_date_actual: { type: String, trim: true },
port_gate_in_date: { type: String, trim: true },
cargo_arrived_icd_date: { type: String, trim: true },
customs_clearance_done: { type: Boolean, default: false },
cntr_size: { type: String, trim: true, enum: ['20', '40', '20HC', '40HC', 'AIR'] },
port_of_origin: { type: String, trim: true },
docs_received_date: { type: String, trim: true },
tracking_remarks: { type: String, trim: true },
operation_remarks: { type: String, trim: true },


  ////////////////////////////////////////////////// Exporter Information
  exporter_name: { type: String, trim: true, required: true },
  exporter_address: { type: String, trim: true },
  exporter_city: { type: String, trim: true },
  exporter_state: { type: String, trim: true },
  exporter_country: { type: String, trim: true, default: 'India' },
  exporter_pincode: { type: String, trim: true },
  exporter_phone: { type: String, trim: true },
  exporter_email: { type: String, trim: true },
  exporter_fax: { type: String, trim: true },
  exporter_website: { type: String, trim: true },
  
  // Regulatory Information
  ie_code: { type: String, trim: true, required: true }, // Import Export Code
  exporter_pan: { type: String, trim: true },
  exporter_gstin: { type: String, trim: true },
  exporter_tan: { type: String, trim: true },
  ad_code: { type: String, trim: true }, // Authorized Dealer Code
  rcmc_number: { type: String, trim: true }, // Registration Cum Membership Certificate
  rcmc_validity: { type: String, trim: true },
  
  // Banking Information
  bank_name: { type: String, trim: true },
  bank_branch: { type: String, trim: true },
  bank_account_number: { type: String, trim: true },
  bank_ifsc_code: { type: String, trim: true },
  bank_swift_code: { type: String, trim: true },

  ////////////////////////////////////////////////// Consignee/Importer Information
  consignee_name: { type: String, trim: true, required: true },
  consignee_address: { type: String, trim: true },
  consignee_city: { type: String, trim: true },
  consignee_state: { type: String, trim: true },
  consignee_country: { type: String, trim: true },
  consignee_postal_code: { type: String, trim: true },
  consignee_phone: { type: String, trim: true },
  consignee_email: { type: String, trim: true },
  consignee_fax: { type: String, trim: true },
  consignee_tax_id: { type: String, trim: true },

  // Notify Party Information
  notify_party_name: { type: String, trim: true },
  notify_party_address: { type: String, trim: true },
  notify_party_phone: { type: String, trim: true },
  notify_party_email: { type: String, trim: true },

  ////////////////////////////////////////////////// Shipment Details
  port_of_loading: { type: String, trim: true },
  port_of_discharge: { type: String, trim: true },
  final_destination: { type: String, trim: true },
  place_of_receipt: { type: String, trim: true },
  place_of_delivery: { type: String, trim: true },
  country_of_origin: { type: String, trim: true, default: 'India' },
  country_of_final_destination: { type: String, trim: true },
  
  // Vessel/Flight Information
  vessel_flight_name: { type: String, trim: true },
  voyage_flight_number: { type: String, trim: true },
  etd_port_of_loading: { type: String, trim: true }, // Estimated Time of Departure
  eta_port_of_discharge: { type: String, trim: true }, // Estimated Time of Arrival
  actual_departure_date: { type: String, trim: true },
  actual_arrival_date: { type: String, trim: true },
  
  // Carrier Information
  shipping_line_airline: { type: String, trim: true },
  master_bl_awb_number: { type: String, trim: true },
  master_bl_awb_date: { type: String, trim: true },
  house_bl_awb_number: { type: String, trim: true },
  house_bl_awb_date: { type: String, trim: true },
  booking_number: { type: String, trim: true },
  booking_date: { type: String, trim: true },

  ////////////////////////////////////////////////// Cargo Information
  commodity_description: { type: String, trim: true },
  hs_code: { type: String, trim: true },
  total_packages: { type: String, trim: true },
  package_type: { type: String, trim: true },
  gross_weight_kg: { type: String, trim: true },
  net_weight_kg: { type: String, trim: true },
  volume_cbm: { type: String, trim: true },
  dimensions_length: { type: String, trim: true },
  dimensions_width: { type: String, trim: true },
  dimensions_height: { type: String, trim: true },
  marks_and_numbers: { type: String, trim: true },
  special_instructions: { type: String, trim: true },
  
  // Dangerous Goods Information
  is_dangerous_goods: { type: Boolean, default: false },
  un_number: { type: String, trim: true },
  proper_shipping_name: { type: String, trim: true },
  hazard_class: { type: String, trim: true },
  packing_group: { type: String, trim: true },

  ////////////////////////////////////////////////// Commercial Information
  // Invoice Details
  proforma_invoice_number: { type: String, trim: true },
  proforma_invoice_date: { type: String, trim: true },
  proforma_invoice_value: { type: String, trim: true },
  commercial_invoice_number: { type: String, trim: true },
  commercial_invoice_date: { type: String, trim: true },
  commercial_invoice_value: { type: String, trim: true },
  invoice_currency: { type: String, trim: true, default: 'USD' },
  exchange_rate: { type: String, trim: true },
  fob_value: { type: String, trim: true },
  freight_charges: { type: String, trim: true },
  insurance_charges: { type: String, trim: true },
  cif_value: { type: String, trim: true },
  
  // Payment Terms
  payment_terms: { type: String, trim: true },
  payment_method: { 
    type: String, 
    trim: true,
    enum: ['LC', 'TT', 'DA', 'DP', 'Advance', 'CAD', 'Open_Account']
  },
  
  // Letter of Credit Information
  lc_number: { type: String, trim: true },
  lc_date: { type: String, trim: true },
  lc_amount: { type: String, trim: true },
  lc_expiry_date: { type: String, trim: true },
  lc_issuing_bank: { type: String, trim: true },
  lc_advising_bank: { type: String, trim: true },
  lc_confirming_bank: { type: String, trim: true },
  
  // Bill of Exchange
  bill_of_exchange_number: { type: String, trim: true },
  bill_of_exchange_date: { type: String, trim: true },
  bill_of_exchange_amount: { type: String, trim: true },
  bill_of_exchange_tenor: { type: String, trim: true },

  ////////////////////////////////////////////////// Shipping Bill Information
  shipping_bill_number: { type: String, trim: true },
  shipping_bill_date: { type: String, trim: true },
  shipping_bill_type: { 
    type: String, 
    trim: true,
    enum: ['duty_free', 'dutiable', 'drawback', 'coastal', 'ex_bond']
  },
  customs_house: { type: String, trim: true },
  customs_officer_name: { type: String, trim: true },
  
  // LEO (Let Export Order)
  leo_number: { type: String, trim: true },
  leo_date: { type: String, trim: true },
  leo_validity_date: { type: String, trim: true },
  
  // Gate Pass Information
  gate_pass_number: { type: String, trim: true },
  gate_pass_date: { type: String, trim: true },
  gate_pass_validity: { type: String, trim: true },
  cartage_date: { type: String, trim: true },

  ////////////////////////////////////////////////// Export Incentives & Schemes
  export_promotion_scheme: { type: String, trim: true }, // MEIS, SEIS, etc.
  scheme_code: { type: String, trim: true },
  scrip_value: { type: String, trim: true },
  duty_drawback_rate: { type: String, trim: true },
  duty_drawback_amount: { type: String, trim: true },
  duty_drawback_claimed: { type: Boolean, default: false },
  duty_drawback_received_date: { type: String, trim: true },
  
  // Export Finance
  export_finance_required: { type: Boolean, default: false },
  packing_credit_limit: { type: String, trim: true },
  packing_credit_utilized: { type: String, trim: true },
  export_bill_negotiated_date: { type: String, trim: true },
  export_proceeds_realization_date: { type: String, trim: true },

  ////////////////////////////////////////////////// Containers Information
  containers: [exportContainerSchema],
  container_count: { type: String, trim: true },
  stuffing_location: { type: String, trim: true },
  stuffing_date: { type: String, trim: true },
  stuffing_time: { type: String, trim: true },
  
  // CFS/Terminal Information
  cfs_terminal_name: { type: String, trim: true },
  cfs_gate_in_date: { type: String, trim: true },
  cfs_gate_out_date: { type: String, trim: true },
  terminal_handling_charges: { type: String, trim: true },

  ////////////////////////////////////////////////// Documentation Module
  export_documents: [exportDocumentSchema],
  shipping_bill_documents: [shippingBillDocumentSchema],
  certificates: [certificateSchema],
  all_documents: [{ type: String, trim: true }],
  
  // Certificate Requirements
  certificate_of_origin_required: { type: Boolean, default: false },
  certificate_of_origin_number: { type: String, trim: true },
  certificate_of_origin_date: { type: String, trim: true },
  certificate_of_origin_issuing_authority: { type: String, trim: true },
  
  phytosanitary_certificate_required: { type: Boolean, default: false },
  phytosanitary_certificate_number: { type: String, trim: true },
  phytosanitary_certificate_date: { type: String, trim: true },
  
  quality_inspection_certificate: { type: String, trim: true },
  quality_inspection_date: { type: String, trim: true },
  quality_inspection_agency: { type: String, trim: true },
  
  fumigation_certificate_number: { type: String, trim: true },
  fumigation_certificate_date: { type: String, trim: true },
  fumigation_validity_date: { type: String, trim: true },
  
  insurance_policy_number: { type: String, trim: true },
  insurance_policy_date: { type: String, trim: true },
  insurance_company: { type: String, trim: true },
  insurance_amount: { type: String, trim: true },

  ////////////////////////////////////////////////// Regulatory Compliance
  // Export License Information
  export_license_required: { type: Boolean, default: false },
  export_license_number: { type: String, trim: true },
  export_license_date: { type: String, trim: true },
  export_license_validity: { type: String, trim: true },
  export_license_authority: { type: String, trim: true },
  
  // FSSAI (for food products)
  fssai_license_number: { type: String, trim: true },
  fssai_license_validity: { type: String, trim: true },
  
  // Drug License (for pharmaceutical products)
  drug_license_number: { type: String, trim: true },
  drug_license_validity: { type: String, trim: true },
  
  // Textile Committee Registration
  textile_committee_registration: { type: String, trim: true },
  
  // BIS Certification
  bis_license_number: { type: String, trim: true },
  bis_license_validity: { type: String, trim: true },

  ////////////////////////////////////////////////// Milestone Tracking
  booking_confirmation_date: { type: String, trim: true },
  documentation_start_date: { type: String, trim: true },
  documentation_completion_date: { type: String, trim: true },
  pre_shipment_inspection_date: { type: String, trim: true },
  customs_clearance_date: { type: String, trim: true },
  cargo_pickup_date: { type: String, trim: true },
  port_terminal_arrival_date: { type: String, trim: true },
  loading_completion_date: { type: String, trim: true },
  vessel_departure_date: { type: String, trim: true },
  in_transit_milestone_dates: [{ 
    location: { type: String },
    date: { type: String },
    remarks: { type: String }
  }],
  destination_arrival_date: { type: String, trim: true },
  destination_customs_clearance_date: { type: String, trim: true },
  final_delivery_date: { type: String, trim: true },

  ////////////////////////////////////////////////// Charges and Financial
  export_charges: [exportChargesSchema],
  
  // Freight Charges
  ocean_freight: { type: String, trim: true },
  air_freight: { type: String, trim: true },
  inland_transportation: { type: String, trim: true },
  
  // Handling Charges
  origin_handling_charges: { type: String, trim: true },
  destination_handling_charges: { type: String, trim: true },
  documentation_charges: { type: String, trim: true },
  customs_clearance_charges: { type: String, trim: true },
  
  // Other Charges
  warehouse_charges: { type: String, trim: true },
  stuffing_charges: { type: String, trim: true },
  weighment_charges: { type: String, trim: true },
  survey_charges: { type: String, trim: true },
  fumigation_charges: { type: String, trim: true },
  
  // Total Calculations
  total_freight_charges: { type: String, trim: true },
  total_other_charges: { type: String, trim: true },
  total_charges: { type: String, trim: true },

  ////////////////////////////////////////////////// Agent Information
  freight_forwarder_name: { type: String, trim: true },
  freight_forwarder_code: { type: String, trim: true },
  freight_forwarder_contact_person: { type: String, trim: true },
  freight_forwarder_phone: { type: String, trim: true },
  freight_forwarder_email: { type: String, trim: true },
  
  customs_broker_name: { type: String, trim: true },
  customs_broker_license: { type: String, trim: true },
  customs_broker_contact_person: { type: String, trim: true },
  customs_broker_phone: { type: String, trim: true },
  customs_broker_email: { type: String, trim: true },
  
  origin_agent_name: { type: String, trim: true },
  origin_agent_contact_person: { type: String, trim: true },
  origin_agent_phone: { type: String, trim: true },
  origin_agent_email: { type: String, trim: true },
  
  destination_agent_name: { type: String, trim: true },
  destination_agent_contact_person: { type: String, trim: true },
  destination_agent_phone: { type: String, trim: true },
  destination_agent_email: { type: String, trim: true },

  ////////////////////////////////////////////////// Quality Control
  pre_shipment_inspection_required: { type: Boolean, default: false },
  inspection_agency: { type: String, trim: true },
  inspection_date: { type: String, trim: true },
  inspection_certificate_number: { type: String, trim: true },
  inspection_report: [{ type: String, trim: true }],
  
  quality_control_passed: { type: Boolean, default: false },
  quality_control_date: { type: String, trim: true },
  quality_control_remarks: { type: String, trim: true },
  
  quantity_verification_done: { type: Boolean, default: false },
  quantity_verification_date: { type: String, trim: true },
  weight_verification_done: { type: Boolean, default: false },
  weight_verification_date: { type: String, trim: true },

  ////////////////////////////////////////////////// Communication & Queries
  export_queries: [{
    query: { type: String },
    module: { type: String },
    raised_by: { type: String },
    assigned_to: { type: String },
    reply: { type: String },
    replied_by: { type: String },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
    created_date: { type: String },
    resolved_date: { type: String },
    resolved: { type: Boolean, default: false }
  }],
  
  documentation_queries: [{
    query: { type: String },
    reply: { type: String },
    resolved: { type: Boolean, default: false },
    raised_by: { type: String },
    resolved_by: { type: String },
    created_date: { type: String },
    resolved_date: { type: String }
  }],
  
  customs_queries: [{
    query: { type: String },
    customs_officer: { type: String },
    reply: { type: String },
    resolved: { type: Boolean, default: false },
    query_date: { type: String },
    resolved_date: { type: String }
  }],

  ////////////////////////////////////////////////// Special Requirements
  // Temperature Controlled
  temperature_controlled: { type: Boolean, default: false },
  temperature_range_min: { type: String, trim: true },
  temperature_range_max: { type: String, trim: true },
  temperature_unit: { type: String, trim: true, enum: ['Celsius', 'Fahrenheit'] },
  
  // Hazardous Materials
  hazardous_material: { type: Boolean, default: false },
  hazmat_class: { type: String, trim: true },
  hazmat_packing_group: { type: String, trim: true },
  hazmat_flash_point: { type: String, trim: true },
  
  // High Value Cargo
  high_value_cargo: { type: Boolean, default: false },
  declared_value_for_carriage: { type: String, trim: true },
  declared_value_for_customs: { type: String, trim: true },
  
  // Oversized Cargo
  oversized_cargo: { type: Boolean, default: false },
  special_equipment_required: { type: String, trim: true },
  special_handling_instructions: { type: String, trim: true },

  ////////////////////////////////////////////////// Compliance Checklist
  export_compliance_checklist: [{
    item: { type: String },
    required: { type: Boolean, default: true },
    completed: { type: Boolean, default: false },
    completion_date: { type: String },
    completed_by: { type: String },
    remarks: { type: String }
  }],
  
  document_checklist_verified: { type: Boolean, default: false },
  document_checklist_verified_date: { type: String, trim: true },
  document_checklist_verified_by: { type: String, trim: true },
  
  ready_for_shipment: { type: Boolean, default: false },
  ready_for_shipment_date: { type: String, trim: true },
  ready_for_shipment_approved_by: { type: String, trim: true },

  ////////////////////////////////////////////////// Additional Information
  remarks: { type: String, trim: true },
  internal_notes: { type: String, trim: true },
  customer_instructions: { type: String, trim: true },
  special_requirements: { type: String, trim: true },
  
  // Job Assignment
  job_owner: { type: String, trim: true },
  assigned_documentation_executive: { type: String, trim: true },
  assigned_operations_executive: { type: String, trim: true },
  assigned_accounts_executive: { type: String, trim: true },
  
  // Completion Status
  documentation_completed: { type: Boolean, default: false },
  documentation_completed_date: { type: String, trim: true },
  operations_completed: { type: Boolean, default: false },
  operations_completed_date: { type: String, trim: true },
  accounts_completed: { type: Boolean, default: false },
  accounts_completed_date: { type: String, trim: true },
  job_completed: { type: Boolean, default: false },
  job_completed_date: { type: String, trim: true },


});

// Automatically update updatedAt before saving
exportJobSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for performance optimization
exportJobSchema.index({ year: 1, job_no: 1 }, { unique: true });
exportJobSchema.index({ ie_code: 1, year: 1 });
exportJobSchema.index({ exporter_name: 1, year: 1 });
exportJobSchema.index({ status: 1, job_date: 1 });
exportJobSchema.index({ shipping_bill_number: 1 });
exportJobSchema.index({ consignee_country: 1, year: 1 });
exportJobSchema.index({ createdAt: 1 });
exportJobSchema.index({ updatedAt: 1 });

// Create and export the model
const ExJobModel = mongoose.model("ExportJob", exportJobSchema);
export default ExJobModel;

import mongoose from "mongoose";
import auditPlugin from "../plugins/auditPlugin.mjs";

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: { type: String },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  deactivatedAt: {
    type: Date,
  },
  can_access_exim_bot: {
    type: Boolean,
    default: false,
  },
  modules: {
    type: [String],
    default: ["Attendance"]
  },
  assigned_importer_name: [
    {
      type: String,
    },
  ],
  assigned_importer: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Importer", // References the Importer model
    },
  ],
  ////////////////////////////////////////////////////////////////// Onboarding
  first_name: {
    type: String,
  },
  middle_name: {
    type: String,
  },
  last_name: {
    type: String,
  },
  company: {
    type: String,
  },
  email: {
    type: String,
  },
  employment_type: { type: String },

  // ─── Attendance-specific fields ───────────────────────────────────────────
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true },
  shift_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', index: true },
  hod_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  employee_code: { type: String, unique: true, sparse: true },

  // Employment timeline
  date_of_joining: { type: Date },
  probation_end_date: { type: Date },
  confirmation_date: { type: Date },
  notice_period_days: { type: Number },

  // Attendance Settings
  attendance_settings: {
    punch_allowed: { type: Boolean, default: true },
    punch_methods: [{ type: String, enum: ['web', 'mobile', 'biometric'] }],
    geo_fencing_required: { type: Boolean, default: false },
    allowed_locations: [{
      name: String,
      latitude: Number,
      longitude: Number,
      radius_meters: Number
    }],
    face_recognition_required: { type: Boolean, default: false },
    manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Leave Settings
  leave_settings: {
    leave_applicable: { type: Boolean, default: true },
    applicable_from_date: Date,
    special_leave_policies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LeavePolicy' }]
  },

  // Work Pattern Override
  work_pattern_override: {
    custom_shift: { type: Boolean, default: false },
    custom_weekly_offs: [Number],
    custom_work_hours: Number
  },

  // Live punch status
  last_punch_date: { type: Date },
  last_punch_type: { type: String },
  current_status: { type: String, enum: ['in_office', 'out_office', 'on_leave', 'on_duty'] },
  monthly_salary: { type: Number, default: 0 },

  // Audit
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // ─────────────────────────────────────────────────────────────────────────

  skill: {
    type: String,
  },
  company_policy_visited: {
    type: String,
  },
  introduction_with_md: {
    type: String,
  },
  employee_photo: {
    type: String,
  },
  resume: { type: String },
  address_proof: { type: String },
  nda: { type: String },
  ////////////////////////////////////////////////////////////////// KYC
  designation: {
    type: String,
  },
  department: {
    type: String,
  },
  joining_date: {
    type: String,
  },
  date_of_birth: {
    type: String,
  },
  permanent_address_line_1: {
    type: String,
  },
  permanent_address_line_2: {
    type: String,
  },
  permanent_address_city: {
    type: String,
  },
  permanent_address_area: {
    type: String,
  },
  permanent_address_state: {
    type: String,
  },
  permanent_address_pincode: {
    type: String,
  },
  communication_address_line_1: {
    type: String,
  },
  communication_address_line_2: {
    type: String,
  },
  communication_address_city: {
    type: String,
  },
  communication_address_area: {
    type: String,
  },
  communication_address_state: {
    type: String,
  },
  communication_address_pincode: {
    type: String,
  },
  personal_email: {
    type: String,
  },
  official_email: {
    type: String,
  },
  dob: {
    type: String,
  },
  mobile: {
    type: String,
  },
  emergency_contact: {
    type: String,
  },
  emergency_contact_name: {
    type: String,
  },
  family_members: [
    {
      type: String,
    },
  ],
  close_friend_contact_no: {
    type: String,
  },
  close_friend_contact_name: {
    type: String,
  },
  blood_group: {
    type: String,
  },
  highest_qualification: {
    type: String,
  },
  aadhar_no: {
    type: String,
  },
  aadhar_photo_front: {
    type: String,
  },
  aadhar_photo_back: {
    type: String,
  },
  pan_no: {
    type: String,
  },
  pan_photo: {
    type: String,
  },
  pf_no: {
    type: String,
  },
  esic_no: {
    type: String,
  },
  insurance_status: [
    {
      type: String,
    },
  ],
  license_front: {
    type: String,
  },
  license_back: {
    type: String,
  },
  bank_account_no: {
    type: String,
  },
  bank_name: {
    type: String,
  },
  ifsc_code: {
    type: String,
  },
  favorite_song: {
    type: String,
  },
  marital_status: {
    type: String,
  },
  kyc_date: { type: String },
  kyc_approval: {
    type: String,
  },
  children_details: [
    {
      gender: String,
      age_group: String,
    },
  ],
  insurance_not_applicable: {
    type: Boolean,
    default: false,
  },
  pf_not_applicable: {
    type: Boolean,
    default: false,
  },
  esic_not_applicable: {
    type: Boolean,
    default: false,
  },
  selected_icd_codes: [
    {
      type: String,
      trim: true,
    },
  ],
  employee_photo_updatedBy: { type: String },
  employee_photo_updatedAt: { type: Date },
  email_signature_updatedBy: { type: String },
  email_signature_updatedAt: { type: Date },
  email_signature: {
    type: String,
  },
  marketing_assets: [
    {
      name: { type: String },
      link: { type: String },
      updatedAt: { type: Date, default: Date.now },
      updatedBy: { type: String },
    },
  ],
});

userSchema.plugin(auditPlugin, { documentType: "User" });

const UserModel = mongoose.model("User", userSchema);
export default UserModel;

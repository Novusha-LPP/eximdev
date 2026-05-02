import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  // === CORE IDENTITY ===
  company_name: { type: String, required: true, trim: true },
  company_name_lower: { type: String, trim: true, lowercase: true, index: true }, // For case-insensitive lookups
  company_code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  domain: { type: String, trim: true }, // e.g., "mycompany.com"

  // === LEGAL INFORMATION ===
  registration_number: { type: String, trim: true },
  gst_number: { type: String, trim: true },
  pan_number: { type: String, trim: true },

  // === CONTACT & ADDRESS ===
  address: {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true }
  },
  contact: {
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true }
  },

  // === GLOBAL SETTINGS ===
  timezone: { type: String, default: 'Asia/Kolkata' }, // CRITICAL FIELD
  currency: { type: String, default: 'INR' },
  financial_year_start: { type: Date },
  shift_policy: { type: String, enum: ['fixed', 'rotational', 'flexible'], default: 'fixed' },
  branch_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],

  // === STATUS & SUBSCRIPTION ===
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },

  subscription: {
    plan: { type: String, enum: ['free', 'basic', 'standard', 'enterprise'], default: 'basic' },
    valid_until: { type: Date },
    max_employees: { type: Number, default: 50 },
    features: [String] // e.g., ['biometric', 'geo_fencing']
  },

  // === WORKPLACE SETTINGS ===
  settings: {
    working_pattern: { type: String, enum: ['5_days_week', '6_days_week', 'alternate_saturday'], default: '5_days_week' },
    standard_work_hours: { type: Number, default: 8 },
    allow_mobile_punch: { type: Boolean, default: true },
    allow_web_punch: { type: Boolean, default: true },
    ip_restriction_enabled: { type: Boolean, default: false },
    allowed_ips: [{ type: String }],
    geo_fencing_enabled: { type: Boolean, default: false },
    allowed_locations: [{
      name: { type: String, trim: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      radius_meters: { type: Number, default: 200 }
    }],
    face_recognition_enabled: { type: Boolean, default: false },
    biometric_integration_enabled: { type: Boolean, default: false }
  },

  // === PAYROLL CONFIGURATION ===
  payroll_config: {
    cutoff_day: { type: Number, default: 25, min: 1, max: 28 },
    cycle_type: { type: String, enum: ['monthly', 'bi_weekly', 'weekly'], default: 'monthly' },
    lop_calculation: { type: String, enum: ['calendar_days', 'working_days', 'fixed_30'], default: 'calendar_days' },
    overtime_enabled: { type: Boolean, default: false },
    overtime_rate: { type: Number, default: 1.5 },
    overtime_threshold_hours: { type: Number, default: 0 },
    include_holidays_in_payable: { type: Boolean, default: true },
    include_weekly_offs_in_payable: { type: Boolean, default: true }
  },

  // === ATTENDANCE CONFIGURATION ===
  attendance_config: {
    lock_day: { type: Number, default: 26, min: 1, max: 28 },
    auto_lock_enabled: { type: Boolean, default: false },
    late_mark_policy: { type: String, enum: ['strict', 'grace', 'flexible'], default: 'grace' },
    consecutive_late_threshold: { type: Number, default: 3 },
    late_deduction_enabled: { type: Boolean, default: false },
    lates_per_deduction: { type: Number, default: 3 },
    half_day_threshold_hours: { type: Number, default: 4 },
    full_day_threshold_hours: { type: Number, default: 8 },
    min_hours_for_presence: { type: Number, default: 1 }
  },

  // === LEAVE CONFIGURATION ===
  leave_config: {
    carry_forward_enabled: { type: Boolean, default: false },
    max_carry_forward_days: { type: Number, default: 5 },
    encashment_enabled: { type: Boolean, default: false },
    sandwich_rule_enabled: { type: Boolean, default: false },
    comp_off_validity_days: { type: Number, default: 30 },
    leave_year_start: { type: String, enum: ['january', 'april'], default: 'january' },
    probation_leave_allowed: { type: Boolean, default: false }
  },

  // === HOLIDAY CONFIGURATION ===
  holiday_config: {
    holiday_on_weekly_off_rule: { type: String, enum: ['count_as_weekly_off', 'count_as_holiday', 'comp_off'], default: 'count_as_weekly_off' },
    optional_holiday_limit: { type: Number, default: 2 },
    national_holidays_mandatory: { type: Boolean, default: true }
  },

  // === AUTOMATION / CRON CONFIGURATION ===
  automation_config: {
    daily_attendance_processing: { type: Boolean, default: true },
    processing_time: { type: String, default: '23:59' },
    monthly_leave_accrual: { type: Boolean, default: true },
    accrual_day: { type: Number, default: 1 },
    daily_summary_email: { type: Boolean, default: false },
    summary_email_time: { type: String, default: '08:00' },
    weekly_report_enabled: { type: Boolean, default: false },
    monthly_report_enabled: { type: Boolean, default: false }
  },

  // === AUDIT FIELDS ===
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true }); // Automatically adds created_at and updated_at

// Pre-save hook to auto-populate company_name_lower
companySchema.pre('save', function(next) {
  if (this.company_name) {
    this.company_name_lower = this.company_name.toLowerCase();
  }
  next();
});

// Add unique index on company_name_lower to prevent case-insensitive duplicates
companySchema.index({ company_name_lower: 1 }, { unique: true });

export default mongoose.model('Company', companySchema);
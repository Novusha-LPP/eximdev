// API Base URL
export const API_BASE_URL = process.env.REACT_APP_API_STRING;

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_data',
  COMPANY: 'company_data'
};

// User Roles
export const USER_ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  HOD: 'HOD',
  ADMIN: 'ADMIN'
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  HALF_DAY: 'HALF_DAY',
  LEAVE: 'LEAVE',
  HOLIDAY: 'HOLIDAY',
  WEEKLY_OFF: 'WEEKLY_OFF',
  ON_DUTY: 'ON_DUTY'
};

// Punch Types
export const PUNCH_TYPES = {
  IN: 'IN',
  OUT: 'OUT'
};

// Punch Methods
export const PUNCH_METHODS = {
  WEB: 'WEB',
  MOBILE: 'MOBILE',
  BIOMETRIC: 'BIOMETRIC'
};

// Leave Types
export const LEAVE_TYPES = {
  CASUAL: 'CASUAL',
  SICK: 'SICK',
  EARNED: 'EARNED',
  MATERNITY: 'MATERNITY',
  PATERNITY: 'PATERNITY',
  COMP_OFF: 'COMP_OFF',
  LOP: 'LOP'
};

// Leave Status
export const LEAVE_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

// Regularization Status
export const REGULARIZATION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

// Employment Types
export const EMPLOYMENT_TYPES = {
  PROBATION: 'PROBATION',
  PERMANENT: 'PERMANENT',
  CONTRACT: 'CONTRACT',
  INTERN: 'INTERN'
};

// Status Colors
export const STATUS_COLORS = {
  PRESENT: 'success',
  ABSENT: 'error',
  HALF_DAY: 'warning',
  LEAVE: 'info',
  HOLIDAY: 'info',
  WEEKLY_OFF: 'info',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error'
};


export const DATE_FORMATS = {
  DISPLAY: 'dd MMM yyyy',
  DISPLAY_LONG: 'dd MMMM yyyy',
  DISPLAY_WITH_TIME: 'dd MMM yyyy, hh:mm a',
  API: 'yyyy-MM-dd',
  TIME_ONLY: 'hh:mm a', // <--- Important for formatTime12Hr
  TIME_24: 'HH:mm'
};

// Quick Action Types
export const QUICK_ACTIONS = {
  PUNCH_IN: 'PUNCH_IN',
  PUNCH_OUT: 'PUNCH_OUT',
  APPLY_LEAVE: 'APPLY_LEAVE',
  REGULARIZATION: 'REGULARIZATION',
  VIEW_ATTENDANCE: 'VIEW_ATTENDANCE'
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMITS: [10, 25, 50, 100]
};

// Toast Duration
export const TOAST_DURATION = 3000;

// Validation Messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email',
  INVALID_PHONE: 'Please enter a valid phone number',
  MIN_LENGTH: (length) => `Minimum ${length} characters required`,
  MAX_LENGTH: (length) => `Maximum ${length} characters allowed`,
  INVALID_DATE: 'Please select a valid date',
  FUTURE_DATE: 'Future date not allowed',
  PAST_DATE: 'Past date not allowed'
};

// utils/routePermissions.js
export const routePermissions = {
  // Import DSR
  '/import-dsr': 'Import - DSR',
  '/import-dsr/job/:job_no/:selected_year': 'Import - DSR',
  '/job/:job_no/:selected_year': 'Import - DSR',

  // Import DO
  '/import-do': 'Import - DO',
  '/edit-do-list/:job_no/:year': 'Import - DO',
  '/edit-do-planning/:job_no/:year': 'Import - DO',
  '/edit-do-completed/:job_no/:year': 'Import - DO',
  '/edit-billing-sheet/:job_no/:year': 'Import - DO',

  // Import Operations
  '/import-operations': 'Import - Operations',
  '/import-operations/view-job/:job_no/:year': 'Import - Operations',
  '/import-operations/list-operation-job/:job_no/:year': 'Import - Operations',

  // Import Add
  '/ImportersInfo': 'Import - Add',

  // Import Billing
  '/import-billing': 'Import - Billing',
  '/view-billing-job/:job_no/:year': 'Import - Billing',
  '/view-payment-request-job/:job_no/:year': 'Import - Billing',

  // Import Utility Tool
  '/import-utility-tool': 'Import Utility Tool',
  '/duty-calculator': 'Import Utility Tool',
  '/utilities': 'Import Utility Tool',

  // Report
  '/report': 'Report',
  '/report/monthly-containers': 'Report',
  '/report/detailed': 'Report',

  // Audit Trail
  '/audit-trail': 'Audit Trail',

  // Export
  // Add export routes when you have them

  // Accounts
  '/accounts': 'Accounts',

  // Employee Onboarding
  '/employee-onboarding': 'Employee Onboarding',

  // Employee KYC
  '/employee-kyc': 'Employee KYC',
  '/view-kyc/:username': 'Employee KYC',

  // Inward Register
  '/inward-register': 'Inward Register',

  // Outward Register
  '/outward-register': 'Outward Register',
  '/outward-register-details/:_id': 'Outward Register',

  // Customer KYC (when implemented)
  // '/customer-kyc': 'Customer KYC',

  // Exit Feedback
  '/exit-feedback': 'Exit Feedback',

  // E-Sanchit
  '/e-sanchit': 'e-Sanchit',
  '/esanchit-job/:job_no/:year': 'e-Sanchit',

  // Documentation
  '/documentation': 'Documentation',
  '/documentationJob/view-job/:job_no/:year': 'Documentation',

  // Submission
  '/submission': 'Submission',
  '/submission-job/:job_no/:year': 'Submission',

  // Screens
  '/screen1': 'Screen1',
  '/screen2': 'Screen2',
  '/screen3': 'Screen3',
  '/screen4': 'Screen4',
  '/screen5': 'Screen5',
  '/screen6': 'Screen6',

  // Admin routes
  '/assign': 'Admin', // Assuming only admins can assign modules
  '/all-users': 'Admin',
};

// Public routes that don't require any module permissions
export const publicRoutes = [
  '/',
  '/change-password',
  '/login',
];

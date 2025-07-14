/**
 * Audit Configuration
 * Apply this to your main app.mjs to enable audit trailing across all routes
 */

import { auditMiddleware } from "../middleware/auditTrail.mjs";

// Route patterns and their corresponding document types
export const auditConfig = {
  // Job-related routes
  '/api/update-esanchit-job/*': 'Job',
  '/api/update-job/*': 'Job',
  '/api/create-job': 'Job',
  '/api/delete-job/*': 'Job',
  
  // Documentation routes
  '/api/update-documentation/*': 'Job',
  '/api/documentation/*': 'Job',
  
  // Operations routes
  '/api/update-operations/*': 'Job',
  '/api/operations/*': 'Job',
  
  // Submission routes
  '/api/update-submission/*': 'Job',
  '/api/submission/*': 'Job',
  
  // Import billing routes
  '/api/import-billing/*': 'Job',
  
  // DO routes
  '/api/import-do/*': 'Job',
  
  // User management routes
  '/api/users/*': 'User',
  '/api/create-user': 'User',
  '/api/update-user/*': 'User',
  '/api/delete-user/*': 'User',
  
  // Customer KYC routes
  '/api/customer-kyc/*': 'CustomerKYC',
  
  // Employee routes
  '/api/employee-kyc/*': 'EmployeeKYC',
  '/api/employee-onboarding/*': 'EmployeeOnboarding',
  
  // LR routes
  '/api/lr/*': 'LR',
  
  // SRCC routes
  '/api/srcc/*': 'SRCC',
  
  // Accounts routes
  '/api/accounts/*': 'Account',
  
  // Tyre maintenance routes
  '/api/tyre-maintenance/*': 'TyreMaintenance'
};

/**
 * Apply audit middleware to specific routes
 * Call this function in your main app.mjs after defining your routes
 */
export function applyAuditMiddleware(app) {
  Object.entries(auditConfig).forEach(([pattern, documentType]) => {
    // Convert pattern to regex
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    
    // Apply middleware to all methods for matching routes
    app.use((req, res, next) => {
      if (regex.test(req.path) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return auditMiddleware(documentType)(req, res, next);
      }
      next();
    });
  });
}

/**
 * Manual audit logging function for custom use cases
 */
export { auditMiddleware } from "../middleware/auditTrail.mjs";

import AuditTrailModel from "../model/auditTrailModel.mjs";
import mongoose from "mongoose";

/**
 * Audit Trail Middleware
 * Tracks all changes made to database documents
 */

// Helper function to get nested value from object using dot notation
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    
    // Handle array indices
    if (!isNaN(key) && Array.isArray(current)) {
      return current[parseInt(key)];
    }
    
    return current[key];
  }, obj);
}

// Helper function to set nested value in object using dot notation
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!isNaN(key) && Array.isArray(current)) {
      return current[parseInt(key)] || {};
    }
    return current[key] || {};
  }, obj);
  
  if (!isNaN(lastKey) && Array.isArray(target)) {
    target[parseInt(lastKey)] = value;
  } else {
    target[lastKey] = value;
  }
}

// Helper function to compare two objects and find differences
function findChanges(oldDoc, newDoc, parentPath = '', changes = []) {
  if (!oldDoc && !newDoc) return changes;
  
  // If one is null/undefined and other is not
  if (!oldDoc && newDoc) {
    changes.push({
      field: parentPath || 'document',
      fieldPath: parentPath,
      oldValue: null,
      newValue: newDoc,
      changeType: 'ADDED'
    });
    return changes;
  }
  
  if (oldDoc && !newDoc) {
    changes.push({
      field: parentPath || 'document',
      fieldPath: parentPath,
      oldValue: oldDoc,
      newValue: null,
      changeType: 'REMOVED'
    });
    return changes;
  }

  // Handle arrays
  if (Array.isArray(oldDoc) && Array.isArray(newDoc)) {
    const maxLength = Math.max(oldDoc.length, newDoc.length);
    
    for (let i = 0; i < maxLength; i++) {
      const currentPath = parentPath ? `${parentPath}.${i}` : `${i}`;
      
      if (i >= oldDoc.length) {
        // New item added
        changes.push({
          field: currentPath,
          fieldPath: currentPath,
          oldValue: undefined,
          newValue: newDoc[i],
          changeType: 'ADDED'
        });
      } else if (i >= newDoc.length) {
        // Item removed
        changes.push({
          field: currentPath,
          fieldPath: currentPath,
          oldValue: oldDoc[i],
          newValue: undefined,
          changeType: 'REMOVED'
        });
      } else {
        // Compare existing items
        findChanges(oldDoc[i], newDoc[i], currentPath, changes);
      }
    }
    
    return changes;
  }

  // Handle objects
  if (typeof oldDoc === 'object' && typeof newDoc === 'object' && 
      oldDoc !== null && newDoc !== null &&
      !Array.isArray(oldDoc) && !Array.isArray(newDoc)) {
    
    const allKeys = new Set([...Object.keys(oldDoc), ...Object.keys(newDoc)]);
    
    for (const key of allKeys) {
      // Skip mongoose internal fields
      if (key.startsWith('_') || key === '__v' || key === 'updatedAt') continue;
      
      const currentPath = parentPath ? `${parentPath}.${key}` : key;
      const oldValue = oldDoc[key];
      const newValue = newDoc[key];
      
      if (oldValue === undefined && newValue !== undefined) {
        changes.push({
          field: key,
          fieldPath: currentPath,
          oldValue: undefined,
          newValue: newValue,
          changeType: 'ADDED'
        });
      } else if (oldValue !== undefined && newValue === undefined) {
        changes.push({
          field: key,
          fieldPath: currentPath,
          oldValue: oldValue,
          newValue: undefined,
          changeType: 'REMOVED'
        });
      } else if (oldValue !== newValue) {
        if (typeof oldValue === 'object' || typeof newValue === 'object') {
          findChanges(oldValue, newValue, currentPath, changes);
        } else {
          changes.push({
            field: key,
            fieldPath: currentPath,
            oldValue: oldValue,
            newValue: newValue,
            changeType: 'MODIFIED'
          });
        }
      }
    }
    
    return changes;
  }

  // Handle primitive values
  if (oldDoc !== newDoc) {
    changes.push({
      field: parentPath.split('.').pop() || 'value',
      fieldPath: parentPath,
      oldValue: oldDoc,
      newValue: newDoc,
      changeType: 'MODIFIED'
    });
  }

  return changes;
}

// Function to log audit trail
async function logAuditTrail({
  documentId,
  documentType,
  job_no,
  year,
  userId,
  username,
  userRole,
  action,
  changes,
  endpoint,
  method,
  ipAddress,
  userAgent,
  reason,
  sessionId
}) {
  try {
    console.log(`💾 Creating audit entry with data:`, {
      documentId,
      documentType,
      job_no,
      year,
      userId,
      username,
      action,
      changesCount: changes?.length || 0
    });

    const auditEntry = new AuditTrailModel({
      documentId,
      documentType,
      job_no,
      year,
      userId,
      username,
      userRole,
      action,
      changes,
      endpoint,
      method,
      ipAddress,
      userAgent,
      reason,
      sessionId
    });

    console.log(`💾 Saving audit entry to database...`);
    const savedEntry = await auditEntry.save();
    console.log(`✅ Audit trail logged successfully! ID: ${savedEntry._id}`);
    
    return savedEntry;
  } catch (error) {
    console.error('❌ Failed to log audit trail:', error);
    console.error('❌ Audit trail data that failed:', {
      documentId,
      documentType,
      job_no,
      year,
      userId,
      username,
      action,
      changesCount: changes?.length || 0,
      error: error.message
    });
    throw error; // Re-throw to see the error in the calling function
  }
}

// Middleware for Express routes
export const auditMiddleware = (documentType = 'Unknown') => {
  return async (req, res, next) => {
    console.log(`🚀 Audit middleware started for ${documentType} - ${req.method} ${req.originalUrl}`);
    
    // Store original document for comparison
    let originalDocument = null;
    let documentId = null;
    
    // Extract user information (adjust based on your auth implementation)
    const user = req.currentUser || req.user || {
      _id: req.headers['user-id'] || req.body.userId || 'unknown',
      username: req.headers['username'] || req.body.username || 'unknown',
      role: req.headers['user-role'] || req.body.userRole || 'unknown'
    };
    
    // For debugging - log what user info we have
    console.log('🔍 Audit middleware user info:', {
      userId: user._id || user.id,
      username: user.username,
      role: user.role,
      headers: {
        'user-id': req.headers['user-id'],
        'username': req.headers['username'],
        'user-role': req.headers['user-role']
      }
    });
    
    if (!user._id && !user.id) {
      console.warn('⚠️ Audit middleware: No user ID found in request');
      // Don't skip audit - use unknown user
    }

    // Extract document ID from params (common patterns)
    const id = req.params.id || req.params._id || req.params.documentId;
    const job_no = req.params.jobNo || req.params.job_no; // Support both jobNo and job_no
    const year = req.params.year;

    console.log('📋 Extracted params:', { job_no, year, id, allParams: req.params });

    // For job-related operations
    if (job_no && year && documentType === 'Job') {
      try {
        console.log(`📋 Fetching original job document: ${year}/${job_no}`);
        const JobModel = (await import('../model/jobModel.mjs')).default;
        originalDocument = await JobModel.findOne({ job_no, year }).lean();
        if (originalDocument) {
          documentId = originalDocument._id;
          console.log(`✅ Original document found: ${documentId}`);
        } else {
          console.log(`❌ No original document found for ${year}/${job_no}`);
        }
      } catch (error) {
        console.error('❌ Error fetching original job document:', error);
      }
    } else if (id && mongoose.Types.ObjectId.isValid(id)) {
      documentId = new mongoose.Types.ObjectId(id);
      // You can add logic here to fetch original document for other models
    } else {
      console.log(`ℹ️ No matching params for audit: job_no=${job_no}, year=${year}, id=${id}, documentType=${documentType}`);
    }

    // Override res.json to capture the response and log audit trail
    const originalJson = res.json;
    res.json = function(data) {
      console.log(`📝 Response intercepted: ${res.statusCode} for ${req.method} ${req.originalUrl}`);
      
      // Only log for successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Handle different HTTP methods
        let action = 'UPDATE';
        if (req.method === 'POST') action = 'CREATE';
        if (req.method === 'DELETE') action = 'DELETE';

        // For CREATE operations, get the created document info
        if (action === 'CREATE' && data && data._id) {
          documentId = data._id;
          
          // Log creation
          logAuditTrail({
            documentId,
            documentType,
            job_no: data.job_no || job_no,
            year: data.year || year,
            userId: user._id || user.id,
            username: user.username || user.name,
            userRole: user.role,
            action,
            changes: [{
              field: 'document',
              fieldPath: '',
              oldValue: null,
              newValue: 'Document created',
              changeType: 'ADDED'
            }],
            endpoint: req.originalUrl,
            method: req.method,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID || req.session?.id
          });
        }

        // For UPDATE operations, compare changes
        if (action === 'UPDATE' && originalDocument && documentId) {
          console.log(`🔄 Processing UPDATE operation for ${documentType}`);
          
          // Use setImmediate instead of setTimeout for better async handling
          setImmediate(async () => {
            try {
              let updatedDocument = null;
              
              if (documentType === 'Job' && job_no && year) {
                console.log(`📋 Fetching updated job: ${year}/${job_no}`);
                const JobModel = (await import('../model/jobModel.mjs')).default;
                updatedDocument = await JobModel.findOne({ job_no, year }).lean();
                console.log(`📄 Updated document found: ${updatedDocument ? 'Yes' : 'No'}`);
              }
              
              if (updatedDocument) {
                console.log(`📊 Comparing documents for changes...`);
                const changes = findChanges(originalDocument, updatedDocument);
                console.log(`🔍 Found ${changes.length} changes:`, changes.slice(0, 3)); // Log first 3 changes
                
                if (changes.length > 0) {
                  console.log(`💾 Logging audit trail with ${changes.length} changes...`);
                  await logAuditTrail({
                    documentId,
                    documentType,
                    job_no: updatedDocument.job_no || job_no,
                    year: updatedDocument.year || year,
                    userId: user._id || user.id,
                    username: user.username || user.name,
                    userRole: user.role,
                    action,
                    changes,
                    endpoint: req.originalUrl,
                    method: req.method,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent'),
                    reason: req.body.reason || req.query.reason,
                    sessionId: req.sessionID || req.session?.id
                  });
                  console.log(`✅ Audit trail logged successfully!`);
                } else {
                  console.log(`ℹ️ No changes detected, skipping audit trail`);
                }
              } else {
                console.log(`❌ Could not fetch updated document for comparison`);
              }
            } catch (error) {
              console.error('❌ Error in audit trail comparison:', error);
            }
          });
        }

        // For DELETE operations
        if (action === 'DELETE' && originalDocument && documentId) {
          logAuditTrail({
            documentId,
            documentType,
            job_no: originalDocument.job_no || job_no,
            year: originalDocument.year || year,
            userId: user._id || user.id,
            username: user.username || user.name,
            userRole: user.role,
            action,
            changes: [{
              field: 'document',
              fieldPath: '',
              oldValue: 'Document existed',
              newValue: null,
              changeType: 'REMOVED'
            }],
            endpoint: req.originalUrl,
            method: req.method,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID || req.session?.id
          });
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

// export { auditMiddleware };
export default auditMiddleware;

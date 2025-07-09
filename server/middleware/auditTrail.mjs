import AuditTrailModel from "../model/auditTrailModel.mjs";
import mongoose from "mongoose";
import { getOrCreateUserId } from "../utils/userIdManager.mjs";

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
    console.log('🔍 Audit middleware checking headers:', {
      'user-id': req.headers['user-id'],
      'username': req.headers['username'],
      'user-role': req.headers['user-role']
    });
    
    const userInfo = req.currentUser || req.user || {
      _id: req.headers['user-id'] || req.body.userId || 'unknown',
      username: req.headers['username'] || req.body.username || 'unknown',
      role: req.headers['user-role'] || req.body.userRole || 'unknown'
    };
    
    // Get or create unique user ID for this username
    const uniqueUserId = await getOrCreateUserId(userInfo.username);
    
    const user = {
      ...userInfo,
      uniqueUserId
    };
    
    // For debugging - log what user info we have
    console.log('🔍 Audit middleware user info:', {
      uniqueUserId: user.uniqueUserId,
      username: user.username,
      role: user.role,
      headers: {
        'user-id': req.headers['user-id'],
        'username': req.headers['username'],
        'user-role': req.headers['user-role']
      }
    });
    
    if (!user.uniqueUserId || user.uniqueUserId === 'UNKNOWN_USER') {
      console.warn('⚠️ Audit middleware: Using fallback user ID for unknown user');
    }

    // Extract document ID from params (common patterns)
    const id = req.params.id || req.params._id || req.params.documentId;
    let job_no = req.params.jobNo || req.params.job_no; // Support both jobNo and job_no - use let for reassignment
    let year = req.params.year; // Use let for reassignment

    console.log('📋 Extracted params:', { job_no, year, id, allParams: req.params });

    // Log final values we'll use for audit trail (after potential extraction from document)
    console.log('📋 Initial values for audit trail:', { job_no, year, documentId });

    // Check for pre-extracted job info first
    if (req.jobInfo && documentType === 'Job') {
      console.log(`📋 Found pre-extracted job info:`, req.jobInfo);
      job_no = req.jobInfo.job_no || job_no;
      year = req.jobInfo.year || year;
      documentId = req.jobInfo.documentId || documentId;
    }
    
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
    } else if (id && mongoose.Types.ObjectId.isValid(id) && documentType === 'Job') {
      // Handle ObjectId-based job routes
      try {
        console.log(`📋 Fetching original job document by ID: ${id}`);
        const JobModel = (await import('../model/jobModel.mjs')).default;
        originalDocument = await JobModel.findById(id).lean();
        if (originalDocument) {
          documentId = originalDocument._id;
          // Extract job_no and year from the document itself
          job_no = originalDocument.job_no;
          year = originalDocument.year;
          console.log(`✅ Original document found by ID: ${documentId}, Job: ${year}/${job_no}`);
          console.log(`📋 Extracted job info - job_no: ${job_no}, year: ${year}`);
        } else {
          console.log(`❌ No original document found for ID: ${id}`);
        }
      } catch (error) {
        console.error('❌ Error fetching original job document by ID:', error);
      }
    } else if (id && mongoose.Types.ObjectId.isValid(id)) {
      documentId = new mongoose.Types.ObjectId(id);
      // You can add logic here to fetch original document for other models
    } else {
      console.log(`ℹ️ No matching params for audit: job_no=${job_no}, year=${year}, id=${id}, documentType=${documentType}`);
    }

    // Log final values we'll use for audit trail (after potential extraction from document)
    console.log('📋 Final values for audit trail:', { job_no, year, documentId });

    // Override res.json to capture the response and log audit trail
    const originalJson = res.json;
    res.json = function(data) {
      console.log(`📝 Response intercepted: ${res.statusCode} for ${req.method} ${req.originalUrl}`);
      
      // Only log for successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Handle different HTTP methods
        let action = 'UPDATE';
        // POST can be either CREATE or UPDATE depending on context
        if (req.method === 'POST') {
          // If we're updating an existing document (has pre-extracted job info or _id in request), treat as UPDATE
          if (req.jobInfo || req.body._id) {
            action = 'UPDATE';
            console.log('📝 POST request with existing document ID - treating as UPDATE');
          } else {
            action = 'CREATE';
            console.log('📝 POST request for new document - treating as CREATE');
          }
        }
        if (req.method === 'DELETE') action = 'DELETE';

        // Use setImmediate to handle async operations
        setImmediate(async () => {
          try {
            // Check if job info was attached by a previous middleware
            if (req.jobInfo) {
              console.log(`📌 Using pre-extracted job info for audit trail:`, req.jobInfo);
              documentId = req.jobInfo.documentId;
              job_no = req.jobInfo.job_no;
              year = req.jobInfo.year;
              
              // Make sure we treat this as an UPDATE operation, not CREATE
              action = 'UPDATE';
              
              // For routes with pre-extracted job info, ensure we can find the original document for comparison
              if (action === 'UPDATE' && !originalDocument && documentId) {
                try {
                  console.log(`📋 Fetching original job document by ID (pre-extracted): ${documentId}`);
                  const JobModel = (await import('../model/jobModel.mjs')).default;
                  originalDocument = await JobModel.findById(documentId).lean();
                  if (originalDocument) {
                    console.log(`✅ Original document found using pre-extracted ID: ${documentId}`);
                  } else {
                    console.log(`❌ No original document found for pre-extracted ID: ${documentId}`);
                  }
                } catch (error) {
                  console.error('❌ Error fetching original job document by pre-extracted ID:', error);
                }
              }
            }
            
            // For CREATE operations, get the created document info
            // Check if we have pre-extracted job info and should treat this as an UPDATE instead
            if (req.jobInfo && req.method === 'POST') {
              console.log(`🔄 POST request with pre-extracted job info detected, treating as UPDATE operation`);
              action = 'UPDATE';
              
              // Ensure we have documentId, job_no, and year from req.jobInfo
              if (!documentId) documentId = req.jobInfo.documentId;
              if (!job_no) job_no = req.jobInfo.job_no;
              if (!year) year = req.jobInfo.year;
            }
            
            if (action === 'CREATE' && data) {
              // Handle different response structures
              let createdJob = null;
              let createdJobNo = null;
              let createdYear = null;
              let createdDocumentId = null;

              // For bulk operations like /api/jobs/add-job that return success message
              if (data.message && data.message.includes('successfully') && req.body && Array.isArray(req.body)) {
                console.log(`🔄 Handling bulk CREATE/UPDATE operation with ${req.body.length} items`);
                
                // For bulk operations, we'll log a summary audit entry
                try {
                  const changes = [{
                    field: 'bulk_operation',
                    fieldPath: '',
                    oldValue: null,
                    newValue: `Bulk operation processed ${req.body.length} jobs`,
                    changeType: 'BULK_OPERATION'
                  }];
                  
                  // Log bulk operation audit
                  await logAuditTrail({
                    documentId: null, // No single document ID for bulk ops
                    documentType,
                    job_no: null, // No single job number for bulk ops
                    year: null, // No single year for bulk ops
                    userId: user.uniqueUserId,
                    username: user.username,
                    userRole: user.role,
                    action: 'BULK_CREATE_UPDATE',
                    changes: changes,
                    endpoint: req.originalUrl,
                    method: req.method,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent'),
                    sessionId: req.sessionID || req.session?.id
                  });
                  console.log(`✅ Bulk operation audit trail logged successfully!`);
                } catch (error) {
                  console.error('❌ Error logging bulk operation audit trail:', error);
                }
                
                return; // Early return for bulk operations
              }

              // Try to extract job info from different response structures
              if (data._id) {
                // Direct document response
                createdDocumentId = data._id;
                createdJobNo = data.job_no;
                createdYear = data.year;
              } else if (data.job && data.job.job_no) {
                // Response with nested job object
                createdJobNo = data.job.job_no;
                // Get year from request body since it's not in the response
                createdYear = req.body.year;
                
                // Try to find the created document to get its _id
                if (createdJobNo && createdYear) {
                  try {
                    console.log(`🔍 Looking for created job: ${createdYear}/${createdJobNo}`);
                    const JobModel = (await import('../model/jobModel.mjs')).default;
                    createdJob = await JobModel.findOne({ job_no: createdJobNo, year: createdYear }).lean();
                    if (createdJob) {
                      createdDocumentId = createdJob._id;
                      console.log(`✅ Found created job with ID: ${createdDocumentId}`);
                    } else {
                      console.log(`❌ Could not find created job: ${createdYear}/${createdJobNo}`);
                    }
                  } catch (error) {
                    console.error('❌ Error fetching created job for audit:', error);
                  }
                } else {
                  console.log(`⚠️ Missing job info for CREATE audit: job_no=${createdJobNo}, year=${createdYear}`);
                }
              }

              if (createdDocumentId && createdJobNo && createdYear) {
                console.log(`💾 Logging CREATE audit trail for job: ${createdYear}/${createdJobNo}`);
                
                // Get the created document to log detailed changes
                try {
                  const JobModel = (await import('../model/jobModel.mjs')).default;
                  const createdDoc = await JobModel.findById(createdDocumentId).lean();
                  
                  let changes = [];
                  if (createdDoc) {
                    // Log creation with key field information
                    changes = [
                      {
                        field: 'document',
                        fieldPath: '',
                        oldValue: null,
                        newValue: 'Document created',
                        changeType: 'ADDED'
                      },
                      {
                        field: 'job_no',
                        fieldPath: 'job_no',
                        oldValue: null,
                        newValue: createdDoc.job_no,
                        changeType: 'ADDED'
                      },
                      {
                        field: 'year',
                        fieldPath: 'year',
                        oldValue: null,
                        newValue: createdDoc.year,
                        changeType: 'ADDED'
                      }
                    ];
                    
                    // Add other important fields if they exist
                    if (createdDoc.importer) {
                      changes.push({
                        field: 'importer',
                        fieldPath: 'importer',
                        oldValue: null,
                        newValue: createdDoc.importer,
                        changeType: 'ADDED'
                      });
                    }
                    
                    if (createdDoc.custom_house) {
                      changes.push({
                        field: 'custom_house',
                        fieldPath: 'custom_house',
                        oldValue: null,
                        newValue: createdDoc.custom_house,
                        changeType: 'ADDED'
                      });
                    }
                  }
                  
                  // Log creation
                  await logAuditTrail({
                    documentId: createdDocumentId,
                    documentType,
                    job_no: createdJobNo,
                    year: createdYear,
                    userId: user.uniqueUserId,
                    username: user.username,
                    userRole: user.role,
                    action,
                    changes: changes,
                    endpoint: req.originalUrl,
                    method: req.method,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent'),
                    sessionId: req.sessionID || req.session?.id
                  });
                  console.log(`✅ CREATE audit trail logged successfully!`);
                } catch (error) {
                  console.error('❌ Error logging CREATE audit trail:', error);
                }
              } else {
                console.log(`⚠️ Could not extract job info for CREATE audit: documentId=${createdDocumentId}, job_no=${createdJobNo}, year=${createdYear}`);
              }
            }

            // For UPDATE operations, compare changes
            if (action === 'UPDATE' && originalDocument && documentId) {
              console.log(`🔄 Processing UPDATE operation for ${documentType}`);
              
              // Small delay to ensure database update is committed
              await new Promise(resolve => setTimeout(resolve, 100));
              
              try {
                let updatedDocument = null;
                
                if (documentType === 'Job') {
                  console.log(`🔍 UPDATE: Using job_no=${job_no}, year=${year}, id=${id}, documentId=${documentId}`);
                  
                  // Try documentId first (most reliable for ObjectId-based routes)
                  if (documentId) {
                    console.log(`📋 Fetching updated job by documentId: ${documentId}`);
                    const JobModel = (await import('../model/jobModel.mjs')).default;
                    try {
                      updatedDocument = await JobModel.findById(documentId).lean();
                      console.log(`📋 findById result:`, updatedDocument ? 'Found' : 'Not found');
                      if (updatedDocument) {
                        console.log(`📋 Updated document details: job_no=${updatedDocument.job_no}, year=${updatedDocument.year}`);
                      }
                    } catch (findError) {
                      console.error(`❌ Error in findById:`, findError);
                    }
                  } else if (job_no && year) {
                    console.log(`📋 Fetching updated job: ${year}/${job_no}`);
                    const JobModel = (await import('../model/jobModel.mjs')).default;
                    updatedDocument = await JobModel.findOne({ job_no, year }).lean();
                  } else if (id && mongoose.Types.ObjectId.isValid(id)) {
                    console.log(`📋 Fetching updated job by ID: ${id}`);
                    const JobModel = (await import('../model/jobModel.mjs')).default;
                    updatedDocument = await JobModel.findById(id).lean();
                  }
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
                      job_no: job_no, // Use the job_no extracted from document
                      year: year, // Use the year extracted from document
                      userId: user.uniqueUserId,
                      username: user.username,
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
            }

            // For DELETE operations
            if (action === 'DELETE' && originalDocument && documentId) {
              await logAuditTrail({
                documentId,
                documentType,
                job_no: job_no, // Use the job_no extracted from document
                year: year, // Use the year extracted from document
                userId: user.uniqueUserId,
                username: user.username,
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
          } catch (error) {
            console.error('❌ Error in audit trail logging:', error);
          }
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

// export { auditMiddleware };
export default auditMiddleware;

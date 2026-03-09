import { getModel, findChanges, generateHeading, logAuditTrail } from "../services/auditTrailService.mjs";
import mongoose from "mongoose";

/**
 * Audit Trail Middleware
 * Uses AuditTrailService to track changes detected during HTTP requests
 */

export const auditMiddlewareWrapper = (documentType = "Unknown") => {
  return async (req, res, next) => {
    if (req.method === "GET") return next();

    let originalDocument = null;
    let documentId = null;

    const userInfo = req.user || req.currentUser || {
      _id: "system",
      username: "system",
      role: "System",
    };

    // Extract identifiers
    const id = req.params.id || req.params._id || req.params.documentId || req.params.teamId || req.params.jobId || req.params.projectId || req.params.pointId || req.body._id || req.body.id;
    const usernameParam = req.params.username || req.body.username;
    let job_no = req.params.jobNo || req.params.job_no || req.body.job_no;
    let year = req.params.year || req.body.year;

    let branchId = req.user?.branchId || req.headers["x-branch-id"] || req.headers["branch-id"] || req.body.branchId || req.body.branch_id;
    let branch_code = req.user?.branch_code || req.headers["x-branch-code"] || req.headers["branch-code"] || req.body.branch_code;

    // Fetch original document
    if (documentType !== "S3File") {
      const Model = await getModel(documentType);
      if (Model) {
        try {
          if (job_no && year && documentType === "Job") {
            originalDocument = await Model.findOne({ job_no, year }).lean();
          } else if (usernameParam && documentType === "User") {
            originalDocument = await Model.findOne({ username: usernameParam }).lean();
          } else if (id && mongoose.Types.ObjectId.isValid(id)) {
            originalDocument = await Model.findById(id).lean();
          }

          if (originalDocument) {
            documentId = originalDocument._id;
            job_no = originalDocument.job_no || job_no;
            year = originalDocument.year || year;
            branchId = originalDocument.branch_id || branchId;
            branch_code = originalDocument.branch_code || branch_code;
          }
        } catch (error) {
          console.error(`❌ AuditMiddleware: Error fetching original ${documentType}`, error);
        }
      }
    }

    const originalJson = res.json;
    const originalSend = res.send;

    const handleLogging = (data) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        let action = "UPDATE";
        if (req.method === "POST") {
          action = (req.body._id || id || (usernameParam && documentType === "User")) ? "UPDATE" : "CREATE";
        }
        if (req.method === "DELETE") action = "DELETE";

        setImmediate(async () => {
          try {
            await processAuditLog(data, action, id, usernameParam, job_no, year, branchId, branch_code, userInfo, documentType, req, originalDocument, documentId);
          } catch (error) {
            console.error(`❌ AuditTrail: Logging error`, error);
          }
        });
      }
    };

    res.json = function (data) {
      handleLogging(data);
      return originalJson.call(this, data);
    };

    res.send = function (data) {
      handleLogging(data);
      return originalSend.call(this, data);
    };

    next();
  };
};

async function processAuditLog(data, action, id, usernameParam, job_no, year, branchId, branch_code, userInfo, documentType, req, originalDocument, documentId) {
  const isS3 = documentType === "S3File";
  const changes = [];

  if (isS3) {
    if (req.method === "POST" && req.originalUrl.includes("upload")) {
      changes.push({ field: "file", fieldPath: "s3_url", oldValue: null, newValue: data.urls || "Uploaded", changeType: "ADDED" });
    } else {
      changes.push({ field: "file", fieldPath: "s3_key", oldValue: req.body.key, newValue: null, changeType: "REMOVED" });
    }
  } else if (action === "CREATE") {
    changes.push({ field: "document", fieldPath: "", oldValue: null, newValue: `${documentType} created`, changeType: "ADDED" });
    documentId = data?._id || data?.id || documentId;
  } else if (action === "UPDATE" && originalDocument) {
    const Model = await getModel(documentType);
    if (Model) {
      const updatedDoc = await Model.findById(documentId || originalDocument._id).lean();
      if (updatedDoc) {
        const diffs = findChanges(originalDocument, updatedDoc);
        changes.push(...diffs);
      }
    }
  } else if (action === "DELETE") {
    changes.push({ field: "document", fieldPath: "", oldValue: "Existed", newValue: null, changeType: "REMOVED" });
  }

  if (changes.length > 0) {
    const heading = generateHeading(documentType, action, originalDocument || data, changes);

    await logAuditTrail({
      documentId,
      documentType,
      job_no,
      year,
      branchId,
      branch_code,
      userId: userInfo.username, // Using username as userId consistently
      username: userInfo.username,
      userRole: userInfo.role,
      action,
      heading,
      changes,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.get("User-Agent"),
      reason: req.body.reason || req.query.reason,
      sessionId: req.sessionID || req.session?.id,
    });
  }
}

export default auditMiddlewareWrapper;

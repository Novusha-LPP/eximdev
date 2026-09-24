import mongoose from "mongoose";

const auditTrailSchema = new mongoose.Schema(
  {
    // Document information
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Made optional to support bulk operations
    },
    documentType: {
      type: String,
      required: true,
    }, // e.g., 'Job', 'User', etc.

    // Job specific identifiers for easier tracking
    job_no: { type: String },
    year: { type: String },

    // Branch information for isolation
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
    branch_code: { type: String },

    // User information
    userId: {
      type: String, // Changed from ObjectId to String to support username-based IDs
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    userRole: { type: String },

    // Action details
    action: {
      type: String,
      required: true,
      enum: ["CREATE", "UPDATE", "DELETE", "BULK_CREATE_UPDATE", "VIEW", "FILTER", "MODULE_ACCESS", "CUSTOM", "EXPORT", "IMPORT"],
    },

    heading: { type: String, required: true }, // Proper heading for the audit entry

    // Change details
    changes: [
      {
        field: { type: String, required: true }, // e.g., 'container_nos.0.container_rail_out_date'
        fieldPath: { type: String }, // Full dot notation path
        oldValue: { type: mongoose.Schema.Types.Mixed },
        newValue: { type: mongoose.Schema.Types.Mixed },
        changeType: {
          type: String,
          enum: ["ADDED", "MODIFIED", "REMOVED", "BULK_OPERATION"],
          required: true,
        },
      },
    ],

    // Request details
    endpoint: { type: String }, // API endpoint that made the change
    method: { type: String }, // HTTP method
    userAgent: { type: String },

    // Metadata
    timestamp: {
      type: Date,
      default: Date.now,
    },

    // Additional context
    reason: { type: String }, // Optional reason for change
    sessionId: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
auditTrailSchema.index({ documentId: 1, timestamp: -1 });
auditTrailSchema.index({ job_no: 1, year: 1, timestamp: -1 });
auditTrailSchema.index({ username: 1, timestamp: -1 });
auditTrailSchema.index({ branchId: 1, timestamp: -1 });
auditTrailSchema.index({ branch_code: 1, timestamp: -1 });
auditTrailSchema.index({ action: 1, timestamp: -1 });
auditTrailSchema.index({ documentType: 1, timestamp: -1 });
auditTrailSchema.index({ timestamp: -1 });
auditTrailSchema.index({ timestamp: -1, createdAt: -1 });

const AuditTrailModel = mongoose.model("AuditTrail", auditTrailSchema);
export default AuditTrailModel;

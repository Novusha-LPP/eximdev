import mongoose from "mongoose";

const tallyApiSyncLogSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  requestType: { type: String, enum: ["purchase", "payment", "unknown"], default: "unknown" },
  jobNo: { type: String },
  entryOrRequestNo: { type: String },
  errorMessage: { type: String, required: true },
  requestPayload: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const TallyApiSyncLogModel = mongoose.model(
  "tallyApiSyncLog",
  tallyApiSyncLogSchema
);

export default TallyApiSyncLogModel;

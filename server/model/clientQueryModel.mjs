import mongoose from "mongoose";

const queryReplySchema = new mongoose.Schema({
  message: { type: String, required: true },
  repliedBy: { type: String, required: true },
  email: { type: String, default: "" },
  username: { type: String, default: "" },
  senderType: { type: String, enum: ["client", "admin", "operation"], default: "admin" },
  attachments: [
    {
      fileName: { type: String },
      fileUrl: { type: String },
      fileType: { type: String },
    },
  ],
  repliedAt: { type: Date, default: Date.now },
});

const clientQuerySchema = new mongoose.Schema(
  {
    module_type: { type: String, enum: ["import", "export"], default: "import" },
    job_no: { type: String, required: true, index: true },
    job_id: { type: mongoose.Schema.Types.ObjectId },
    client_id: { type: String },
    client_name: { type: String, default: "Client" },
    client_email: { type: String },
    subject: { type: String, default: "Job Query" },
    message: { type: String, required: true },
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
      },
    ],
    status: { type: String, enum: ["open", "resolved"], default: "open" },
    seenByClient: { type: Boolean, default: true },
    seenByAdmin: { type: Boolean, default: false },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
    resolutionNote: { type: String },
    replies: [queryReplySchema],
  },
  { timestamps: true }
);

const ClientQuery = mongoose.models.ClientQuery || mongoose.model("ClientQuery", clientQuerySchema);

export default ClientQuery;

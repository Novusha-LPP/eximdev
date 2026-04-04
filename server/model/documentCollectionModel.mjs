import mongoose from "mongoose";

const documentCollectionSchema = new mongoose.Schema(
  {
    job_number: { type: String, required: true },
    bl_no: { type: String, default: "" },
    importer_name: { type: String, default: "" },
    year: { type: String, default: "" },
    branch_code: { type: String, default: "" },
    request_type: {
      type: String,
      enum: ["Bank Document", "Submission of DO Document", "Others"],
      required: true,
    },
    requested_by: { type: String, required: true }, // username
    requested_by_name: { type: String, default: "" }, // display name
    requested_at: { type: Date, default: Date.now },
    responsible_person: { type: String, default: "" }, // field team person
    status: {
      type: String,
      enum: ["Not Collected", "In Progress", "Collected"],
      default: "Not Collected",
    },
    collected_at: { type: Date },
    proof_image_urls: [{ type: String }],
    updated_by: { type: String, default: "" }, // username of last editor
    updated_by_name: { type: String, default: "" }, // display name of last editor
    notes: { type: String, default: "" },
    sr_no: { type: Number },
  },
  { timestamps: true }
);

// Auto-increment serial number per branch+year
documentCollectionSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await mongoose.model("DocumentCollection").countDocuments();
    this.sr_no = count + 1;
  }
  next();
});

const DocumentCollection = mongoose.model(
  "DocumentCollection",
  documentCollectionSchema
);

export default DocumentCollection;

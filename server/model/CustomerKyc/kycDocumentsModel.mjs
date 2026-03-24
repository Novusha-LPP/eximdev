import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const kycDocumentsSchema = new mongoose.Schema({
  importer: {
    type: String,
  },
  shipping_line_airline: {
    type: String,
  },
  kyc_documents: [
    {
      type: String,
    },
  ],
  kyc_valid_upto: {
    type: String,
  },
  shipping_line_bond_valid_upto: { type: String },
  shipping_line_bond_docs: [{ type: String }],
});

kycDocumentsSchema.plugin(auditPlugin, { documentType: "KycDocuments" });

const KycDocumentsModel = new mongoose.model(
  "kycDocuments",
  kycDocumentsSchema
);
export default KycDocumentsModel;

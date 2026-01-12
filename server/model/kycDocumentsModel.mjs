import mongoose from "mongoose";
import { createDynamicModel } from "../utils/modelHelper.mjs";

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
  shipping_line_bond_charges: { type: String },
});

const KycDocumentsModel = createDynamicModel("kycDocuments", kycDocumentsSchema);
export default KycDocumentsModel;

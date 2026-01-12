import mongoose from "mongoose";
import { createDynamicModel } from "../utils/modelHelper.mjs";

const documentListSchema = new mongoose.Schema({
  document_code: {
    type: String,
  },
  document_name: {
    type: String,
  },
});

const DocumentListModel = createDynamicModel("documents", documentListSchema);
export default DocumentListModel;

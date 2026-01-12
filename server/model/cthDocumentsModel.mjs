import mongoose from "mongoose";
import { createDynamicModel } from "../utils/modelHelper.mjs";

const documentListSchema = new mongoose.Schema(
  {
    cth: { type: Number },
    document_code: {
      type: String,
    },
    document_name: {
      type: String,
    },
  },
  { collection: "cthdocuments" }
);

const DocumentListModel = createDynamicModel("documentList", documentListSchema);
export default DocumentListModel;

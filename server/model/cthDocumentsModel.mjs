import mongoose from "mongoose";

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

const DocumentListModel = new mongoose.model(
  "documentList",
  documentListSchema
);
export default DocumentListModel;

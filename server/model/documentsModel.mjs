import mongoose from "mongoose";

const documentListSchema = new mongoose.Schema({
  document_code: {
    type: String,
  },
  document_name: {
    type: String,
  },
});

const DocumentListModel = new mongoose.model("documents", documentListSchema);
export default DocumentListModel;

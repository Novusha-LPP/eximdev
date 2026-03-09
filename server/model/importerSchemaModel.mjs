import mongoose from "mongoose";
import auditPlugin from "../plugins/auditPlugin.mjs";

const Schema = mongoose.Schema;

const importerSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  contact: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  address: {
    type: String,
  },
});

importerSchema.plugin(auditPlugin, { documentType: "Importer" });

const ImporterModel = mongoose.model("Importer", importerSchema);
export default ImporterModel;

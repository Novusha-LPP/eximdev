import mongoose from "mongoose";
import { createDynamicModel } from "../utils/modelHelper.mjs";

const Schema = mongoose.Schema;

export const importerSchema = new Schema({
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

const ImporterModel = createDynamicModel("Importer", importerSchema);
export default ImporterModel;

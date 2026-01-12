import mongoose from "mongoose";
import { createDynamicModel } from "../utils/modelHelper.mjs";

const reportFieldsSchema = new mongoose.Schema(
  {
    importer: {
      type: String,
      required: true,
    },
    importerURL: { type: String, trim: true },
    email: { type: String, trim: true },
    senderEmail: { type: String, trim: true },
    time: { type: String, trim: true },
    field: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { collection: "reportFields" }
);

const ReportFieldsModel = createDynamicModel("ReportFields", reportFieldsSchema);
export default ReportFieldsModel;

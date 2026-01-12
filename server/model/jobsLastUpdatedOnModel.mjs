import mongoose from "mongoose";
import { createDynamicModel } from "../utils/modelHelper.mjs";

const jobsLastUpdatedOnSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    trim: true,
  },
});

const LastJobsDate = createDynamicModel("JobsLastUpdated", jobsLastUpdatedOnSchema);

export default LastJobsDate;

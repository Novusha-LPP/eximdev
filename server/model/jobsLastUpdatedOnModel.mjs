import mongoose from "mongoose";

const jobsLastUpdatedOnSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    trim: true,
  },
});

const LastJobsDate = new mongoose.model(
  "JobsLastUpdated",
  jobsLastUpdatedOnSchema
);

export default LastJobsDate;

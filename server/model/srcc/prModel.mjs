import mongoose from "mongoose";

const prSchema = new mongoose.Schema(
  {
    branch_code: {
      type: String,
      required: true,
    },
    pr_no: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    pr_no_complete: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Pr = new mongoose.model("Pr", prSchema);
export default Pr;

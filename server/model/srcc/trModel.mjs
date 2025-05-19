import mongoose from "mongoose";

const trSchema = new mongoose.Schema(
  {
    branch_code: {
      type: String,
      required: true,
    },
    tr_no: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    tr_no_complete: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Tr = new mongoose.model("Tr", trSchema);
export default Tr;

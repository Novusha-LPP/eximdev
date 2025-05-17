import mongoose from "mongoose";

const prSchema = new mongoose.Schema({
  pr_no: {
    type: String,
    required: true,
  },
});

const Pr = new mongoose.model("Pr", prSchema);
export default Pr;

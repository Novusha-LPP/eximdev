import mongoose from "mongoose";

const trSchema = new mongoose.Schema({
  tr_no: {
    type: String,
    required: true,
  },
});

const Tr = new mongoose.model("Tr", trSchema);
export default Tr;

import mongoose from "mongoose";

const tyreTypeSchema = new mongoose.Schema({
  tyre_type: {
    type: String,
    trim: true,
  },
});

export default mongoose.model("TyreTypes", tyreTypeSchema);

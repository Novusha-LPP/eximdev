import mongoose from "mongoose";

const tyreModelSchema = new mongoose.Schema({
  tyre_brand: {
    type: String,
    trim: true,
  },
  tyre_model: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
});

export default mongoose.model("TyreModels", tyreModelSchema);

import mongoose from "mongoose";

const tyreBrandSchema = new mongoose.Schema({
  tyre_brand: {
    type: String,
    trim: true,
  },
  make: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
});

export default mongoose.model("TyreBrands", tyreBrandSchema);

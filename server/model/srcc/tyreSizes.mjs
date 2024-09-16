import mongoose from "mongoose";

const tyreSizeSchema = new mongoose.Schema({
  tyre_size: {
    type: String,
    trim: true,
  },
});

export default mongoose.model("TyreSizes", tyreSizeSchema);

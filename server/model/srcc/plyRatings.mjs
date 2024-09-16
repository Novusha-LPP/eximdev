import mongoose from "mongoose";

const plyRatingSchema = new mongoose.Schema({
  ply_rating: {
    type: String,
    trim: true,
  },
});

export default mongoose.model("PlyRatings", plyRatingSchema);

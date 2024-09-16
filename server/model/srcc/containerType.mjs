import mongoose from "mongoose";

const containerTypeSchema = new mongoose.Schema({
  container_type: { type: String, trim: true },
});

export default mongoose.model("ContainerType", containerTypeSchema);

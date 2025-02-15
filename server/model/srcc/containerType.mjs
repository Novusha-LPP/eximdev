const containerTypeSchema = new mongoose.Schema(
  {
    container_type: { type: String, required: true, trim: true }, // ✅ Check spelling
    iso_code: { type: String, required: true, unique: true, trim: true },
    teu: { type: Number, required: true, min: 1 },
    outer_dimension: { type: String, required: true, trim: true },
    tare_weight: { type: Number, required: true, min: 0 },
    payload: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("ContainerType", containerTypeSchema);

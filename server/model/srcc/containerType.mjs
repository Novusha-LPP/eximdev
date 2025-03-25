import mongoose from "mongoose";

const containerTypeSchema = new mongoose.Schema(
  {
    container_type: { type: String, required: true, trim: true },
    iso_code: { type: String, required: true, unique: true, trim: true },
    teu: { type: Number, required: true, min: 1 },

    outer_dimension: {
      length: { type: Number, required: true, min: 0 },
      breadth: { type: Number, required: true, min: 0 },
      height: { type: Number, required: true, min: 0 },
      unit: { type: String, required: true, trim: true }, // e.g., cm, m
    },

    cubic_capacity: {
      capacity: { type: Number, required: true, min: 0 },
      unit: { type: String, required: true, trim: true }, // e.g., CBM
    },

    tare_weight: {
      value: { type: Number, required: true, min: 0 },
      unit: { type: String, required: true, trim: true }, // e.g., kg, ton
    },

    payload: {
      value: { type: Number, required: true, min: 0 },
      unit: { type: String, required: true, trim: true }, // e.g., kg, ton
    },

    is_temp_controlled: { type: Boolean, default: false },
    is_tank_container: { type: Boolean, default: false },

    size: {
      type: String,
      enum: ["10", "20", "40", "45"],
      required: true,
    },
  },
  { timestamps: true }
);

const ContainerType = mongoose.model("ContainerType", containerTypeSchema);
export default ContainerType;

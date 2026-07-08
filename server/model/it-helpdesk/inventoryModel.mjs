import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const inventorySchema = new mongoose.Schema(
  {
    item_id: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
    },

    model: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Computer",
        "Laptop",
        "Printer",
        "Monitor",
        "Server",
        "Network Device",
        "Mobile Device",
        "Software License",
        "Other",
      ],
      index: true,
    },

    inventory_type: {
      type: String,
      enum: ["Old", "New"],
      default: "Old",
      index: true,
    },

    warranty_start_date: {
      type: Date,
      default: null,
    },

    warranty_end_date: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

inventorySchema.plugin(auditPlugin, {
  documentType: "ITInventory",
});

export default mongoose.model("ITInventory", inventorySchema);
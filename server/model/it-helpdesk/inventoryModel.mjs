import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const inventorySchema = new mongoose.Schema({
  item_name: { type: String, required: true, trim: true },
  category: { type: String, required: true, enum: ["Hardware Stock", "Consumables", "Spare Parts"], index: true },
  sku: { type: String, trim: true },
  quantity: { type: Number, required: true, default: 0 },
  reorder_level: { type: Number, default: 5 },
  unit: { type: String, default: "pcs" },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "ItVendor" },
  location: { type: String, trim: true },
  last_restocked: { type: Date },
  notes: { type: String }
}, { timestamps: true });

inventorySchema.plugin(auditPlugin, { documentType: "ITInventory" });

export default mongoose.model("ITInventory", inventorySchema);

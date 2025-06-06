import mongoose from "mongoose";

const engineOilStockSchema = new mongoose.Schema({
  quantity: { type: Number, default: 0 },
});

const engineOilStock = mongoose.model("engineOilStock", engineOilStockSchema);
export default engineOilStock;

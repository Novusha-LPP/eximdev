import mongoose from "mongoose";

const currencySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  code: { type: String, required: true, trim: true, uppercase: true, unique: true },
  country: { type: String, required: true, trim: true },
  active: { type: String, default: "Yes" },
  created_at: { type: Date, default: Date.now },
});

const CurrencyModel = mongoose.model("Currency", currencySchema);
export default CurrencyModel;

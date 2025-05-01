import mongoose from "mongoose";

const CurrencySchema = new mongoose.Schema(
  {
    currency_name: { type: String}, // Country Code
    iso_code: { type: String}, // Country Name
    country_name: { type: String}, // Country Name
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

export default mongoose.model("currency", CurrencySchema);

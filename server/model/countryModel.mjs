import mongoose from "mongoose";

const countrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const CountryModel = mongoose.model("Country", countrySchema, "countriesimp");
export default CountryModel;

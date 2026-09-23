import mongoose from "mongoose";

// Separate collection: legacy `cfssimp` continues to power the Terminal
// directory, while this collection is the new CFS master used by CFS balances.
const cfsDirectorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, uppercase: true },
  active: { type: String, default: "Yes", uppercase: true },
  branches: [{
    branch_no: { type: String, trim: true, uppercase: true },
    branchName: { type: String, trim: true, uppercase: true },
    address: { type: String, trim: true, uppercase: true },
    city: { type: String, trim: true, uppercase: true },
    state: { type: String, trim: true, uppercase: true },
    pincode: { type: String, trim: true, uppercase: true },
    country: { type: String, trim: true, uppercase: true },
    gst: { type: String, trim: true, uppercase: true },
    pan: { type: String, trim: true, uppercase: true },
    accounts: [{ bankName: String, accountNo: String, ifsc: String, adCode: String }],
  }],
  tds_percent: { type: Number, default: 0 },
  contacts: [{ name: String, email: String, phone: String }],
  credit_terms: { type: String, trim: true, uppercase: true },
  cin: { type: String, trim: true, uppercase: true },
  openingBalance: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("CfsDirectory", cfsDirectorySchema, "cfs_directories");

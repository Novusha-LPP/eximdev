import mongoose from "mongoose";

// Sub-schema for "More Addresses" (14.12.x fields)
const MoreAddressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Delivery", "Factory", "Pickup", "Warehouse"],
    required: true,
  },
  name: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  state: { type: String, trim: true },
  telephone: { type: String, trim: true },
  fax: { type: String, trim: true },
  emailAddress: { type: String, trim: true },
});

// Sub-schema for "Contacts" (14.13.x fields)
const ContactSchema = new mongoose.Schema({
  contactName: { type: String, trim: true },
  titleDesignation: { type: String, trim: true },
  department: { type: String, trim: true },
  telephone: { type: String, trim: true },
  mobile: { type: String, trim: true },
  emailAddress: { type: String, trim: true },
});

// Sub-schema for "Branches" (14.x)
const BranchSchema = new mongoose.Schema({
  branchName: { type: String, trim: true, required: true }, // 14.1
  address: { type: String, trim: true }, // 14.2
  country: { type: String, trim: true }, // 14.3
  state: { type: String, trim: true }, // 14.4
  city: { type: String, trim: true }, // 14.5
  postalCode: { type: String, trim: true }, // 14.6
  telephoneNo: { type: String, trim: true }, // 14.7
  fax: { type: String, trim: true }, // 14.8
  website: { type: String, trim: true }, // 14.9
  emailAddress: { type: String, trim: true }, // 14.10
  taxableType: {
    type: String,
    enum: ["Standard", "SEZ", "Exempt", "Composite supplier"], // 14.11
    default: "Standard",
  },
  // 14.12 More addresses array
  addresses: [MoreAddressSchema],
  // 14.13 Contacts array
  contacts: [ContactSchema],
});

// Main Organisation schema
const OrganisationSchema = new mongoose.Schema(
  {
    // 1. Name
    name: { type: String, required: true, trim: true, unique: true },
    // 2. Alias
    alias: { type: String, trim: true },
    // 3. Type (single choose)
    type: {
      type: [String],
      enum: [
        "Consignor",
        "Consignee",
        "Services",
        "Agent",
        "Carrier",
        "Global",
      ],
      required: true,
    },
    // 4. BIN No
    binNo: { type: String, trim: true },
    // 5. CIN No
    cinNo: { type: String, trim: true },
    // 6. CST No
    cstNo: { type: String, trim: true },
    // 7. ST No
    stNo: { type: String, trim: true },
    // 8. ST Reg No
    stRegNo: { type: String, trim: true },
    // 9. TAN No
    tanNo: { type: String, trim: true },
    // 10. VAT No
    vatNo: { type: String, trim: true },
    // 11. GSTIN
    gstin: { type: String, trim: true },
    // 12. PAN No
    panNo: { type: String, trim: true },
    // 13. IE Code No
    ieCodeNo: { type: String, trim: true },

    // 14. Branch Details (Ensure at least one branch)
    branches: {
      type: [BranchSchema],
      validate: {
        validator: function (value) {
          return value.length > 0; // ✅ Ensures at least one branch exists
        },
        message: "At least one branch is required.",
      },
    },
  },
  { timestamps: true }
);

const Organisation = mongoose.model("Organisation", OrganisationSchema);

export default Organisation;

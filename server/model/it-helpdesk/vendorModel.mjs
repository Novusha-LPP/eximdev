import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: [true, "Company / Vendor name is required"], unique: true, trim: true },
  vendor_code: { type: String, trim: true },
  vendor_type: {
    type: String,
    default: "Supplier",
    set: (value) => {
      if (!value) return "Supplier";
      // Trim and normalize the value
      const normalized = typeof value === 'string' ? value.trim() : String(value).trim();

      // Map common variations to standard values
      const typeMap = {
        "hardware": "Hardware",
        "software": "Software",
        "network": "Network",
        "general": "General",
        "transport": "Transporter",
        "shipping": "Shipping Line",
        "ship": "Shipping Line",
        "cha": "CHA",
        "customs": "CHA",
        "freight": "Transporter",
        "logistics": "Transporter",
        "provider": "Service Provider",
        "service": "Service Provider",
        "vendor": "Supplier",
        "supplier": "Supplier"
      };

      // Return mapped value if exists, otherwise return the normalized value
      return typeMap[normalized.toLowerCase()] || normalized;
    },
    validate: {
      validator: function (v) {
        // Allow any string but log a warning for non-standard values
        const standardTypes = ["Transporter", "CHA", "Shipping Line", "Supplier", "Service Provider", "Other", "Hardware", "Software", "Network", "General"];
        if (!standardTypes.includes(v)) {
          console.warn(`Non-standard vendor type detected: "${v}". Consider using one of: ${standardTypes.join(", ")}`);
        }
        return true; // Always valid
      },
      message: "Invalid vendor type"
    }
  },
  contact_person: { 
    type: String, 
    trim: true,
    required: [true, "Contact person name is required"]
  },
  mobile_number: { 
    type: String, 
    trim: true,
    required: [true, "Mobile number is required"],
    validate: {
      validator: function(v) {
        if (!v) return false;
        // Indian mobile number: 10 digits starting with 6, 7, 8, or 9
        return /^[6-9]\d{9}$/.test(v.trim());
      },
      message: "Invalid mobile number. Must be a 10-digit number starting with 6, 7, 8, or 9."
    }
  },
  email: { 
    type: String, 
    trim: true,
    lowercase: true,
    required: [true, "Email address is required"],
    validate: {
      validator: function(v) {
        if (!v) return false;
        // Standard email format validation
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v.trim());
      },
      message: "Invalid email address format."
    }
  },
  gst_number: { 
    type: String, 
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Optional field: if empty or undefined, valid
        if (!v || v.trim() === "") return true;
        // Standard Indian GSTIN: 15 alphanumeric characters (2 state digits + 10 PAN chars + 1 entity + Z + 1 checksum)
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.trim().toUpperCase());
      },
      message: "Invalid GSTIN format. Expected 15 characters (e.g. 24AAAAA0000A1Z5)."
    }
  },
  pan_number: { 
    type: String, 
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Optional field: if empty or undefined, valid
        if (!v || v.trim() === "") return true;
        // Standard Indian PAN: 10 characters (5 uppercase letters + 4 digits + 1 uppercase letter)
        return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.trim().toUpperCase());
      },
      message: "Invalid PAN format. Expected 10 characters (e.g. AAAAA0000A)."
    }
  },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  amc_contracts: [{ type: mongoose.Schema.Types.ObjectId, ref: "ITContract" }],
  documents: [{ file_url: String, file_name: String, uploaded_at: { type: Date, default: Date.now } }],
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

// Partial unique indexes to enforce uniqueness while allowing empty/unset values
vendorSchema.index(
  { mobile_number: 1 },
  { unique: true, partialFilterExpression: { mobile_number: { $type: "string", $gt: "" } } }
);

vendorSchema.index(
  { gst_number: 1 },
  { unique: true, partialFilterExpression: { gst_number: { $type: "string", $gt: "" } } }
);

vendorSchema.index(
  { pan_number: 1 },
  { unique: true, partialFilterExpression: { pan_number: { $type: "string", $gt: "" } } }
);

vendorSchema.plugin(auditPlugin, { documentType: "ItVendor" });

const ItVendor = mongoose.models.ItVendor || mongoose.model("ItVendor", vendorSchema);

export default ItVendor;





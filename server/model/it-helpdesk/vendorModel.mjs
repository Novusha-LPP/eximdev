import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  vendor_code: { type: String, trim: true },
  vendor_type: { 
    type: String, 
    default: "Supplier",
    set: (value) => {
      // Trim and normalize the value
      const normalized = value.trim();
      
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
      validator: function(v) {
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
  contact_person: { type: String, trim: true },
  mobile_number: { type: String, trim: true },
  email: { type: String, trim: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  amc_contracts: [{ type: mongoose.Schema.Types.ObjectId, ref: "ITContract" }],
  documents: [{ file_url: String, file_name: String, uploaded_at: { type: Date, default: Date.now } }],
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

vendorSchema.plugin(auditPlugin, { documentType: "ItVendor" });

export default mongoose.model("ItVendor", vendorSchema);

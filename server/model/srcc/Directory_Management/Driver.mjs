import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now }, // Automatically sets current date and time if not provided
    note: { type: String },
    attachment: [{ type: String, trim: true }],
  },
  { timestamps: true } // This will add `createdAt` and `updatedAt` for each note
);

const DriverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    alias: { type: String, required: true, trim: true },
    photoUpload: [{ type: String, trim: true }],
    licenseUpload: [{ type: String, trim: true }],
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Ensure licenseNumber is unique
    }, // License Number 15 (starting 2-alpha rest of numeric)
    licenseIssueAuthority: { type: String, required: true, trim: true },
    licenseExpiryDate: { type: String, required: true, trim: true }, // License Expiry Date (date format)

    phoneNumber: { type: String, required: true, trim: true }, // Phone Number (10 Numeric)

    alternateNumber: { type: String, trim: true }, // Alternate Number (10 Numeric)

    residentialAddress: { type: String, required: true, trim: true },
    drivingVehicleTypes: [{ type: String, required: true }],
    remarks: { type: String, trim: true },
    notes: [NoteSchema], // Use the NoteSchema for the notes array
  },
  { timestamps: true } // This will add `createdAt` and `updatedAt` for the driver document
);

// Ensure the licenseNumber index is unique
DriverSchema.index({ licenseNumber: 1 }, { unique: true });

const DriverType = mongoose.model("DriverType", DriverSchema);

export default DriverType;

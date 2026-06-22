
import mongoose from "mongoose";
import Vendor from "../model/it-helpdesk/vendorModel.mjs";

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/eximdev", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const fixVendorTypes = async () => {
  try {
    // Define the valid vendor types
    const validTypes = ["Transporter", "CHA", "Shipping Line", "Supplier", "Service Provider", "Other"];

    // Find all vendors
    const vendors = await Vendor.find({});
    console.log(`Found ${vendors.length} vendors to check`);

    let updatedCount = 0;

    for (const vendor of vendors) {
      if (!validTypes.includes(vendor.vendor_type)) {
        console.log(`Updating vendor ${vendor._id}: "${vendor.vendor_type}" -> "Supplier"`);

        vendor.vendor_type = "Supplier";
        await vendor.save();
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} vendors`);
    console.log("Migration completed successfully");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    mongoose.connection.close();
  }
};

fixVendorTypes();

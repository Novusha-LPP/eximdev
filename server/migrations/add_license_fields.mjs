
import mongoose from "mongoose";
import License from "../model/it-helpdesk/licenseModel.mjs";

// Connect to MongoDB
mongoose.connect("mongodb://0.0.0.0:27017/eximdev", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const addLicenseFields = async () => {
  try {
    // Find all licenses
    const licenses = await License.find({});
    console.log(`Found ${licenses.length} licenses to update`);

    let updatedCount = 0;

    for (const license of licenses) {
      console.log(`Updating license ${license._id}`);

      // Add license_name if missing
      if (!license.license_name) {
        license.license_name = license.software_name ? `${license.software_name} License` : "Unknown License";
        console.log(`Added license_name: ${license.license_name}`);
      }

      // Add license_code if missing
      if (!license.license_code) {
        license.license_code = license.license_key || `ID-${license._id.substring(0, 8)}`;
        console.log(`Added license_code: ${license.license_code}`);
      }

      // Add license_type if missing
      if (!license.license_type) {
        license.license_type = "Per User"; // Default license type
        console.log(`Added license_type: ${license.license_type}`);
      }

      await license.save();
      updatedCount++;
    }

    console.log(`Updated ${updatedCount} licenses`);
    console.log("Migration completed successfully");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    mongoose.connection.close();
  }
};

addLicenseFields();

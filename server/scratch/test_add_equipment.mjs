import mongoose from "mongoose";
import ITUnifiedAsset from "../model/it-helpdesk/unifiedAssetModel.mjs";

async function test() {
  await mongoose.connect("mongodb://localhost:27017/eximNew");

  const testAsset = {
    // 15 Standard Common Fields from Document Specification
    asset_tag: "TEST-AST-2026-999",
    inventory_type: "New Inventory",
    category: "Laptop",
    brand: "Dell",
    model: "Latitude 3420",
    serial_number: "DL789XYZ123",
    purchase_date: new Date("2026-01-15"),
    warranty_start_date: new Date("2026-01-15"),
    warranty_end_date: new Date("2029-01-15"),
    department: "Alluvium-IT",
    location: "Floor 2, Desk 14",
    lifecycle_status: "Available",
    condition: "Good",
    remarks: "Verification test of all 15 common fields",

    // Dynamic Specs
    specs: {
      processor: "Intel Core i5-1135G7",
      ram: "16 GB DDR4",
      storage: "512 GB NVMe SSD",
      storage_type: "SSD",
      operating_system: "Windows 11 Pro",
      hostname: "DELL-LAT-999",
      mac_address: "00:1B:44:11:3A:B7",
    },
  };

  // Clean up if exists
  await ITUnifiedAsset.deleteOne({ asset_tag: testAsset.asset_tag });

  const doc = new ITUnifiedAsset(testAsset);
  await doc.save();
  console.log("Successfully created test asset with _id:", doc._id);

  const fetched = await ITUnifiedAsset.findOne({ asset_tag: testAsset.asset_tag }).lean();
  console.log("Verified fields in saved doc:");
  console.log({
    "1. Asset ID / Tag": fetched.asset_tag,
    "2. Inventory Type": fetched.inventory_type,
    "3. Category": fetched.category,
    "4. Brand": fetched.brand,
    "5. Model": fetched.model,
    "6. Serial Number": fetched.serial_number,
    "7. Purchase Date": fetched.purchase_date,
    "8. Warranty Start Date": fetched.warranty_start_date,
    "9. Warranty End Date": fetched.warranty_end_date,
    "10. Assigned To": fetched.assigned_to,
    "11. Department": fetched.department,
    "12. Location": fetched.location,
    "13. Status": fetched.lifecycle_status,
    "14. Condition": fetched.condition,
    "15. Remarks": fetched.remarks,
    "Dynamic Specs": fetched.specs,
  });

  // Clean up test asset
  await ITUnifiedAsset.deleteOne({ _id: doc._id });
  console.log("Cleaned up test asset successfully.");

  await mongoose.disconnect();
}

test().catch(console.error);

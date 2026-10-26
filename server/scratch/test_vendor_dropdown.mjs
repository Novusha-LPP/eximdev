import mongoose from "mongoose";
import ITUnifiedAsset from "../model/it-helpdesk/unifiedAssetModel.mjs";
import ItVendor from "../model/it-helpdesk/vendorModel.mjs";

async function testVendorIntegration() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect("mongodb://localhost:27017/eximNew");

  try {
    // 1. Fetch vendors from ItVendor
    const vendors = await ItVendor.find({}).lean();
    console.log(`Found ${vendors.length} vendors in itvendors collection:`);
    vendors.forEach((v) => {
      console.log(`  - [${v._id}] ${v.name} (${v.vendor_code || "No Code"}) - Type: ${v.vendor_type}`);
    });

    if (vendors.length === 0) {
      console.warn("No vendors found to test with!");
      return;
    }

    const testVendor = vendors[0];
    const testTag = "TEST-AST-VENDOR-001";

    await ITUnifiedAsset.deleteOne({ asset_tag: testTag });

    // 2. Create test asset referencing this vendor
    const newAsset = new ITUnifiedAsset({
      asset_tag: testTag,
      category: "Software License",
      brand: "Microsoft",
      model: "Office 365",
      serial_number: "MS-O365-KEY-999",
      vendor: testVendor._id,
      vendor_name: testVendor.name,
      purchase_cost: 45000,
      inventory_type: "New Inventory",
      lifecycle_status: "Available",
      condition: "Good",
    });

    await newAsset.save();
    console.log("✓ Test asset created successfully with _id:", newAsset._id);

    // 3. Query back with populate
    const retrieved = await ITUnifiedAsset.findOne({ asset_tag: testTag })
      .populate("vendor", "name vendor_name vendor_code contact_person mobile_number email")
      .lean();

    console.log("✓ Populated vendor data in asset:");
    console.log({
      asset_tag: retrieved.asset_tag,
      vendor_id: retrieved.vendor?._id,
      vendor_name_field: retrieved.vendor_name,
      populated_vendor_name: retrieved.vendor?.name,
      populated_vendor_code: retrieved.vendor?.vendor_code,
      populated_contact: retrieved.vendor?.contact_person,
      populated_mobile: retrieved.vendor?.mobile_number,
    });

    if (!retrieved.vendor || retrieved.vendor.name !== testVendor.name) {
      throw new Error("Populated vendor name does not match expected vendor!");
    }

    // 4. Cleanup
    await ITUnifiedAsset.deleteOne({ asset_tag: testTag });
    console.log("✓ Cleaned up test asset successfully!");

    console.log("\nALL CHECKS PASSED: Vendor list and references work seamlessly with Vendors & AMC Suppliers!");
  } finally {
    await mongoose.disconnect();
  }
}

testVendorIntegration().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

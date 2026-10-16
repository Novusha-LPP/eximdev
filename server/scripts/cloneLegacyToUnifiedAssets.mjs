import mongoose from "mongoose";
import dotenv from "dotenv";
import ITUnifiedAsset from "../model/it-helpdesk/unifiedAssetModel.mjs";
import Asset from "../model/it-helpdesk/assetModel.mjs";
import Inventory from "../model/it-helpdesk/inventoryModel.mjs";
import "../model/userModel.mjs";
import "../model/it-helpdesk/vendorModel.mjs";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const mongoUri =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
    ? process.env.SERVER_MONGODB_URI
    : process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximNew";

async function runClone() {
  console.log("Connecting to MongoDB:", mongoUri);
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("Connected successfully. Starting non-destructive clone...");

  let clonedAssets = 0;
  let clonedInventory = 0;
  let skippedDuplicates = 0;

  // 1. Fetch legacy IT Assets
  const legacyAssets = await Asset.find({}).populate("assigned_to", "name username department").lean();
  console.log(`Found ${legacyAssets.length} legacy assets to process.`);

  for (const la of legacyAssets) {
    if (!la.asset_tag) continue;
    const existing = await ITUnifiedAsset.findOne({ asset_tag: la.asset_tag.trim() });
    if (existing) {
      skippedDuplicates++;
      continue;
    }

    let category = "Other";
    if (["Desktop", "Computer"].includes(la.asset_type)) category = "Computer";
    else if (la.asset_type === "Laptop") category = "Laptop";
    else if (la.asset_type === "Printer") category = "Printer";
    else if (la.asset_type === "Monitor") category = "Monitor";
    else if (la.asset_type === "Network Device") category = "Network Device";
    else if (la.asset_type === "Software") category = "Software";
    else if (["Phone", "SIM Card"].includes(la.asset_type)) category = "Mobile Device";
    else if (la.asset_type === "Rack") category = "Rack";
    else if (la.asset_type === "Cable") category = "Cable";
    else if (la.asset_type === "Peripheral") category = "Peripheral";

    let lifecycle_status = "In Stock";
    if (la.assigned_to) {
      lifecycle_status = "Assigned";
    } else if (["In Repair", "Repair", "repair", "Under Maintenance"].includes(la.status)) {
      lifecycle_status = "Under Maintenance";
    } else if (["Spare", "spare"].includes(la.status)) {
      lifecycle_status = "Spare";
    } else if (["Retired", "Lost"].includes(la.status)) {
      lifecycle_status = "Retired";
    }

    await ITUnifiedAsset.create({
      asset_tag: la.asset_tag.trim(),
      serial_number: la.serial_number || "",
      asset_name: la.asset_name || `${la.manufacturer || ""} ${la.model || ""}`.trim() || la.asset_type,
      category,
      asset_type: la.asset_type || category,
      brand: la.manufacturer || "",
      model: la.model || "",
      lifecycle_status,
      stock_type: "Old",
      assigned_to: la.assigned_to?._id || la.assigned_to || null,
      assigned_to_name: la.assigned_to?.name || "",
      assigned_date: la.assigned_date || null,
      department: la.department || "",
      location: la.location || "",
      specs: {
        processor: la.processor || "",
        ram: la.ram || "",
        storage: la.storage || "",
        operating_system: la.operating_system || "",
        ip_address: la.ip_address || "",
        mac_address: la.mac_address || "",
        imei_number: la.imei_number || "",
        sim_number: la.sim_number_iccid || "",
        service_provider: la.service_provider || "",
      },
      vendor: la.vendor || null,
      purchase_cost: la.purchase_cost || 0,
      purchase_date: la.purchase_date || null,
      invoice_number: la.invoice_number || "",
      invoice_date: la.invoice_date || null,
      warranty_end_date: la.warranty_expiry || null,
      image_url: la.image_url || "",
      approval_stage: "Completed",
      origin_source: "Cloned_Asset",
      legacy_ref_id: la._id,
      remarks: "Cloned from legacy Asset Management",
    });
    clonedAssets++;
  }

  // 2. Fetch legacy IT Inventories
  const legacyInventories = await Inventory.find({}).lean();
  console.log(`Found ${legacyInventories.length} legacy inventory items to process.`);

  for (const inv of legacyInventories) {
    if (!inv.item_id) continue;
    const existing = await ITUnifiedAsset.findOne({ asset_tag: inv.item_id.trim() });
    if (existing) {
      skippedDuplicates++;
      continue;
    }

    let category = "Other";
    if (inv.category === "Computer") category = "Computer";
    else if (inv.category === "Laptop") category = "Laptop";
    else if (inv.category === "Printer") category = "Printer";
    else if (inv.category === "Monitor") category = "Monitor";
    else if (inv.category === "Server") category = "Server";
    else if (inv.category === "Network Device") category = "Network Device";
    else if (inv.category === "Mobile Device") category = "Mobile Device";
    else if (inv.category === "Software License") category = "Software";

    await ITUnifiedAsset.create({
      asset_tag: inv.item_id.trim(),
      asset_name: `${inv.brand || ""} ${inv.model || ""}`.trim() || inv.category,
      category,
      asset_type: inv.category,
      brand: inv.brand || "",
      model: inv.model || "",
      lifecycle_status: "In Stock",
      stock_type: inv.inventory_type === "New" ? "New" : "Old",
      warranty_start_date: inv.warranty_start_date || null,
      warranty_end_date: inv.warranty_end_date || null,
      approval_stage: "Completed",
      origin_source: "Cloned_Inventory",
      legacy_ref_id: inv._id,
      remarks: "Cloned from legacy Inventory Management",
    });
    clonedInventory++;
  }

  console.log("-----------------------------------------");
  console.log(`Clone complete!`);
  console.log(`- Cloned Assets: ${clonedAssets}`);
  console.log(`- Cloned Inventory: ${clonedInventory}`);
  console.log(`- Skipped Duplicates: ${skippedDuplicates}`);
  console.log(`- Total Unified Assets now: ${await ITUnifiedAsset.countDocuments()}`);
  console.log("-----------------------------------------");

  await mongoose.connection.close();
}

runClone().catch((err) => {
  console.error("Clone script failed:", err);
  process.exit(1);
});

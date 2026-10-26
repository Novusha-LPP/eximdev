import mongoose from "mongoose";

async function main() {
  await mongoose.connect("mongodb://localhost:27017/eximNew");
  const res = await mongoose.connection.db.collection("it_unified_assets").updateMany(
    { inventory_type: { $exists: false } },
    { $set: { inventory_type: "Old Inventory", condition: "Good" } }
  );
  console.log("Updated records without inventory_type:", res.modifiedCount);

  // If any had condition missing
  const res2 = await mongoose.connection.db.collection("it_unified_assets").updateMany(
    { condition: { $exists: false } },
    { $set: { condition: "Good" } }
  );
  console.log("Updated records without condition:", res2.modifiedCount);

  const sample = await mongoose.connection.db.collection("it_unified_assets").findOne({});
  console.log("Sample asset_tag:", sample.asset_tag, "inventory_type:", sample.inventory_type, "condition:", sample.condition);
  await mongoose.disconnect();
}

main().catch(console.error);

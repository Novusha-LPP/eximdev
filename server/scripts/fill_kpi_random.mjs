import mongoose from "mongoose";

const PROD_URI = "mongodb://exim:I9y5bcMUHkGHpgq2@ac-oqmvpdw-shard-00-00.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-01.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-02.xya3qh0.mongodb.net:27017/exim?ssl=true&replicaSet=atlas-103rb8-shard-0&authSource=admin&retryWrites=true&w=majority";
const LOCAL_URI = "mongodb://localhost:27017/eximNew";

function getWeightedRandom() {
  const r = Math.random() * 100;
  if (r < 50) return 9;           // 50% 9 (most frequent)
  if (r < 77) return 8;           // 27% 8 (second most frequent)
  if (r < 91) return 7;           // 14% 7 (third most frequent)
  if (r < 94) return 10;          // 3% 10
  // Remaining 6% randomly picked between 1 and 6
  return Math.floor(Math.random() * 6) + 1;
}

async function fillSheet(uri, sheetId) {
  try {
    const conn = await mongoose.createConnection(uri).asPromise();
    console.log(`Connected to: ${uri.includes("atlas") ? "Atlas (Prod)" : "Local MongoDB"}`);

    const sheet = await conn.collection("kpisheets").findOne({ _id: new mongoose.Types.ObjectId(sheetId) });
    if (!sheet) {
      console.log(`Sheet ${sheetId} not found in this DB.`);
      await conn.close();
      return;
    }

    const workingDays = [];
    for (let d = 1; d <= 30; d++) {
      const date = new Date(2026, 8, d); // September 2026
      if (date.getDay() !== 0) { // Exclude Sundays (6, 13, 20, 27)
        workingDays.push(d);
      }
    }

    const freq = {};
    const updatedRows = sheet.rows.map((row) => {
      const daily_values = {};
      let total = 0;
      for (const d of workingDays) {
        const val = getWeightedRandom();
        daily_values[String(d)] = val;
        total += val;
        freq[val] = (freq[val] || 0) + 1;
      }
      return {
        ...row,
        daily_values,
        total,
        actual: total,
      };
    });

    console.log("Frequencies generated across all rows:", freq);

    await conn.collection("kpisheets").updateOne(
      { _id: new mongoose.Types.ObjectId(sheetId) },
      { $set: { rows: updatedRows } }
    );

    console.log(`Successfully updated sheet ${sheetId}!`);
    await conn.close();
  } catch (err) {
    console.error(`Error updating on ${uri}:`, err.message);
  }
}

async function main() {
  console.log("Filling random KPI values (mostly 9, then 8, then 7, few 1-6)...");
  // 1. Update Atlas prod sheet
  await fillSheet(PROD_URI, "6abe15b7d75831f2ec77d8e7");
  // 2. Also update local DB sheet if present
  await fillSheet(LOCAL_URI, "6aa2377e0fecf8bf5880dea6");
  process.exit(0);
}

main();

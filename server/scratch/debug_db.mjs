import { MongoClient } from "mongodb";

const debugDb = async () => {
  const uri = "mongodb://0.0.0.0:27017/eximNew";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("eximNew");
    const collection = db.collection("jobs");

    const totalCount = await collection.countDocuments({});
    console.log(`Total jobs in database: ${totalCount}`);

    const oocBeCount = await collection.countDocuments({
      out_of_charge: { $type: "string", $ne: "" },
      be_date: { $type: "string", $ne: "" },
      importer: { $ne: null, $ne: "" }
    });
    console.log(`Jobs with OOC, BE date, Importer: ${oocBeCount}`);

    // Modes in the entire database
    const modes = await collection.distinct("mode");
    console.log("Distinct modes in entire db:", modes);

    // Modes specifically for those with OOC, BE date, Importer
    const modesForFiltered = await collection.distinct("mode", {
      out_of_charge: { $type: "string", $ne: "" },
      be_date: { $type: "string", $ne: "" },
      importer: { $ne: null, $ne: "" }
    });
    console.log("Distinct modes in filtered jobs:", modesForFiltered);

    // Count of each mode in filtered jobs
    for (const m of modesForFiltered) {
      const count = await collection.countDocuments({
        out_of_charge: { $type: "string", $ne: "" },
        be_date: { $type: "string", $ne: "" },
        importer: { $ne: null, $ne: "" },
        mode: m
      });
      console.log(`Count of mode '${m}': ${count}`);
    }

  } catch (error) {
    console.error("Debug failed:", error);
  } finally {
    await client.close();
  }
};

debugDb();

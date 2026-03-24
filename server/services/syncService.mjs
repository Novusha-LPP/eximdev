import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { migrateJobs, migrateGandhidhamJobs } from "../utils/migrationLogic.mjs";

const SOURCE_URI = process.env.PROD_MONGODB_URI;
const LOCAL_URI = process.env.DEV_MONGODB_URI;

const SKIP_COLLECTIONS = ["cths", "audittrails"];

export async function syncProductionToLocal(options = { onProgress: null }) {
    const { runSync = true, runMigrateJobs = false, runMigrateGandhidham = false, onProgress = null } = options;

    const sourceClient = new MongoClient(SOURCE_URI);
    const localClient = new MongoClient(LOCAL_URI);

    const results = {
        sync: [],
        migrations: {}
    };

    try {
        console.log("🔄 Connecting to databases...");
        await localClient.connect();

        if (runSync) {
            await sourceClient.connect();
            const sourceDb = sourceClient.db();
            const localDb = localClient.db();

            const collections = await sourceDb.listCollections().toArray();
            const totalCols = collections.length;
            console.log(`📦 Found ${totalCols} collections`);

            let colIndex = 0;
            for (const col of collections) {
                const name = col.name;
                colIndex++;

                if (SKIP_COLLECTIONS.includes(name)) {
                    console.log(`⏭ Skipping collection: ${name}`);
                    if (onProgress) onProgress({ phase: `Syncing: ${name}`, current: colIndex, total: totalCols });
                    continue;
                }

                console.log(`➡ Syncing collection: ${name}`);
                if (onProgress) onProgress({ phase: `Syncing: ${name}`, current: colIndex, total: totalCols });

                const sourceCollection = sourceDb.collection(name);
                const localCollection = localDb.collection(name);

                const data = await sourceCollection.find({}).toArray();

                // Replace local data
                await localCollection.deleteMany({});
                if (data.length > 0) {
                    await localCollection.insertMany(data);
                }

                results.sync.push({ collection: name, count: data.length });
                console.log(`   ✅ ${data.length} records synced`);
            }
        } else {
            console.log("⏭ Skipping production data sync...");
        }

        // Run migrations if requested
        if (runMigrateJobs) {
            results.migrations.standardJobs = await migrateJobs(onProgress);
        }
        if (runMigrateGandhidham) {
            results.migrations.gandhidhamJobs = await migrateGandhidhamJobs(onProgress);
        }

        console.log("\n🎉 Sync completed successfully!");
        if (onProgress) onProgress({ phase: "Completed", current: 1, total: 1, done: true });
        return results;
    } catch (err) {
        console.error("❌ Error during sync:", err);
        if (onProgress) onProgress({ phase: "Error", message: err.message, error: true });
        throw err;
    } finally {
        await sourceClient.close();
        await localClient.close();
    }
}

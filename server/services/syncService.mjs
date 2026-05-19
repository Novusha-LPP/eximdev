import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { migrateJobs, migrateGandhidhamJobs } from "../utils/migrationLogic.mjs";

const SKIP_COLLECTIONS = ["cths", "audittrails"];

export async function syncProductionToLocal(options = { onProgress: null }) {
    const { runSync = true, runMigrateJobs = false, runMigrateGandhidham = false, onProgress = null } = options;

    // Resolve URIs with sensible fallbacks
    const SOURCE_URI = process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI;
    const LOCAL_URI = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.PROD_MONGODB_URI;

    if (!SOURCE_URI) {
        throw new Error("Missing source MongoDB URI. Set PROD_MONGODB_URI or SERVER_MONGODB_URI in environment.");
    }
    if (!LOCAL_URI) {
        throw new Error("Missing local MongoDB URI. Set DEV_MONGODB_URI or SERVER_MONGODB_URI in environment.");
    }

    let sourceClient;
    let localClient;

    const results = {
        sync: [],
        migrations: {}
    };

    try {
        sourceClient = new MongoClient(SOURCE_URI);
        localClient = new MongoClient(LOCAL_URI);

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
        try {
            if (sourceClient) await sourceClient.close();
        } catch (e) {
            console.warn("Warning: failed to close source client:", e.message);
        }
        try {
            if (localClient) await localClient.close();
        } catch (e) {
            console.warn("Warning: failed to close local client:", e.message);
        }
    }
}

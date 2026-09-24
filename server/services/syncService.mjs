
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { migrateJobs, migrateGandhidhamJobs } from "../utils/migrationLogic.mjs";

const SKIP_COLLECTIONS = ["cths", "audittrails", "users", "graph_notifications", "serverlogs"];

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
        const clientOptions = {
            serverSelectionTimeoutMS: 60000,
            connectTimeoutMS: 60000,
            socketTimeoutMS: 600000,
            heartbeatFrequencyMS: 30000,
        };

        sourceClient = new MongoClient(SOURCE_URI, clientOptions);
        localClient = new MongoClient(LOCAL_URI, clientOptions);

        console.log("🔄 Connecting to databases...");
        await localClient.connect();

        if (runSync) {
            await sourceClient.connect();
            const sourceDb = sourceClient.db();
            const localDb = localClient.db();

            // Clear all local collections except skipped collections before starting the sync
            console.log("🧹 Clearing existing local collections (except skipped collections)...");
            const localCollections = await localDb.listCollections().toArray();
            for (const col of localCollections) {
                const name = col.name;
                if (SKIP_COLLECTIONS.includes(name) || name.startsWith("system.")) {
                    continue;
                }
                console.log(`   🧹 Clearing local collection: ${name}`);
                try {
                    await localDb.collection(name).deleteMany({});
                } catch (clearErr) {
                    console.warn(`Warning: failed to clear local collection ${name}:`, clearErr.message);
                }
            }

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

                let success = false;
                let retries = 3;
                let lastError = null;

                while (retries > 0 && !success) {
                    try {
                        const sourceCollection = sourceDb.collection(name);
                        const localCollection = localDb.collection(name);

                        const data = await sourceCollection.find({}).toArray();

                        // Replace local data
                        await localCollection.deleteMany({});
                        if (data.length > 0) {
                            let cleanedData = data;

                            // Deduplicate data if there are unique indexes on the local collection
                            try {
                                const indexes = await localCollection.indexes();
                                const uniqueIndexes = indexes.filter(idx => idx.unique);

                                if (uniqueIndexes.length > 0) {
                                    const getNestedValue = (obj, path) => {
                                        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
                                    };

                                    for (const index of uniqueIndexes) {
                                        const keyFields = Object.keys(index.key);
                                        if (keyFields.length === 1 && keyFields[0] === "_id") continue;

                                        const seen = new Set();
                                        const filtered = [];

                                        // Process from newest to oldest (reverse order) to keep the latest record in case of duplicate keys
                                        for (let i = cleanedData.length - 1; i >= 0; i--) {
                                            const item = cleanedData[i];
                                            const keyParts = keyFields.map(field => {
                                                const val = getNestedValue(item, field);
                                                if (val && typeof val === 'object' && val.toString) {
                                                    return val.toString();
                                                }
                                                return String(val);
                                            });
                                            const keyStr = keyParts.join("::");

                                            if (!seen.has(keyStr)) {
                                                seen.add(keyStr);
                                                filtered.push(item);
                                            } else {
                                                console.log(`⚠️ Duplicate key found and removed in collection ${name}: ${keyStr} for index ${index.name}`);
                                            }
                                        }
                                        cleanedData = filtered.reverse();
                                    }
                                }
                            } catch (e) {
                                console.warn(`Could not verify unique indexes for collection ${name}:`, e.message);
                            }

                            // Insert in chunks of 1000 to prevent BSON/memory overflow
                            const BATCH_SIZE = 1000;
                            for (let i = 0; i < cleanedData.length; i += BATCH_SIZE) {
                                const chunk = cleanedData.slice(i, i + BATCH_SIZE);
                                try {
                                    await localCollection.insertMany(chunk, { ordered: false });
                                } catch (insertErr) {
                                    if (insertErr.code === 11000 || (insertErr.writeErrors && insertErr.writeErrors.length > 0)) {
                                        console.warn(`⚠️ Warning: Duplicate keys skipped in ${name}: ${insertErr.message}`);
                                    } else {
                                        throw insertErr;
                                    }
                                }
                            }
                        }

                        results.sync.push({ collection: name, count: data.length });
                        console.log(`   ✅ ${data.length} records synced`);
                        success = true;
                    } catch (err) {
                        retries--;
                        lastError = err;
                        console.warn(`⚠️ Error syncing collection ${name}. Retries left: ${retries}. Error: ${err.message}`);
                        
                        if (retries > 0) {
                            const delayMs = 5000;
                            console.log(`   Waiting ${delayMs / 1000}s before retrying connection & sync...`);
                            await new Promise(resolve => setTimeout(resolve, delayMs));

                            try {
                                console.log("   🔄 Attempting to re-establish connection to MongoDB...");
                                await sourceClient.connect();
                                await localClient.connect();
                            } catch (connErr) {
                                console.warn(`   ⚠️ Re-connection attempt failed: ${connErr.message}`);
                            }
                        }
                    }
                }

                if (!success) {
                    throw lastError || new Error(`Failed to sync collection ${name} after multiple retries.`);
                }
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

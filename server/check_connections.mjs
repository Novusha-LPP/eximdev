import { MongoClient } from "mongodb";
import fs from "fs/promises";
import path from "path";

const MONGO_URI = "mongodb+srv://clusterMonitor:1ajHprrMZzZ9kDyT@exim.xya3qh0.mongodb.net/exim"

if (!MONGO_URI) {
    console.error("❌ MONGO_URI not set");
    process.exit(1);
}

async function run() {
    const client = new MongoClient(MONGO_URI, {
        appName: "mongo-diagnostics",
        serverSelectionTimeoutMS: 5000,
    });

    try {
        await client.connect();
        const adminDb = client.db("admin");
        const results = {};

        console.log("\n=== CONNECTION STATS ===");
        const serverStatus = await adminDb.command({ serverStatus: 1 });
        console.log(serverStatus.connections);
        results.connectionStats = serverStatus.connections;

        console.log("\n=== ACTIVE APPLICATION OPS ===");
        const currentOps = await adminDb.command({
            currentOp: 1,
            active: true,
        });

        const appOps = currentOps.inprog.filter(
            op => op.appName || op.client
        );

        if (appOps.length === 0) {
            console.log("✅ No active application operations");
            results.activeApplicationOps = [];
        } else {
            const activeOpsData = appOps.map(op => ({
                opid: op.opid,
                appName: op.appName,
                client: op.client,
                secs_running: op.secs_running,
                ns: op.ns,
                command: op.command?.aggregate ? "aggregate" : op.command,
            }));
            activeOpsData.forEach(op => console.log(op));
            results.activeApplicationOps = activeOpsData;
        }

        console.log("\n=== CHANGE STREAM CHECK ===");
        const changeStreams = currentOps.inprog.filter(
            op => op.command?.pipeline?.[0]?.$changeStream
        );

        if (changeStreams.length === 0) {
            console.log("✅ No active change streams");
            results.changeStreams = [];
        } else {
            const changeStreamsData = changeStreams.map(op => ({
                opid: op.opid,
                appName: op.appName,
                client: op.client,
                secs_running: op.secs_running,
            }));
            changeStreamsData.forEach(op => console.log(op));
            results.changeStreams = changeStreamsData;
        }

        console.log("\n=== LONG RUNNING OPS (>30s) ===");
        const longOps = currentOps.inprog.filter(op => op.secs_running > 30);
        if (longOps.length === 0) {
            console.log("✅ No long-running operations");
            results.longRunningOps = [];
        } else {
            const longOpsData = longOps.map(op => ({
                opid: op.opid,
                appName: op.appName,
                secs_running: op.secs_running,
                ns: op.ns,
            }));
            longOpsData.forEach(op => console.log(op));
            results.longRunningOps = longOpsData;
        }

        // Save results to JSON file
        const outputPath = path.resolve("connection_stats.json");
        await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
        console.log(`\n✅ Results saved to ${outputPath}`);

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await client.close();
        process.exit(0);
    }
}

run();

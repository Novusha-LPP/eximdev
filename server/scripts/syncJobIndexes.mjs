import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import JobModel from "../model/jobModel.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGODB_URI =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_MONGODB_URI
    : process.env.NODE_ENV === "server"
      ? process.env.SERVER_MONGODB_URI
      : (process.env.DEV_MONGODB_URI || "mongodb://127.0.0.1:27017/exim");

async function main() {
  console.log("Connecting to MongoDB at:", MONGODB_URI.replace(/:([^:@]+)@/, ":****@"));
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB successfully.");

    console.log("\nSyncing indexes on JobModel...");
    const syncResult = await JobModel.syncIndexes();
    console.log("syncIndexes result:", syncResult);

    console.log("\nListing all current indexes on jobs collection:");
    const indexes = await JobModel.collection.indexes();
    indexes.forEach((idx, i) => {
      console.log(`${i + 1}. Name: "${idx.name}", Keys:`, JSON.stringify(idx.key));
    });

    console.log("\nRunning explain test on a General Job query with sorting...");
    const explainResult = await JobModel.find({ isGeneralJob: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .explain("executionStats");

    const execStats = explainResult.executionStats;
    console.log("\n--- Execution Stats ---");
    console.log("Execution Time (ms):", execStats.executionTimeMillis);
    console.log("Total Keys Examined:", execStats.totalKeysExamined);
    console.log("Total Docs Examined:", execStats.totalDocsExamined);
    console.log("Docs Returned:", execStats.nReturned);
    console.log("Stage:", execStats.executionStages.stage);

    console.log("\nJobModel indexes synced and verified successfully!");
  } catch (error) {
    console.error("Error syncing indexes:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

main();

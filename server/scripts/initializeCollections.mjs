import mongoose from "mongoose";
import dotenv from "dotenv";
import BranchModel from "../model/branchModel.mjs";
import { initializeBranchCollections } from "../model/jobModelFactory.mjs";

dotenv.config();

const MONGODB_URI =
    process.env.NODE_ENV === "production"
        ? process.env.PROD_MONGODB_URI
        : process.env.NODE_ENV === "server"
            ? process.env.SERVER_MONGODB_URI
            : process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximNew";

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully.");

        const branches = await BranchModel.find();
        console.log(`Found ${branches.length} branches.`);

        for (const branch of branches) {
            console.log(`Initializing collections for branch: ${branch.branch_name}`);
            await initializeBranchCollections(branch.branch_name, branch.categories || ["SEA"]);
        }

        console.log("Initialization complete.");
        process.exit(0);
    } catch (error) {
        console.error("Error during initialization:", error);
        process.exit(1);
    }
}

run();

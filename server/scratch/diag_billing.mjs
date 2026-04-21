import mongoose from "mongoose";
import BillModel from "./model/billModel.mjs";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximNew";

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        // Find all bills with empty billNo
        const draftBills = await BillModel.find({ billNo: "" });
        console.log("Found draft bills count:", draftBills.length);
        
        if (draftBills.length > 1) {
            console.log("CRITICAL: Multiple draft bills found with empty billNo. This will cause unique index violation if unique index exists on billNo.");
        }

        // Check indexes
        const indexes = await BillModel.collection.indexes();
        console.log("Indexes:", JSON.stringify(indexes, null, 2));

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

run();

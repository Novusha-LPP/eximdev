import mongoose from "mongoose";
import dotenv from "dotenv";
import BillModel from "../model/billModel.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximNew";

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const collection = mongoose.connection.db.collection('bills');

        // List existing indexes
        const currentIndexes = await collection.indexes();
        console.log("Current indexes:", currentIndexes.map(idx => idx.name));

        // Drop the old unique index on billNo if it exists
        if (currentIndexes.some(idx => idx.name === 'billNo_1' && idx.unique && !idx.partialFilterExpression)) {
            console.log("Dropping old unique index 'billNo_1'...");
            await collection.dropIndex('billNo_1');
        }

        // Apply new indexes from the model
        console.log("Syncing new indexes from model...");
        await BillModel.syncIndexes();

        const finalIndexes = await collection.indexes();
        console.log("Final indexes:", finalIndexes.map(idx => idx.name));

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

run();

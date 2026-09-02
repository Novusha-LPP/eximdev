import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import PurchaseBookEntryModel from "../model/purchaseBookEntryModel.mjs";
import PaymentRequestModel from "../model/paymentRequestModel.mjs";

const run = async () => {
    try {
        const uri = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";
        await mongoose.connect(uri);
        console.log("Connected to MongoDB.");

        const pbTotal = await PurchaseBookEntryModel.countDocuments();
        const pbRejected = await PurchaseBookEntryModel.countDocuments({ status: "Rejected" });
        const pbPendingOrSuccess = await PurchaseBookEntryModel.countDocuments({ status: "" });

        const prTotal = await PaymentRequestModel.countDocuments();
        const prPaid = await PaymentRequestModel.countDocuments({ status: "Paid" });
        const prRejected = await PaymentRequestModel.countDocuments({ status: "Rejected" });
        const prPending = await PaymentRequestModel.countDocuments({ status: "" });
        
        console.log(`\n--- Tally Transaction Stats ---`);
        console.log(`Purchase Book Entries:`);
        console.log(`  - Total Submitted: ${pbTotal}`);
        console.log(`  - Not Rejected (Pending/Success): ${pbPendingOrSuccess}`);
        console.log(`  - Rejected: ${pbRejected}`);
        console.log(`\nPayment Requests:`);
        console.log(`  - Total Submitted: ${prTotal}`);
        console.log(`  - Paid (Successful): ${prPaid}`);
        console.log(`  - Pending: ${prPending}`);
        console.log(`  - Rejected: ${prRejected}`);
        console.log(`-------------------------------\n`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();

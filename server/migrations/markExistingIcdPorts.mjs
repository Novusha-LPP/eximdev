import mongoose from "mongoose";
import dotenv from "dotenv";
import BranchModel from "../model/branchModel.mjs";

dotenv.config();

const targetICDs = ["INSAU6", "INJKA6", "INSBI6", "INBRC6", "INVCN6"];

async function migrate() {
    try {
        console.log("Starting migration to flag existing ICD ports...");

        const MONGODB_URI =
            process.env.MONGO_URI ||
            process.env.PROD_MONGODB_URI ||
            process.env.SERVER_MONGODB_URI ||
            process.env.DEV_MONGODB_URI;

        if (!MONGODB_URI) {
            console.error("No MongoDB URI found in environment variables.");
            process.exit(1);
        }

        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB.");

        const branches = await BranchModel.find({});
        console.log(`Found ${branches.length} branches to check.`);

        let updatedBranchesCount = 0;
        let updatedPortsCount = 0;

        for (const branch of branches) {
            let branchUpdated = false;
            if (branch.ports && branch.ports.length > 0) {
                for (const port of branch.ports) {
                    const code = (port.port_code || "").toUpperCase();
                    if (targetICDs.includes(code)) {
                        if (!port.is_icd) {
                            port.is_icd = true;
                            branchUpdated = true;
                            updatedPortsCount++;
                            console.log(` - Flagging port as ICD: ${port.port_name} (${port.port_code}) in branch ${branch.branch_name}`);
                        }
                    }
                }
            }

            if (branchUpdated) {
                await branch.save();
                updatedBranchesCount++;
            }
        }

        console.log(`Migration completed successfully.`);
        console.log(`Updated ${updatedPortsCount} ports across ${updatedBranchesCount} branches.`);
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();

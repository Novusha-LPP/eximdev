import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI;

const BranchSchema = new mongoose.Schema({ branch_name: String, branch_code: String }, { strict: false });
const BranchModel = mongoose.model('Branch', BranchSchema);

async function findBranch() {
    try {
        await mongoose.connect(MONGODB_URI);
        const branch = await BranchModel.findById('69abeeae0a6647027c4a09a8');
        console.log("BH_NAME:", branch ? branch.branch_name : "NOT_FOUND");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findBranch();

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

async function listBranches() {
    try {
        await mongoose.connect(MONGODB_URI);
        const branches = await BranchModel.find();
        branches.forEach(b => {
            console.log(`${b._id} | ${b.branch_code} | ${b.branch_name}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listBranches();

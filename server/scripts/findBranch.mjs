import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI;

async function findGandhidhamBranch() {
    try {
        await mongoose.connect(MONGODB_URI);
        const BranchSchema = new mongoose.Schema({ branch_name: String, branch_code: String }, { strict: false });
        const BranchModel = mongoose.model('Branch', BranchSchema);

        const branch = await BranchModel.findOne({ branch_name: /Gandhidham/i });
        if (branch) {
            console.log(`BH_ID: ${branch._id}`);
            console.log(`BH_CODE: ${branch.branch_code}`);
        } else {
            console.log("BH_NOT_FOUND");
        }
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

findGandhidhamBranch();

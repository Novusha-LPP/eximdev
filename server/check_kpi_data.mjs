
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const KPISheetSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    year: Number,
    month: Number,
    summary: {
        business_loss: mongoose.Schema.Types.Mixed,
        root_cause: String,
        blockers: String
    }
});

const UserSchema = new mongoose.Schema({
    username: String,
    first_name: String,
    last_name: String
});

const KPISheet = mongoose.model('KPISheet', KPISheetSchema);
const User = mongoose.model('User', UserSchema);

async function checkData() {
    try {
        const mongoUri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            console.error("MONGO URI not found in .env");
            process.exit(1);
        }
        await mongoose.connect(mongoUri);
        console.log("Connected to DB:", mongoUri);

        const sheets = await KPISheet.find({
            year: 2026,
            month: 3,
            $or: [
                { "summary.business_loss": { $exists: true } },
                { "summary.blockers": { $exists: true } }
            ]
        }).populate('user');

        console.log(`Found ${sheets.length} sheets`);
        sheets.forEach(s => {
            console.log(`User: ${s.user?.username} (${s.user?.first_name}), Loss: ${s.summary?.business_loss}, Type: ${typeof s.summary?.business_loss}, Blockers: ${s.summary?.blockers ? 'Yes' : 'No'}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();

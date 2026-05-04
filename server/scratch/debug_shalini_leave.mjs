import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.PROD_MONGODB_URI;

if (!MONGO_URI) {
    console.error('PROD_MONGODB_URI not found in .env');
    process.exit(1);
}

const leaveApplicationSchema = new mongoose.Schema({}, { strict: false });
const LeaveApplication = mongoose.model('LeaveApplication', leaveApplicationSchema, 'leaveapplications');

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function debug() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const userId = '6852538cfecca8549389c9a4';
        
        const user = await User.findById(userId);
        if (user) {
            console.log(`User: ${user.username} (${user.first_name} ${user.last_name})`);
        }

        const leaves = await LeaveApplication.find({
            employee_id: new mongoose.Types.ObjectId(userId)
        }).sort({ from_date: -1 });

        console.log(`Found ${leaves.length} leaves for user ${userId}`);
        
        leaves.forEach(l => {
            console.log(`ID: ${l._id}`);
            console.log(`From Date (DB): ${l.from_date}`);
            console.log(`To Date (DB): ${l.to_date}`);
            console.log(`From Date (ISO): ${new Date(l.from_date).toISOString()}`);
            console.log(`To Date (ISO): ${new Date(l.to_date).toISOString()}`);
            console.log(`Status: ${l.approval_status}`);
            console.log(`Total Days: ${l.total_days}`);
            console.log(`Application Number: ${l.application_number}`);
            console.log('---');
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        const user = await db.collection('users').findOne({ username: 'rauf_dayma' });
        
        console.log(`User: ${user.first_name} ${user.last_name}`);

        const apps = await db.collection('leaveapplications').find({
            employee_id: user._id
        }).sort({ from_date: 1 }).toArray();

        console.log(`\nALL leave applications for Rauf:`);
        for (const app of apps) {
            console.log(`ID: ${app._id}`);
            console.log(`  Status: ${app.approval_status}`);
            console.log(`  Dates: ${app.from_date?.toISOString().slice(0,10)} to ${app.to_date?.toISOString().slice(0,10)}`);
            console.log(`  Total Days: ${app.total_days}`);
            console.log(`  Leave Type: ${app.leave_type}`);
            console.log(`  Reason: ${app.reason}`);
            console.log(`  Created At: ${app.createdAt}`);
            console.log(`  Updated At: ${app.updatedAt}`);
            console.log('---');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();

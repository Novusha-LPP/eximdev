import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        const user = await db.collection('users').findOne({ username: 'rauf_dayma' });
        
        console.log(`Checking audit logs for user: ${user.first_name} ${user.last_name}`);
        
        const logs = await db.collection('activitylogs').find({
            'metadata.userId': user._id,
            //action: /leave/i
        }).sort({ createdAt: -1 }).toArray();

        console.log(`\nFound ${logs.length} activity logs for Rauf:`);
        for (const log of logs.slice(0, 10)) {
            console.log(`[${log.createdAt}] ${log.action} - ${log.details}`);
        }

        console.log(`\nChecking all LeaveBalances ever created for Rauf:`);
        const balances = await db.collection('leavebalances').find({ employee_id: user._id }).sort({ createdAt: 1 }).toArray();
        for (const bal of balances) {
            console.log(`Type: ${bal.leave_type}, Year: ${bal.year}`);
            console.log(`  Opening: ${bal.opening_balance}, Used: ${bal.used}, Closing: ${bal.closing_balance}`);
            console.log(`  Created: ${bal.createdAt}, Updated: ${bal.updatedAt}`);
            // Does this model have an audit history?
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();

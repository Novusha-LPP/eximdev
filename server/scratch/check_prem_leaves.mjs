import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'C:/Users/india/Desktop/Projects/eximdev/server/.env' });

async function debug() {
    try {
        await mongoose.connect(process.env.PROD_MONGODB_URI);
        console.log('Connected to DB');

        // Update any LWP balance record that has non-zero pending_approval to 0
        const updateResult = await mongoose.connection.db.collection('leavebalances').updateMany(
            { leave_type: 'lwp', pending_approval: { $ne: 0 } },
            { $set: { pending_approval: 0, last_updated: new Date() } }
        );

        console.log(`Updated LWP records with non-zero pending_approval: ${updateResult.modifiedCount}`);

        // Find user Prem Chaudhry
        const user = await mongoose.connection.db.collection('users').findOne({ username: /prem_chaudhry/i });
        if (!user) {
            console.log('User not found');
            return;
        }

        const balances = await mongoose.connection.db.collection('leavebalances').find({ 
            employee_id: user._id
        }).toArray();

        console.log('\n--- Updated Leave Balances for Prem ---');
        balances.forEach(b => {
            console.log(JSON.stringify(b, null, 2));
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

debug();

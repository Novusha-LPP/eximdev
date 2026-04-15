import mongoose from 'mongoose';

async function checkAppDetails() {
    try {
        await mongoose.connect('mongodb://localhost:27017/exim');
        const empId = new mongoose.Types.ObjectId('6672a2501aa931b68b091fce');
        const app = await mongoose.connection.db.collection('leaveapplications').findOne({ 
            employee_id: empId
        });
        console.log('Application Details:', JSON.stringify(app, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkAppDetails();

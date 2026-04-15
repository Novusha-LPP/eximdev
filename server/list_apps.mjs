import mongoose from 'mongoose';

async function listCollections() {
    try {
        await mongoose.connect('mongodb://localhost:27017/exim');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
        
        // Find ALL applications for the employee regardless of status
        const empId = new mongoose.Types.ObjectId('6672a2501aa931b68b091fce');
        const apps = await mongoose.connection.db.collection('leaveapplications').find({ 
            employee_id: empId
        }).toArray();
        console.log(`Applications for ${empId}:`, apps.length);
        if (apps.length > 0) {
            console.log('Statuses:', apps.map(a => a.approval_status));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

listCollections();

import mongoose from 'mongoose';
import Shift from './server/model/attendance/Shift.js';
import User from './server/model/userModel.mjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

async function checkOperationsShift() {
    await mongoose.connect(process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim');
    
    const shift = await Shift.findOne({ shift_name: /Operations/i });
    if (!shift) {
        console.log('Operations shift not found');
    } else {
        console.log('Operations Shift:', JSON.stringify(shift, null, 2));
        const userCount = await User.countDocuments({ shift_id: shift._id });
        console.log(`Users assigned to this shift: ${userCount}`);
        
        if (userCount > 0) {
            const users = await User.find({ shift_id: shift._id }).limit(5);
            console.log('Example Users:', users.map(u => ({ id: u._id, username: u.username })));
        }
    }
    
    await mongoose.disconnect();
}

checkOperationsShift();

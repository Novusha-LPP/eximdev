import mongoose from 'mongoose';
import UserModel from '../model/userModel.mjs';
import LeaveApplicationModel from '../model/attendance/LeaveApplication.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
    try {
        await mongoose.connect(process.env.DEV_MONGODB_URI);
        
        const user = await UserModel.findOne({ username: 'jeeya_inamdar' });
        if (!user) {
            console.log('User not found');
            process.exit(0);
        }
        
        console.log('User:', user.username, 'ID:', user._id);
        
        const leaves = await LeaveApplicationModel.find({ employee_id: user._id }).sort({ createdAt: -1 }).limit(5);
        console.log('Recent leaves:', JSON.stringify(leaves, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

check();

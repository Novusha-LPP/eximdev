import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eximdev';

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

const leaveApplicationSchema = new mongoose.Schema({}, { strict: false });
const LeaveApplication = mongoose.model('LeaveApplication', leaveApplicationSchema, 'leaveapplications');

async function debug() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const userIdStr = '6852538cfecca8549389c9a4';
        const user = await User.findById(userIdStr);
        if (user) {
            console.log('User found:', user.username, user.first_name, user.last_name);
        } else {
            console.log('User not found by ID');
            const userByUsername = await User.findOne({ username: 'shalini_arun' });
            if (userByUsername) {
                console.log('User found by username shalini_arun:', userByUsername._id);
            }
        }

        // Find any leave application in that date range
        const startOfMay = new Date('2026-04-20');
        const endOfMay = new Date('2026-05-10');
        
        const leaves = await LeaveApplication.find({
            from_date: { $gte: startOfMay, $lte: endOfMay }
        }).populate('employee_id');

        console.log(`Found ${leaves.length} leaves in date range`);
        for (const l of leaves) {
            const emp = await User.findById(l.employee_id);
            console.log(`ID: ${l._id}, Emp: ${emp ? emp.username : l.employee_id}, From: ${l.from_date}, To: ${l.to_date}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();

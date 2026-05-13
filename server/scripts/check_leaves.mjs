import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const dbUri = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';
    await mongoose.connect(dbUri);
    const db = mongoose.connection.db;

    const today = '2026-05-13';
    
    const approved = await db.collection('leaveapplications').find({
        from_date_str: { $lte: today },
        to_date_str: { $gte: today },
        approval_status: 'approved'
    }).toArray();

    const pending = await db.collection('leaveapplications').find({
        from_date_str: { $lte: today },
        to_date_str: { $gte: today },
        approval_status: { $ne: 'approved' }
    }).toArray();

    console.log(`Approved leaves for ${today}: ${approved.length}`);
    console.log(`Pending/Other leaves for ${today}: ${pending.length}`);
    
    approved.forEach(l => {
        console.log(`Approved: Emp ${l.employee_id}, Status: ${l.approval_status}`);
    });

    pending.forEach(l => {
        console.log(`Pending/Other: Emp ${l.employee_id}, Status: ${l.approval_status}`);
    });

    process.exit(0);
}

check();

import mongoose from 'mongoose';

async function check() {
    await mongoose.connect('mongodb://localhost:27017/exim');
    const user = await mongoose.connection.db.collection('users').findOne({ 
        $or: [
            { first_name: /Ajay/i, last_name: /Kumavat/i },
            { username: /ajay_kumavat/i },
            { first_name: /Ajay/i }
        ] 
    });
    console.log('User:', JSON.stringify(user, null, 2));

    if (user) {
        const records = await mongoose.connection.db.collection('attendancerecords').find({
            employee_id: user._id,
            attendance_date: {
                $gte: new Date('2026-04-01'),
                $lte: new Date('2026-04-30')
            }
        }).toArray();
        console.log('Records:', JSON.stringify(records, null, 2));
    }
    process.exit(0);
}
check();

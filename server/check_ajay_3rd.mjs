import mongoose from 'mongoose';

async function check() {
    await mongoose.connect('mongodb://localhost:27017/exim');
    const user = await mongoose.connection.db.collection('users').findOne({ 
        $or: [
            { first_name: /Ajay/i, last_name: /Kumavat/i },
            { username: /ajay_kumavat/i }
        ] 
    });

    if (user) {
        const record = await mongoose.connection.db.collection('attendancerecords').findOne({
            employee_id: user._id,
            attendance_date: {
                $gte: new Date('2026-04-03T00:00:00.000Z'),
                $lte: new Date('2026-04-03T23:59:59.999Z')
            }
        });
        console.log('Record for April 3rd:', JSON.stringify(record, null, 2));
    }
    process.exit(0);
}
check();

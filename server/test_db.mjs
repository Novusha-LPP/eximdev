import mongoose from "mongoose";

const run = async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/exim', {useNewUrlParser: true, useUnifiedTopology: true});
    const User = mongoose.model('User', new mongoose.Schema({}, {strict: false, collection: 'users'}));
    const AttendanceRecord = mongoose.model('AttendanceRecord', new mongoose.Schema({}, {strict: false, collection: 'attendancerecords'}));
    
    const user = await User.findOne({ first_name: /jeeya/i });
    if (!user) { console.log('User not found'); process.exit(0); }
    
    console.log('User ID:', user._id);
    
    const att = await AttendanceRecord.find({ employee_id: user._id });
    console.log('Attendance:', att.map(a => `${a.attendance_date.toISOString().split('T')[0]}: ${a.status} (by ${a.processed_by})`));
    process.exit(0);
};

run().catch(console.error);

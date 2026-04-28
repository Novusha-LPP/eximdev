import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment-timezone';

dotenv.config();

// Define Schemas
const userSchema = new mongoose.Schema({
  username: String,
  company_id: mongoose.Schema.Types.ObjectId,
  role: String
});

const policySchema = new mongoose.Schema({
  company_id: mongoose.Schema.Types.ObjectId,
  policy_name: String,
  weekly_off: [String],
  alternate_saturday_off: Boolean,
  saturday_off_type: String // e.g., "2,4"
});

const attendanceSchema = new mongoose.Schema({
  user_id: mongoose.Schema.Types.ObjectId,
  date: Date,
  status: String
});

const User = mongoose.model('User', userSchema);
const Policy = mongoose.model('AttendancePolicy', policySchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

async function checkDashboard() {
  try {
    await mongoose.connect('mongodb://localhost:27017/exim');
    console.log('Connected to MongoDB');

    const user = await User.findOne({ username: 'jeeya_inamdar' });
    if (!user) {
      console.log('User not found');
      return;
    }
    console.log('User found:', user._id, user.username);

    // We need to simulate the dashboard logic or check the DB for these dates
    // The user wants to check the dashboard API response.
    // I will try to find if there are attendance records for 25th and 26th April 2026.
    
    const startDate = moment.tz('2026-04-20', 'Asia/Kolkata').startOf('day').toDate();
    const endDate = moment.tz('2026-04-30', 'Asia/Kolkata').endOf('day').toDate();

    const attendance = await Attendance.find({
      user_id: user._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    console.log('Attendance records found:', attendance.length);
    attendance.forEach(rec => {
      console.log(`${moment(rec.date).tz('Asia/Kolkata').format('YYYY-MM-DD')}: ${rec.status}`);
    });

    // Let's also check the policy for her company
    const policy = await Policy.findOne({ company_id: user.company_id });
    console.log('Policy:', JSON.stringify(policy, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDashboard();

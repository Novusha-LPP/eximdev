import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../model/userModel.mjs';

dotenv.config({ path: './server/.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    const users = await User.find({
      $or: [
        { first_name: /afzal/i },
        { last_name: /ghanchi/i },
        { first_name: /ajith/i },
        { last_name: /sivadasan/i },
        { username: /afzal/i },
        { username: /ajith/i }
      ]
    }).populate('teamId');

    console.log(`Found ${users.length} matching users:`);
    users.forEach(u => {
      console.log(`ID: ${u._id}`);
      console.log(`Username: ${u.username}`);
      console.log(`Name: ${u.first_name} ${u.last_name}`);
      console.log(`Role: ${u.role}`);
      console.log(`Team: ${u.teamId ? (u.teamId.name || u.teamId.team_name || u.teamId.teamName) : 'No Team'}`);
      console.log('-------------------------------------------');
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();

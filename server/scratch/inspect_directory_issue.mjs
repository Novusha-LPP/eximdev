import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';
import TeamModel from '../model/teamModel.mjs';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const umang = await UserModel.findOne({ username: 'umangsingh_rajput' }).lean();
    const afzal = await UserModel.findOne({ username: 'afzal_ghanchi' }).lean();
    const ajith = await UserModel.findOne({ username: 'ajith_sivadasan' }).lean();

    // Find all teams containing umangsingh_rajput
    console.log('\n--- Teams containing umangsingh_rajput ---');
    const teamsWithUmang = await TeamModel.find({
      $or: [
        { 'members.userId': umang?._id },
        { 'members.username': 'umangsingh_rajput' }
      ]
    }).lean();
    if (teamsWithUmang.length > 0) {
      teamsWithUmang.forEach(t => {
        console.log(`Team: ${t.name}, HOD: ${t.hodUsername} (${t.hodId}), Active: ${t.isActive}`);
      });
    } else {
      console.log('umangsingh_rajput is NOT a member of any team in the TeamModel collection.');
    }

    // Find all teams where afzal_ghanchi is HOD
    console.log('\n--- Teams where afzal_ghanchi is HOD ---');
    const teamsWithAfzalHOD = await TeamModel.find({
      $or: [
        { hodId: afzal?._id },
        { hodUsername: 'afzal_ghanchi' }
      ]
    }).lean();
    if (teamsWithAfzalHOD.length > 0) {
      teamsWithAfzalHOD.forEach(t => {
        console.log(`Team: ${t.name}, HOD: ${t.hodUsername} (${t.hodId}), Active: ${t.isActive}`);
      });
    } else {
      console.log('afzal_ghanchi is NOT the HOD of any team in the TeamModel collection.');
    }

    // Find all teams in the system (their names, hod, isActive)
    console.log('\n--- All Teams in Database ---');
    const allTeams = await TeamModel.find({}).lean();
    allTeams.forEach(t => {
      console.log(`- Team: ${t.name}, HOD: ${t.hodUsername} (${t.hodId}), Active: ${t.isActive}, Member Count: ${t.members?.length}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();

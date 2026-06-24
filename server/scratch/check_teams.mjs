import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TeamModel from '../model/teamModel.mjs';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const teams = await TeamModel.find({ isActive: { $ne: false } }).lean();
    for (const team of teams) {
      console.log(`Team: ${team.name}, HOD: ${team.hodUsername}, Members count: ${team.members?.length}`);
      if (team.hodUsername === 'ajith_sivadasan' || team.hodUsername === 'afzal_ghanchi') {
        console.log('  -> HOD is targeted!');
      }
      const hasAjith = team.members?.some(m => m.username === 'ajith_sivadasan');
      const hasAfzal = team.members?.some(m => m.username === 'afzal_ghanchi');
      if (hasAjith || hasAfzal) {
        console.log(`  -> Contains target member: Ajith? ${hasAjith}, Afzal? ${hasAfzal}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();

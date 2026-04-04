
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = 'mongodb://localhost:27017/exim';

async function check() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const eximId = new mongoose.Types.ObjectId("69cbc481d44c495e5ef54678");
    const users = await db.collection('users').find({ company_id: eximId }).limit(10).toArray();
    console.log('EXIM Global users count:', users.length);
    users.forEach(u => console.log(` - ${u.username} isActive: ${u.isActive} role: ${u.role}`));
    
    const countActive = await db.collection('users').countDocuments({ company_id: eximId, isActive: true });
    console.log('Active EXIM Global users:', countActive);

    const countAllForCompany = await db.collection('users').countDocuments({ company_id: eximId });
    console.log('Total EXIM Global users in DB:', countAllForCompany);

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

check();

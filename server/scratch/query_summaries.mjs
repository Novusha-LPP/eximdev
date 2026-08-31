import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'C:\\eximdev\\server\\.env' });

const mongoUri = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim_attendance';

console.log('Connecting to', mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected');
    
    // Find the user AFZAL GHANCHI
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const emp = await User.findOne({ first_name: /AFZAL/i }).lean();
    
    if (!emp) {
      console.log('Employee not found');
      mongoose.disconnect();
      return;
    }
    
    console.log('Employee Details from DB:');
    console.log(JSON.stringify(emp, null, 2));
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
  });

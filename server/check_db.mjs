import mongoose from 'mongoose';
import '../dotenv_config.mjs'; // assuming eximdev/server/dotenv_config.mjs exists

const User = mongoose.model('User'); // already registered by exim server
// We might need to register Company model manually if it's not loaded yet
const companySchema = new mongoose.Schema({}, { strict: false });
const Company = mongoose.models.Company || mongoose.model('Company', companySchema);

async function check() {
  await mongoose.connect(process.env.DEV_MONGODB_URI);
  
  const companyCount = await Company.countDocuments();
  console.log('Total Companies:', companyCount);
  
  const allCompanies = await Company.find().limit(5);
  console.log('Company sample:', JSON.stringify(allCompanies, null, 2));

  const allUsers = await User.find({ company_id: { $exists: true } }).limit(5).select('username company_id');
  console.log('Users with company_id:', JSON.stringify(allUsers, null, 2));

  process.exit();
}

check().catch(console.error);

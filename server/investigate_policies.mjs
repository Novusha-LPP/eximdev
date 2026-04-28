import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkPolicies() {
  try {
    await mongoose.connect('mongodb://localhost:27017/exim');
    const Policy = mongoose.model('WeekOffPolicy', new mongoose.Schema({}, { strict: false }));
    const policies = await Policy.find().lean();
    
    console.log(`Total policies found: ${policies.length}`);
    policies.forEach(p => {
      console.log(`- ${p.policy_name} (ID: ${p._id})`);
      console.log(`  Company ID: ${p.company_id || 'MISSING'}`);
      console.log(`  All Teams: ${p.applicability?.teams?.all}`);
    });

    const user = await mongoose.model('User', new mongoose.Schema({ username: String, company_id: mongoose.Schema.Types.ObjectId })).findOne({ username: 'jeeya_inamdar' });
    console.log(`Jeeya Company ID: ${user.company_id}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkPolicies();

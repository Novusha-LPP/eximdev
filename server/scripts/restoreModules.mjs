/**
 * Restore IT Helpdesk module for user
 * Adds "IT Helpdesk" to Admin and Manager users if missing
 *
 * Usage:
 *   node server/scripts/restoreModules.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import User from '../model/userModel.mjs';

const restoreModules = async () => {
  const uri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.PROD_MONGODB_URI;
  if (!uri) {
    console.error('No MongoDB URI found in environment variables');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri, { maxPoolSize: 10 });
  console.log('Connected to MongoDB\n');

  const users = await User.find({}).select('username role modules isActive');
  console.log(`Total users: ${users.length}`);

  let updatedCount = 0;

  for (const user of users) {
    if (!user.modules || !Array.isArray(user.modules)) {
      user.modules = [];
    }

    const needsITHelpdesk = (user.role === 'Admin' || user.role === 'IT Team' || user.role === 'Manager');
    const hasITHelpdesk = user.modules.includes('IT Helpdesk');

    if (needsITHelpdesk && !hasITHelpdesk) {
      user.modules.push('IT Helpdesk');
      await user.save();
      updatedCount++;
      console.log(`  ✓ ${user.username} (${user.role}): Added IT Helpdesk, total modules: ${user.modules.length}`);
    }
  }

  console.log(`\nUpdated ${updatedCount} users`);

  const helpdeskUsers = await User.countDocuments({ modules: 'IT Helpdesk' });
  console.log(`Users with IT Helpdesk module: ${helpdeskUsers}`);

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
  process.exit(0);
};

restoreModules().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

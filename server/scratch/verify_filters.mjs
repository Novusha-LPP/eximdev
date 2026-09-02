import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";

// Import model
import User from '../model/userModel.mjs';

async function run() {
  try {
    console.log("Connecting to MongoDB at:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    // 1. Check all users count
    const totalUsers = await User.countDocuments({});
    console.log("Total users in database:", totalUsers);

    // 2. Check for driver users
    const drivers = await User.find({ role: /driver/i }).select('username role isActive');
    console.log(`Found ${drivers.length} driver users in database:`, drivers);

    // 3. Check for dev_master user
    const devMaster = await User.findOne({ username: 'dev_master' }).select('username role isActive');
    console.log("dev_master user in database:", devMaster ? devMaster : "NOT FOUND");

    // 4. Test driver filtering (Always filtered)
    const activeNonDriversCount = await User.countDocuments({
      role: { $nin: ['driver', 'Driver'] }
    });
    console.log("Active users excluding drivers count:", activeNonDriversCount);

    // 5. Test dev_master filtering (Only in production)
    console.log("\n--- Simulating Development Environment Query ---");
    const devQuery = {
      role: { $nin: ['driver', 'Driver'] }
    };
    const devUsers = await User.find(devQuery).select('username role');
    const devMasterIncluded = devUsers.some(u => u.username === 'dev_master');
    const driversIncludedInDev = devUsers.some(u => String(u.role).toLowerCase() === 'driver');
    console.log("Is dev_master included in DEV mode?", devMasterIncluded);
    console.log("Are drivers included in DEV mode?", driversIncludedInDev);

    console.log("\n--- Simulating Production Environment Query ---");
    const prodQuery = {
      role: { $nin: ['driver', 'Driver'] },
      username: { $ne: 'dev_master' }
    };
    const prodUsers = await User.find(prodQuery).select('username role');
    const devMasterIncludedInProd = prodUsers.some(u => u.username === 'dev_master');
    const driversIncludedInProd = prodUsers.some(u => String(u.role).toLowerCase() === 'driver');
    console.log("Is dev_master included in PROD mode?", devMasterIncludedInProd);
    console.log("Are drivers included in PROD mode?", driversIncludedInProd);

    // 6. If no driver exists, let's create a temporary driver to verify
    if (drivers.length === 0) {
      console.log("\nNo driver user exists. Creating a temporary driver to verify...");
      const tempDriver = new User({
        username: 'temp_driver_test',
        first_name: 'Temp',
        last_name: 'Driver',
        role: 'driver',
        isActive: true,
        email: 'temp_driver@example.com'
      });
      await tempDriver.save();
      console.log("Temporary driver user created.");

      const checkDriversCount = await User.countDocuments({
        role: { $nin: ['driver', 'Driver'] }
      });
      console.log("Count excluding drivers after creating temp driver:", checkDriversCount);

      // Verify the temp driver is not in the filtered query
      const filteredUsers = await User.find({
        role: { $nin: ['driver', 'Driver'] }
      }).select('username');
      const tempDriverFound = filteredUsers.some(u => u.username === 'temp_driver_test');
      console.log("Is temporary driver found in filtered query?", tempDriverFound);

      // Clean up
      await User.deleteOne({ username: 'temp_driver_test' });
      console.log("Temporary driver user deleted.");
    }

  } catch (error) {
    console.error("Error during verification:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

run();

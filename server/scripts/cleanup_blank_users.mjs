import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../model/userModel.mjs";

dotenv.config();

const MONGODB_URI ="mongodb://exim:I9y5bcMUHkGHpgq2@ac-oqmvpdw-shard-00-00.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-01.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-02.xya3qh0.mongodb.net:27017/exim?ssl=true&replicaSet=atlas-103rb8-shard-0&authSource=admin&retryWrites=true&w=majority";

async function runCleanup() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.");

    const query = {
      $or: [
        {
          $and: [
            { $or: [ { first_name: { $exists: false } }, { first_name: { $in: [null, "", " ", "  ", "   "] } } ] },
            { $or: [ { last_name: { $exists: false } }, { last_name: { $in: [null, "", " ", "  ", "   "] } } ] }
          ]
        },
        { username: { $regex: /^[\s_]*$/ } }
      ]
    };

    const targetUsers = await UserModel.find(query);
    console.log(`Found ${targetUsers.length} blank user records:`);
    targetUsers.forEach(user => {
      console.log(`- ID: ${user._id}, Username: "${user.username}", First Name: "${user.first_name}", Last Name: "${user.last_name}", Email: "${user.email}"`);
    });

    if (targetUsers.length > 0) {
      const result = await UserModel.deleteMany(query);
      console.log(`Successfully deleted ${result.deletedCount} blank user records.`);
    } else {
      console.log("No blank user records found to delete.");
    }

  } catch (error) {
    console.error("Cleanup failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

runCleanup();

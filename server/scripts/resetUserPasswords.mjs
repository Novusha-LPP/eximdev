
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/userModel.mjs";

// Connect to MongoDB
mongoose.connect("mongodb://0.0.0.0:27017/eximdev", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Default password for users with missing passwords
const DEFAULT_PASSWORD = "TempPassword123!";

async function resetUserPasswords() {
  try {
    // Find all users with missing or empty passwords
    const users = await User.find({
      $or: [
        { password: { $exists: false } },
        { password: { $eq: "" } },
        { password: null }
      ]
    });

    console.log(`Found ${users.length} users with missing passwords`);

    for (const user of users) {
      // Hash the default password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

      // Update the user's password
      user.password = hashedPassword;
      await user.save();

      console.log(`Updated password for user: ${user.username || user.email || "Unknown user"}`);
    }

    console.log("Password reset process completed");
    process.exit(0);
  } catch (error) {
    console.error("Error resetting passwords:", error);
    process.exit(1);
  }
}

// Run the function
resetUserPasswords();

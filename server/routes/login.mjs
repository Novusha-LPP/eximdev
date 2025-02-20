import express from "express";
import bcrypt from "bcrypt";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not registered" });
    }

    bcrypt.compare(
      password,
      user.password,
      async (passwordErr, passwordResult) => {
        if (passwordErr) {
          console.error(passwordErr);
          return res.status(500).json({ message: "Something went wrong" });
        }

        if (passwordResult) {
          // Set activeState to 1 after successful login
          user.activeState = 1;
          await user.save(); // Save the updated user object with activeState set to 1

          // Create a new object with only the required fields
          const userResponse = {
            username: user.username,
            role: user.role,
            modules: user.modules,
            first_name: user.first_name,
            middle_name: user.middle_name,
            last_name: user.last_name,
            company: user.company,
            employee_photo: user.employee_photo,
            designation: user.designation,
            department: user.department,
            employment_type: user.employment_type,
            email: user.email,
            assigned_importer: user.assigned_importer,
            assigned_importer_name: user.assigned_importer_name,
          };

          return res.status(200).json(userResponse);
        } else {
          return res
            .status(400)
            .json({ message: "Username or password didn't match" });
        }
      }
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});
// Add this route to your Express router

router.post("/api/logout", async (req, res) => {
  const { username } = req.body;

  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    user.activeState = 0; // Set activeState to 0
    await user.save(); // Save the updated user

    return res.status(200).json({ message: "User logged out successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/api/active-users-count", async (req, res) => {
  try {
    // Find users with activeState = 1
    const activeUsersCount = await UserModel.countDocuments({ activeState: 1 });

    return res.status(200).json({ activeUsersCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;

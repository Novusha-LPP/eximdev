import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../model/userModel.mjs";
import TeamModel from "../model/teamModel.mjs";
import { calculateProfileCompletion, sendManagerNotification } from "../utils/profileCompletion.mjs";

const router = express.Router();

router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await UserModel.findOne({ username })
      .select('+password')
      .populate("hod_id")
      .populate("attendance_settings.manager_id");
    if (!user) {
      return res.status(400).json({ message: "User not registered" });
    }

    if (!user.password) {
      console.error(`Login Error: User '${username}' exists but has no password in the database.`);
      return res.status(500).json({ message: "Account configuration error: Password missing." });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message: "User is deactivated. Please contact administrator.",
      });
    }

    bcrypt.compare(password, user.password, async (passwordErr, passwordResult) => {
      if (passwordErr) {
        console.error(passwordErr);
        return res.status(500).json({ message: "Something went wrong" });
      }

      if (passwordResult) {
        const isHodRole = (r) => {
          const normalized = String(r || '').trim().toLowerCase().replace(/[^a-z]/g, '');
          return normalized === 'hod' || normalized === 'headofdepartment';
        };

        const isHodOfAnyTeam = await TeamModel.exists({
          $or: [
            { hodId: user._id },
            ...(isHodRole(user.role) ? [{ "members.username": user.username }] : [])
          ],
          isActive: { $ne: false }
        });

        const passwordChangedAt = user.passwordChangedAt || new Date(0);
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const passwordExpired = (Date.now() - new Date(passwordChangedAt).getTime()) > thirtyDaysInMs;

        const userResponse = {
          _id: user._id,
          username: user.username,
          role: user.role,
          can_access_exim_bot: user.can_access_exim_bot,
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
          selected_icd_codes: user.selected_icd_codes,
          isHOD: !!isHodOfAnyTeam,
          hodId: isHodOfAnyTeam ? user._id.toString() : undefined,
          passwordExpired: passwordExpired,
          isAttendanceAllowedAdmin: user.isAttendanceAllowedAdmin
        };

        // Calculate profile completion
        const completion = calculateProfileCompletion(user);
        userResponse.profileCompletion = completion;

        // Automatically notify manager if critical fields are missing
        if (completion.hasCriticalMissing && user.role !== 'Admin') {
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const alreadyNotified = user.profile_manager_notified_at && user.profile_manager_notified_at > oneDayAgo;
          
          if (!alreadyNotified) {
            const manager = user.hod_id || user.attendance_settings?.manager_id;
            if (manager && manager.email) {
              try {
                await sendManagerNotification(user, manager.email, completion.missingBlockingFields);
                user.profile_manager_notified_at = new Date();
                await user.save();
                console.log(`Automatically notified manager ${manager.email} about incomplete profile of ${user.username}`);
              } catch (emailErr) {
                console.error("Error automatically notifying manager on login:", emailErr);
              }
            }
          }
        }

        const token = jwt.sign(
          {
            _id: user._id,
            username: user.username,
            role: user.role,
            company_id: user.company_id,
            department_id: user.department_id,
            shift_id: user.shift_id,
            current_status: user.current_status,
            last_punch_date: user.last_punch_date
          },
          process.env.JWT_SECRET || "fallback_secret_do_not_use_in_prod",
          { expiresIn: "10h" }
        );

        // ✅ FIX 1: Cookie with sameSite: "none" + secure for cross-origin support
        res.cookie("token", token, {
          httpOnly: true,
          secure: false, // set to true only in production with HTTPS
          sameSite: "none", // ✅ allows cross-origin cookie sending
          maxAge: 10 * 60 * 60 * 1000,
        });

        // ✅ FIX 2: Also return token in response body so frontend can use Authorization header
        return res.status(200).json({
          ...userResponse,
          token // ✅ frontend will store this and send as Bearer token
        });
      } else {
        return res.status(400).json({ message: "Username or password didn't match" });
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

export default router;

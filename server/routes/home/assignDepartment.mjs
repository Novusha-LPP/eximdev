import express from "express";
import UserModel from "../../model/userModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import requireAllowedAdmin from "../../middleware/requireAllowedAdmin.mjs";

const router = express.Router();

// Route to assign Department to a user
router.post("/admin/assign-department", authMiddleware, requireAllowedAdmin, async (req, res) => {
    const { username, selectedDepartment, adminUsername } = req.body;

    try {
        // Validation
        if (!username || !selectedDepartment) {
            return res.status(400).json({
                message: "Username and selected department are required"
            });
        }

        if (adminUsername && String(adminUsername).toLowerCase() !== String(req.user?.username || '').toLowerCase()) {
            return res.status(403).json({ message: 'Admin identity mismatch' });
        }

        // Find the target user
        const targetUser = await UserModel.findOne({ username });
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Valid Departments
        const validDepartments = [
            "Export", "Import", "Operation-Khodiyar", "Operation-Sanand",
            "Feild", "Accounts", "SRCC", "Gandhidham", "DGFT",
            "Software", "Marketing", "Paramount", "Rabs", "Admin"
        ];

        // Validate selected department
        if (!validDepartments.includes(selectedDepartment)) {
            return res.status(400).json({
                message: `Invalid department selected: ${selectedDepartment}`
            });
        }

        // Update the user's department
        targetUser.department = selectedDepartment;
        await targetUser.save();

        res.status(200).json({
            message: `Department "${selectedDepartment}" assigned to user "${username}" successfully`
        });

    } catch (err) {
        console.error("Error assigning department:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Route to remove department from a user
router.post("/admin/remove-department", authMiddleware, requireAllowedAdmin, async (req, res) => {
    const { username, adminUsername } = req.body;

    try {
        // Validation
        if (!username) {
            return res.status(400).json({
                message: "Username is required"
            });
        }

        if (adminUsername && String(adminUsername).toLowerCase() !== String(req.user?.username || '').toLowerCase()) {
            return res.status(403).json({ message: 'Admin identity mismatch' });
        }

        // Find the target user
        const targetUser = await UserModel.findOne({ username });
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if user has any department assigned
        if (!targetUser.department) {
            return res.status(400).json({
                message: "No department assigned to this user"
            });
        }

        // Remove department
        targetUser.department = undefined; // or "" or null depending on preference, undefined removes key
        await targetUser.save();

        res.status(200).json({
            message: `Department removed from user "${username}" successfully`
        });

    } catch (err) {
        console.error("Error removing department:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;

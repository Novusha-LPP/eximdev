import express from "express";
import UserModel from "../../model/userModel.mjs";
import BranchModel from "../../model/branchModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import requireAllowedAdmin from "../../middleware/requireAllowedAdmin.mjs";

const router = express.Router();

// Route to assign ICD Code to a user
router.post("/api/admin/assign-icd-code", authMiddleware, requireAllowedAdmin, auditMiddleware("User"), async (req, res) => {
  const { username, selectedIcdCodes, adminUsername } = req.body;

  try {
    // Validation
    if (!username || !selectedIcdCodes) {
      return res.status(400).json({
        message: "Username and selected ICD codes are required"
      });
    }

    // Ensure selectedIcdCodes is an array
    const icdCodesArray = Array.isArray(selectedIcdCodes) ? selectedIcdCodes : [selectedIcdCodes];

    if (adminUsername && String(adminUsername).toLowerCase() !== String(req.user?.username || '').toLowerCase()) {
      return res.status(403).json({ message: 'Admin identity mismatch' });
    }

    // Find the target user
    const targetUser = await UserModel.findOne({ username });
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Dynamic ICD codes from ports within branches
    const branches = await BranchModel.find({ is_active: true });
    // Extract unique port names from all branches
    const validIcdCodes = [...new Set(branches.flatMap(b => b.ports.map(p => p.port_name)))];

    // Validate all selected ICD codes
    const invalidCodes = icdCodesArray.filter(code => !validIcdCodes.includes(code));
    if (invalidCodes.length > 0) {
      return res.status(400).json({
        message: `Invalid ICD codes selected: ${invalidCodes.join(', ')}`
      });
    }

    // Update the user's ICD codes (remove duplicates)
    targetUser.selected_icd_codes = [...new Set(icdCodesArray)];
    await targetUser.save();

    res.status(200).json({
      message: `ICD codes "${icdCodesArray.join(', ')}" assigned to user "${username}" successfully`
    });

  } catch (err) {
    console.error("Error assigning ICD codes:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Route to assign ICD Codes to all users
router.post("/api/admin/assign-icd-code-to-all", authMiddleware, requireAllowedAdmin, auditMiddleware("User"), async (req, res) => {
  const { selectedIcdCodes, adminUsername } = req.body;

  try {
    if (!selectedIcdCodes) {
      return res.status(400).json({
        message: "Selected ICD codes are required"
      });
    }

    const icdCodesArray = Array.isArray(selectedIcdCodes) ? selectedIcdCodes : [selectedIcdCodes];

    if (adminUsername && String(adminUsername).toLowerCase() !== String(req.user?.username || '').toLowerCase()) {
      return res.status(403).json({ message: 'Admin identity mismatch' });
    }

    const branches = await BranchModel.find({ is_active: true });
    const validIcdCodes = [...new Set(branches.flatMap(b => b.ports.map(p => p.port_name)))];

    const invalidCodes = icdCodesArray.filter(code => !validIcdCodes.includes(code));
    if (invalidCodes.length > 0) {
      return res.status(400).json({
        message: `Invalid ICD codes selected: ${invalidCodes.join(', ')}`
      });
    }

    const result = await UserModel.updateMany(
      {},
      { $addToSet: { selected_icd_codes: { $each: icdCodesArray } } }
    );

    res.status(200).json({
      message: `ICD codes assigned to ${result.modifiedCount} users successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error("Error assigning ICD codes to all users:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Route to assign ICD Codes to selected users
router.post("/api/admin/assign-icd-code-to-users", authMiddleware, requireAllowedAdmin, auditMiddleware("User"), async (req, res) => {
  const { userIds, selectedIcdCodes, adminUsername } = req.body;

  try {
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !selectedIcdCodes) {
      return res.status(400).json({
        message: "User IDs and selected ICD codes are required"
      });
    }

    const icdCodesArray = Array.isArray(selectedIcdCodes) ? selectedIcdCodes : [selectedIcdCodes];

    if (adminUsername && String(adminUsername).toLowerCase() !== String(req.user?.username || '').toLowerCase()) {
      return res.status(403).json({ message: 'Admin identity mismatch' });
    }

    const branches = await BranchModel.find({ is_active: true });
    const validIcdCodes = [...new Set(branches.flatMap(b => b.ports.map(p => p.port_name)))];

    const invalidCodes = icdCodesArray.filter(code => !validIcdCodes.includes(code));
    if (invalidCodes.length > 0) {
      return res.status(400).json({
        message: `Invalid ICD codes selected: ${invalidCodes.join(', ')}`
      });
    }

    const result = await UserModel.updateMany(
      { _id: { $in: userIds } },
      { $addToSet: { selected_icd_codes: { $each: icdCodesArray } } }
    );

    res.status(200).json({
      message: `ICD codes assigned to ${result.modifiedCount} users successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error("Error assigning ICD codes to users:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Route to remove ICD Code from a user
router.post("/api/admin/remove-icd-code", authMiddleware, requireAllowedAdmin, auditMiddleware("User"), async (req, res) => {
  const { username, adminUsername, icdCodesToRemove } = req.body;

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

    // Check if user has any ICD codes assigned
    if (!targetUser.selected_icd_codes || targetUser.selected_icd_codes.length === 0) {
      return res.status(400).json({
        message: "No ICD codes assigned to this user"
      });
    }

    // If specific codes to remove are provided, remove only those
    if (icdCodesToRemove && Array.isArray(icdCodesToRemove)) {
      targetUser.selected_icd_codes = targetUser.selected_icd_codes.filter(
        code => !icdCodesToRemove.includes(code)
      );
      await targetUser.save();

      res.status(200).json({
        message: `ICD codes "${icdCodesToRemove.join(', ')}" removed from user "${username}" successfully`
      });
    } else {
      // Remove all ICD codes
      targetUser.selected_icd_codes = [];
      await targetUser.save();

      res.status(200).json({
        message: `All ICD codes removed from user "${username}" successfully`
      });
    }

  } catch (err) {
    console.error("Error removing ICD codes:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

import User from "../models/userModel.mjs";

// GET ALL USERS
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE USER
export const createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE USER
export const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).select("-password");

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE USER
export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User deleted",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
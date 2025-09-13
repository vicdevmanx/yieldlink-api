import { findUserById, updateUserById, deleteUserById } from "../models/userModel.js";

export const getProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.status(200).json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching profile" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const updatedUser = await updateUserById(req.user.id, req.body);
    res.status(200).json({ msg: "Profile updated successfully", user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error updating profile" });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    await deleteUserById(req.user.id);
    res.status(200).json({ msg: "Profile deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error deleting profile" });
  }
};

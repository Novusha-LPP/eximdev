import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// Assign or revoke Exim Bot access
router.post("/api/assign-exim-bot", async (req, res) => {
    const { username, can_access_exim_bot } = req.body;

    try {
        const user = await UserModel.findOne({ username });
        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        user.can_access_exim_bot = can_access_exim_bot;
        await user.save();

        res.status(200).send({
            message: `Exim Bot access ${can_access_exim_bot ? "granted" : "revoked"} successfully`,
            updatedUser: {
                username: user.username,
                can_access_exim_bot: user.can_access_exim_bot,
            },
        });
    } catch (error) {
        console.error("Error assigning Exim Bot access:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

// Get user's Exim Bot access status
router.get("/api/user-exim-bot-status/:username", async (req, res) => {
    try {
        const user = await UserModel.findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }
        res.status(200).send({
            username: user.username,
            can_access_exim_bot: user.can_access_exim_bot || false
        });
    } catch (error) {
        console.error("Error fetching status:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

export default router;

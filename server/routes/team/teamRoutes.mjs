import express from "express";
import TeamModel from "../../model/teamModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// Get all teams for an HOD
router.get("/api/teams/hod/:hodUsername", authMiddleware, async (req, res) => {
    try {
        const { hodUsername } = req.params;
        const query = { hodUsername, isActive: true };

        // If user is Admin, they must be in allowedAdmins (unless they are the HOD themselves, let's allow that)
        if (req.user.role === 'Admin') {
            query.$or = [
                { allowedAdmins: req.user.username },
                { hodUsername: req.user.username }
            ];
        }

        const teams = await TeamModel.find(query)
            .sort({ createdAt: -1 });

        // Auto-add HOD to members if not already present (fixes old teams)
        for (const team of teams) {
            const hodInMembers = team.members.some(m => m.username === team.hodUsername);
            if (!hodInMembers && team.hodUsername) {
                const hodUser = await UserModel.findOne({ username: team.hodUsername });
                if (hodUser) {
                    team.members.unshift({
                        userId: hodUser._id,
                        username: team.hodUsername,
                        addedAt: team.createdAt || new Date()
                    });
                    await team.save();
                }
            }
        }

        // Convert to plain objects and enrich with HOD details
        const teamsLean = teams.map(t => t.toObject());

        const hodIds = [...new Set(teamsLean.map(t => t.hodId?.toString()).filter(Boolean))];
        const hods = await UserModel.find({ _id: { $in: hodIds } })
            .select('_id first_name last_name username')
            .lean();

        const hodMap = {};
        hods.forEach(h => { hodMap[h._id.toString()] = h; });

        // Enrich teams with HOD details
        const enrichedTeams = teamsLean.map(team => ({
            ...team,
            hodDetails: hodMap[team.hodId?.toString()] || null
        }));

        res.json({ success: true, teams: enrichedTeams });
    } catch (error) {
        console.error("Error fetching HOD teams:", error);
        res.status(500).json({ success: false, message: "Failed to fetch teams" });
    }
});

// Get all teams (for Admin) - Filtered by allowedAdmins
router.get("/api/teams/all", authMiddleware, async (req, res) => {
    try {
        const query = { isActive: true };
        
        // If user is Admin, filter by allowedAdmins or if they are the HOD
        if (req.user.role === 'Admin') {
            query.$or = [
                { allowedAdmins: req.user.username },
                { hodUsername: req.user.username }
            ];
        }

        const teams = await TeamModel.find(query)
            .sort({ createdAt: -1 });

        // Auto-add HOD to members if not already present (fixes old teams)
        for (const team of teams) {
            const hodInMembers = team.members.some(m => m.username === team.hodUsername);
            if (!hodInMembers && team.hodUsername) {
                const hodUser = await UserModel.findOne({ username: team.hodUsername });
                if (hodUser) {
                    team.members.unshift({
                        userId: hodUser._id,
                        username: team.hodUsername,
                        addedAt: team.createdAt || new Date()
                    });
                    await team.save();
                }
            }
        }

        const teamsLean = teams.map(t => t.toObject());

        // Fetch HOD details for each team
        const hodIds = [...new Set(teamsLean.map(t => t.hodId?.toString()).filter(Boolean))];
        const hods = await UserModel.find({ _id: { $in: hodIds } })
            .select('_id first_name last_name username')
            .lean();

        const hodMap = {};
        hods.forEach(h => { hodMap[h._id.toString()] = h; });

        // Fetch member details
        const allMemberUsernames = new Set();
        teamsLean.forEach(t => t.members.forEach(m => allMemberUsernames.add(m.username)));

        const members = await UserModel.find({ username: { $in: [...allMemberUsernames] } })
            .select('username first_name last_name department employee_photo role')
            .lean();

        const memberMap = {};
        members.forEach(m => { memberMap[m.username] = m; });

        // Enrich teams with HOD and member details
        const enrichedTeams = teamsLean.map(team => ({
            ...team,
            hodDetails: hodMap[team.hodId?.toString()] || null,
            membersDetails: team.members.map(m => ({
                ...m,
                ...(memberMap[m.username] || {})
            }))
        }));

        res.json({ success: true, teams: enrichedTeams });
    } catch (error) {
        console.error("Error fetching all teams:", error);
        res.status(500).json({ success: false, message: "Failed to fetch teams" });
    }
});

// Get a specific team by ID
router.get("/api/teams/:teamId", authMiddleware, async (req, res) => {
    try {
        const { teamId } = req.params;
        const team = await TeamModel.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: "Team not found" });
        }

        // Access control for Admins
        if (req.user.role === 'Admin' && !team.allowedAdmins.includes(req.user.username) && team.hodUsername !== req.user.username) {
            return res.status(403).json({ success: false, message: "You do not have permission to view this team" });
        }

        // Auto-add HOD to members if not already present (fixes old teams)
        const hodInMembers = team.members.some(m => m.username === team.hodUsername);
        if (!hodInMembers && team.hodUsername) {
            const hodUser = await UserModel.findOne({ username: team.hodUsername });
            if (hodUser) {
                team.members.unshift({
                    userId: hodUser._id,
                    username: team.hodUsername,
                    addedAt: team.createdAt || new Date()
                });
                await team.save();
            }
        }

        res.json({ success: true, team });
    } catch (error) {
        console.error("Error fetching team:", error);
        res.status(500).json({ success: false, message: "Failed to fetch team" });
    }
});

// Create a new team
router.post("/api/teams", authMiddleware, auditMiddleware("Team"), async (req, res) => {
    try {
        const { name, description, department, hodUsername, allowedAdmins } = req.body;

        if (!name || !hodUsername) {
            return res.status(400).json({ success: false, message: "Team name and HOD username are required" });
        }

        // Get HOD user details
        const hodUser = await UserModel.findOne({ username: hodUsername });
        if (!hodUser) {
            return res.status(404).json({ success: false, message: "HOD user not found" });
        }

        // Check if HOD has the right role
        if (hodUser.role !== "Head_of_Department" && hodUser.role !== "Admin") {
            return res.status(403).json({ success: false, message: "User does not have HOD privileges" });
        }

        // Check for duplicate team name for this HOD
        const existingTeam = await TeamModel.findOne({ name, hodUsername, isActive: true });
        if (existingTeam) {
            return res.status(400).json({ success: false, message: "A team with this name already exists" });
        }

        const team = new TeamModel({
            name,
            description,
            department,
            hodId: hodUser._id,
            hodUsername,
            members: [{
                userId: hodUser._id,
                username: hodUsername,
                addedAt: new Date()
            }],
            allowedAdmins: allowedAdmins || (req.user.role === 'Admin' ? [req.user.username] : [])
        });

        await team.save();

        // Update HOD's department in UserModel
        if (department) {
            await UserModel.findByIdAndUpdate(hodUser._id, { department: department });
        }

        res.json({ success: true, message: "Team created successfully", team });
    } catch (error) {
        console.error("Error creating team:", error);
        res.status(500).json({ success: false, message: "Failed to create team" });
    }
});

// Update a team
router.put("/api/teams/:teamId", authMiddleware, auditMiddleware("Team"), async (req, res) => {
    try {
        const { teamId } = req.params;
        const { name, description, department, hodUsername, allowedAdmins } = req.body;

        const team = await TeamModel.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: "Team not found" });
        }

        // Access control for Admins
        if (req.user.role === 'Admin' && !team.allowedAdmins.includes(req.user.username) && team.hodUsername !== req.user.username) {
            return res.status(403).json({ success: false, message: "You do not have permission to modify this team" });
        }

        const oldDepartment = team.department;
        if (name) team.name = name;
        if (description !== undefined) team.description = description;
        if (department !== undefined) team.department = department;
        if (allowedAdmins !== undefined) team.allowedAdmins = allowedAdmins;

        if (hodUsername) {
            // ... (keep existing HOD update logic)
            const hodUser = await UserModel.findOne({ username: hodUsername });
            if (hodUser) {
                team.hodId = hodUser._id;
                team.hodUsername = hodUsername;
                // Update HOD's department
                if (team.department) {
                    await UserModel.findByIdAndUpdate(hodUser._id, { department: team.department });
                }
            }
        }

        await team.save();

        // If department changed, update all members
        if (department !== undefined && department !== oldDepartment) {
            const memberUsernames = team.members.map(m => m.username);
            await UserModel.updateMany(
                { username: { $in: memberUsernames } },
                { department: department }
            );
        }

        res.json({ success: true, message: "Team updated successfully", team });
    } catch (error) {
        console.error("Error updating team:", error);
        res.status(500).json({ success: false, message: "Failed to update team" });
    }
});

// Delete a team (soft delete)
router.delete("/api/teams/:teamId", authMiddleware, auditMiddleware("Team"), async (req, res) => {
    try {
        const { teamId } = req.params;

        const team = await TeamModel.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: "Team not found" });
        }

        // Access control for Admins
        if (req.user.role === 'Admin' && !team.allowedAdmins.includes(req.user.username) && team.hodUsername !== req.user.username) {
            return res.status(403).json({ success: false, message: "You do not have permission to delete this team" });
        }

        team.isActive = false;
        await team.save();
        res.json({ success: true, message: "Team deleted successfully" });
    } catch (error) {
        console.error("Error deleting team:", error);
        res.status(500).json({ success: false, message: "Failed to delete team" });
    }
});

// Add members to a team
router.post("/api/teams/:teamId/members", authMiddleware, auditMiddleware("Team"), async (req, res) => {
    try {
        const { teamId } = req.params;
        const { usernames } = req.body; // Array of usernames to add

        if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
            return res.status(400).json({ success: false, message: "Usernames array is required" });
        }

        const team = await TeamModel.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: "Team not found" });
        }

        // Access control for Admins
        if (req.user.role === 'Admin' && !team.allowedAdmins.includes(req.user.username) && team.hodUsername !== req.user.username) {
            return res.status(403).json({ success: false, message: "You do not have permission to add members to this team" });
        }

        // Get user details for all usernames
        const users = await UserModel.find({ username: { $in: usernames } });
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "No valid users found" });
        }

        // Check which users are already members
        const existingUsernames = team.members.map((m) => m.username);
        const newMembers = users
            .filter((user) => !existingUsernames.includes(user.username))
            .map((user) => ({
                userId: user._id,
                username: user.username,
                addedAt: new Date(),
            }));

        if (newMembers.length === 0) {
            return res.status(400).json({ success: false, message: "All selected users are already team members" });
        }

        team.members.push(...newMembers);
        await team.save();

        // Update each new member's department in UserModel
        if (team.department) {
            const newUserIds = newMembers.map(m => m.userId);
            await UserModel.updateMany(
                { _id: { $in: newUserIds } },
                { department: team.department }
            );
        }

        res.json({
            success: true,
            message: `${newMembers.length} member(s) added successfully`,
            team,
        });
    } catch (error) {
        console.error("Error adding team members:", error);
        res.status(500).json({ success: false, message: "Failed to add team members" });
    }
});

// Remove a member from a team
router.delete("/api/teams/:teamId/members/:username", authMiddleware, auditMiddleware("Team"), async (req, res) => {
    try {
        const { teamId, username } = req.params;

        const team = await TeamModel.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: "Team not found" });
        }

        // Access control for Admins
        if (req.user.role === 'Admin' && !team.allowedAdmins.includes(req.user.username) && team.hodUsername !== req.user.username) {
            return res.status(403).json({ success: false, message: "You do not have permission to remove members from this team" });
        }

        const memberIndex = team.members.findIndex((m) => m.username === username);
        if (memberIndex === -1) {
            return res.status(404).json({ success: false, message: "Member not found in team" });
        }

        team.members.splice(memberIndex, 1);
        await team.save();

        res.json({ success: true, message: "Member removed successfully", team });
    } catch (error) {
        console.error("Error removing team member:", error);
        res.status(500).json({ success: false, message: "Failed to remove team member" });
    }
});

// Get all team members for an HOD (across all their teams)
router.get("/api/teams/hod/:hodUsername/members", authMiddleware, async (req, res) => {
    try {
        const { hodUsername } = req.params;
        const query = { hodUsername, isActive: true };

        // If user is Admin, they must be in allowedAdmins (or be the HOD)
        if (req.user.role === 'Admin') {
            query.$or = [
                { allowedAdmins: req.user.username },
                { hodUsername: req.user.username }
            ];
        }

        const teams = await TeamModel.find(query);

        // Collect all unique member usernames
        const memberUsernames = new Set();
        teams.forEach((team) => {
            team.members.forEach((member) => {
                memberUsernames.add(member.username);
            });
        });

        // Fetch full user details for these members
        const members = await UserModel.find({ username: { $in: Array.from(memberUsernames) } }).select(
            "username role _id first_name last_name isActive deactivatedAt modules employee_photo assigned_importer_name department"
        );

        res.json({ success: true, members });
    } catch (error) {
        console.error("Error fetching team members:", error);
        res.status(500).json({ success: false, message: "Failed to fetch team members" });
    }
});

// Get available users (not in any of HOD's teams) for adding to a team
router.get("/api/teams/hod/:hodUsername/available-users", authMiddleware, async (req, res) => {
    try {
        const { hodUsername } = req.params;
        const query = { hodUsername, isActive: true };

        // If user is Admin, they must be in allowedAdmins (or be the HOD)
        if (req.user.role === 'Admin') {
            query.$or = [
                { allowedAdmins: req.user.username },
                { hodUsername: req.user.username }
            ];
        }

        const teams = await TeamModel.find(query);

        // Collect all member usernames from HOD's teams
        const memberUsernames = new Set();
        teams.forEach((team) => {
            team.members.forEach((member) => {
                memberUsernames.add(member.username);
            });
        });

        // Get all active users except those already in a team and the HOD themselves
        const availableUsers = await UserModel.find({
            username: { $nin: [...Array.from(memberUsernames), hodUsername] },
            isActive: { $ne: false },
        }).select("username role _id first_name last_name employee_photo department");

        res.json({ success: true, users: availableUsers });
    } catch (error) {
        console.error("Error fetching available users:", error);
        res.status(500).json({ success: false, message: "Failed to fetch available users" });
    }
});

export default router;

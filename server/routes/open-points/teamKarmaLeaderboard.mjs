import express from "express";
import OpenPointModel from "../../model/openPoints/openPointModel.mjs";
import UserModel from "../../model/userModel.mjs";
import TeamModel from "../../model/teamModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();

router.get("/team-karma", authMiddleware, async (req, res) => {
    try {
        const { filterType, month, year, quarter, startDate, endDate } = req.query;
        const user = req.user;

        // Check if user is Admin or HOD
        const isAdmin = user.role === "Admin" || user.role === "admin" || user.role === "SuperAdmin" || user.username === "masood_raza";
        const isHodRole = user.role === "Head_of_Department" || user.role === "Head_Of_Department" || user.role === "HOD";
        
        console.log(`[Team Karma Debug] User: ${user.username}, Role: ${user.role}, isAdmin: ${isAdmin}, isHodRole: ${isHodRole}`);

        let allowedTeams = [];
        if (isAdmin) {
            allowedTeams = await TeamModel.find({}).lean();
        } else if (isHodRole) {
            allowedTeams = await TeamModel.find({ hodId: user._id }).lean();
        }

        console.log(`[Team Karma Debug] allowedTeams count: ${allowedTeams.length}`);

        // If not admin and doesn't manage any teams, return empty
        if (!isAdmin && allowedTeams.length === 0) {
            console.log(`[Team Karma Debug] User has no teams and is not admin. Returning empty array.`);
            return res.json([]);
        }

        // Build map of user -> team info
        const userToTeamMap = {};
        const teamMap = {}; // store team info for grouping
        
        allowedTeams.forEach(team => {
            teamMap[team._id.toString()] = {
                teamId: team._id,
                teamName: team.name,
                hodName: team.hodUsername || "Unknown HOD"
            };
            
            if (team.members && Array.isArray(team.members)) {
                team.members.forEach(member => {
                    if (member.userId) {
                        userToTeamMap[member.userId.toString()] = teamMap[team._id.toString()];
                    }
                });
            }
        });

        // Fetch all points where status is Green (Completed) and responsible_person is set
        const matchStage = {
            status: "Green",
            responsible_person: { $ne: null }
        };

        const completedPoints = await OpenPointModel.find(matchStage)
            .populate('responsible_person', 'username first_name last_name employee_photo department role')
            .lean();

        // Priority to Points Mapping
        const getKarmaPoints = (priority) => {
            if (!priority) return 5;
            const prio = priority.toLowerCase();
            if (prio === 'emergency' || prio === 'p1' || prio === 'critical') return 20;
            if (prio === 'high' || prio === 'p2') return 15;
            if (prio === 'medium' || prio === 'p3') return 10;
            if (prio === 'low' || prio === 'p4') return 5;
            return 5;
        };

        const currentMonthNum = month !== undefined ? parseInt(month) : new Date().getMonth();
        const currentYearNum = year ? parseInt(year) : new Date().getFullYear();

        const userKarmaMap = {};

        // Fetch the active users that belong to allowed teams
        const allowedUserIds = Object.keys(userToTeamMap);
        const users = await UserModel.find({ 
            _id: { $in: allowedUserIds },
            isActive: { $ne: false } 
        }).select("username first_name last_name employee_photo department role").lean();

        // Pre-populate so everyone in the allowed teams shows up, even with 0 points
        users.forEach(u => {
            const displayName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
            const uIdStr = u._id.toString();
            userKarmaMap[uIdStr] = {
                userId: u._id,
                username: u.username,
                displayName: displayName,
                employee_photo: u.employee_photo || "",
                department: u.department || "General",
                role: u.role || "",
                teamName: userToTeamMap[uIdStr].teamName,
                hodName: userToTeamMap[uIdStr].hodName,
                totalKarma: 0,
                monthlyKarma: 0,
                totalCompleted: 0,
                monthlyCompleted: 0,
                breakdown: { critical: 0, high: 0, medium: 0, low: 0 }
            };
        });

        // Calculate points
        completedPoints.forEach(pt => {
            const responsiblePerson = pt.responsible_person;
            if (!responsiblePerson) return;

            const rIdStr = responsiblePerson._id.toString();
            
            // Only process if user is in our map (meaning they are in an allowed team)
            if (!userKarmaMap[rIdStr]) return;

            const points = getKarmaPoints(pt.priority);

            userKarmaMap[rIdStr].totalKarma += points;
            userKarmaMap[rIdStr].totalCompleted += 1;

            const prio = pt.priority ? pt.priority.toLowerCase() : 'low';
            if (prio === 'emergency' || prio === 'p1' || prio === 'critical') {
                userKarmaMap[rIdStr].breakdown.critical += 1;
            } else if (prio === 'high' || prio === 'p2') {
                userKarmaMap[rIdStr].breakdown.high += 1;
            } else if (prio === 'medium' || prio === 'p3') {
                userKarmaMap[rIdStr].breakdown.medium += 1;
            } else {
                userKarmaMap[rIdStr].breakdown.low += 1;
            }

            const compDate = pt.completion_date ? new Date(pt.completion_date) : null;
            let matchesFilter = false;

            if (filterType === 'all') {
                matchesFilter = true;
            } else if (compDate) {
                if (filterType === 'date-range' && startDate && endDate) {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    matchesFilter = (compDate >= start && compDate <= end);
                } else if (filterType === 'quarter' && quarter && year) {
                    const q = parseInt(quarter);
                    const y = parseInt(year);
                    const compMonth = compDate.getMonth();
                    const compYear = compDate.getFullYear();
                    const startMonth = (q - 1) * 3;
                    const endMonth = startMonth + 2;
                    matchesFilter = (compYear === y && compMonth >= startMonth && compMonth <= endMonth);
                } else if (filterType === 'year' && year) {
                    const y = parseInt(year);
                    matchesFilter = (compDate.getFullYear() === y);
                } else {
                    const compMonth = compDate.getMonth();
                    const compYear = compDate.getFullYear();
                    matchesFilter = (compMonth === currentMonthNum && compYear === currentYearNum);
                }
            }

            if (matchesFilter) {
                userKarmaMap[rIdStr].monthlyKarma += points;
                userKarmaMap[rIdStr].monthlyCompleted += 1;
            }
        });

        // Group by team for the frontend to render easily
        const groupedByTeam = {};
        
        Object.values(userKarmaMap).forEach(userStats => {
            const teamKey = `${userStats.teamName} (HOD: ${userStats.hodName})`;
            if (!groupedByTeam[teamKey]) {
                groupedByTeam[teamKey] = {
                    teamName: userStats.teamName,
                    hodName: userStats.hodName,
                    members: []
                };
            }
            groupedByTeam[teamKey].members.push(userStats);
        });

        // Sort members within teams by totalKarma descending
        const finalResponse = Object.keys(groupedByTeam).map(key => {
            const teamData = groupedByTeam[key];
            teamData.members.sort((a, b) => b.totalKarma - a.totalKarma);
            return teamData;
        });

        // Sort teams by name
        finalResponse.sort((a, b) => a.teamName.localeCompare(b.teamName));

        console.log(`[Team Karma Debug] Returning response with ${finalResponse.length} teams.`);
        res.json(finalResponse);
    } catch (error) {
        console.error("Error fetching team karma leaderboard:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;

import express from "express";
import OpenPointModel from "../../model/openPoints/openPointModel.mjs";
import UserModel from "../../model/userModel.mjs";
import TeamModel from "../../model/teamModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import { getKarmaPriorityPoints, isPointDelayedOrOverdue } from "../../utils/karmaPointsUtil.mjs";

const router = express.Router();

router.get("/team-karma", authMiddleware, async (req, res) => {
    try {
        const { filterType, month, year, quarter, startDate, endDate } = req.query;
        const user = req.user;

        // Check if user is Admin or HOD
        const normalizedRole = String(user.role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
        const isAdmin = normalizedRole === "ADMIN" || normalizedRole === "SUPERADMIN";
        const isHodRole = normalizedRole === "HOD" || normalizedRole === "HEADOFDEPARTMENT";

        let allowedTeams = [];
        if (isAdmin) {
            allowedTeams = await TeamModel.find({ isActive: { $ne: false } }).lean();
        } else if (isHodRole) {
            allowedTeams = await TeamModel.find({
                $or: [
                    { hodId: user._id },
                    { "members.userId": user._id }
                ],
                isActive: { $ne: false }
            }).lean();
        }

        // If not admin and doesn't manage any teams, return empty
        if (!isAdmin && allowedTeams.length === 0) {
            return res.json([]);
        }

        // Build map of userId -> list of team info (supports multi-team membership & HODs)
        const userToTeamsMap = {}; // userIdStr -> Array<{ teamId, teamName, hodName }>
        const teamMap = {}; // teamIdStr -> teamInfo

        allowedTeams.forEach(team => {
            const teamInfo = {
                teamId: team._id.toString(),
                teamName: team.name,
                hodName: team.hodUsername || "Unknown HOD"
            };
            teamMap[team._id.toString()] = teamInfo;

            // Include regular team members
            if (team.members && Array.isArray(team.members)) {
                team.members.forEach(member => {
                    if (member.userId) {
                        const uIdStr = member.userId.toString();
                        if (!userToTeamsMap[uIdStr]) userToTeamsMap[uIdStr] = [];
                        if (!userToTeamsMap[uIdStr].some(t => t.teamId === teamInfo.teamId)) {
                            userToTeamsMap[uIdStr].push(teamInfo);
                        }
                    }
                });
            }

            // Also include HOD in team roster so their tasks/karma are visible
            if (team.hodId) {
                const hodIdStr = team.hodId.toString();
                if (!userToTeamsMap[hodIdStr]) userToTeamsMap[hodIdStr] = [];
                if (!userToTeamsMap[hodIdStr].some(t => t.teamId === teamInfo.teamId)) {
                    userToTeamsMap[hodIdStr].push(teamInfo);
                }
            }
        });

        // Date calculations
        const now = new Date();
        const currentMonthNum = month !== undefined ? parseInt(month, 10) : now.getMonth();
        const currentYearNum = year ? parseInt(year, 10) : now.getFullYear();

        let lastMonthNum = currentMonthNum - 1;
        let lastYearNum = currentYearNum;
        if (lastMonthNum < 0) {
            lastMonthNum = 11;
            lastYearNum -= 1;
        }

        const startOfTargetMonth = new Date(currentYearNum, currentMonthNum, 1);
        const endOfTargetMonth = new Date(currentYearNum, currentMonthNum + 1, 0, 23, 59, 59, 999);
        const startOfLastMonth = new Date(lastYearNum, lastMonthNum, 1);
        const endOfLastMonth = new Date(lastYearNum, lastMonthNum + 1, 0, 23, 59, 59, 999);

        // Fetch active users in allowed teams
        const allowedUserIds = Object.keys(userToTeamsMap);
        const users = await UserModel.find({
            _id: { $in: allowedUserIds },
            isActive: { $ne: false }
        }).select("username first_name last_name employee_photo department role").lean();

        // Fetch all points where responsible_person is in allowedUserIds
        const allPoints = await OpenPointModel.find({
            responsible_person: { $in: allowedUserIds }
        }).populate('responsible_person', 'username first_name last_name employee_photo department role').lean();

        const userKarmaMap = {};

        // Pre-populate user stats
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
                totalKarma: 0,
                monthlyKarma: 0,
                lastMonthKarma: 0,
                totalTasks: 0,
                totalCompleted: 0,
                totalInProgress: 0,
                totalNotStarted: 0,
                monthlyCompleted: 0,
                lastMonthCompleted: 0,
                breakdown: { critical: 0, high: 0, medium: 0, low: 0 }
            };
        });

        // Calculate points
        allPoints.forEach(pt => {
            const responsiblePerson = pt.responsible_person;
            if (!responsiblePerson) return;
            const rIdStr = responsiblePerson._id.toString();
            if (!userKarmaMap[rIdStr]) return;

            const uStats = userKarmaMap[rIdStr];
            uStats.totalTasks += 1;
            const points = getKarmaPriorityPoints(pt.priority);

            if (pt.status === "Green") {
                uStats.totalCompleted += 1;
                uStats.totalKarma += points;

                // Priority breakdown for completed tasks
                const prio = String(pt.priority || '').trim().toLowerCase();
                if (prio === 'emergency' || prio === 'p1' || prio === 'critical') {
                    uStats.breakdown.critical += 1;
                } else if (prio === 'high' || prio === 'p2') {
                    uStats.breakdown.high += 1;
                } else if (prio === 'medium' || prio === 'p3') {
                    uStats.breakdown.medium += 1;
                } else {
                    uStats.breakdown.low += 1;
                }
            } else if (pt.status === "Yellow" || pt.status === "Orange") {
                // In Progress: Neutral, no penalty while ongoing
                uStats.totalInProgress += 1;
            } else {
                // Red / Not Started
                uStats.totalNotStarted += 1;

                // Only deduct points if overdue or delayed
                if (isPointDelayedOrOverdue(pt, now)) {
                    uStats.totalKarma -= points;
                }
            }

            // Periodic evaluation for completed tasks
            const compDate = pt.completion_date ? new Date(pt.completion_date) : null;
            let matchesFilter = false;
            let matchesLastMonthFilter = false;

            if (filterType === 'all') {
                matchesFilter = true;
            } else if (compDate && !isNaN(compDate.getTime())) {
                if (filterType === 'date-range' && startDate && endDate) {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    matchesFilter = (compDate >= start && compDate <= end);
                } else if (filterType === 'quarter' && quarter && year) {
                    const q = parseInt(quarter, 10);
                    const y = parseInt(year, 10);
                    const compMonth = compDate.getMonth();
                    const compYear = compDate.getFullYear();
                    const startMonth = (q - 1) * 3;
                    const endMonth = startMonth + 2;
                    matchesFilter = (compYear === y && compMonth >= startMonth && compMonth <= endMonth);
                } else if (filterType === 'year' && year) {
                    const y = parseInt(year, 10);
                    matchesFilter = (compDate.getFullYear() === y);
                } else {
                    // Default to month filter
                    const compMonth = compDate.getMonth();
                    const compYear = compDate.getFullYear();
                    matchesFilter = (compMonth === currentMonthNum && compYear === currentYearNum);
                    matchesLastMonthFilter = (compMonth === lastMonthNum && compYear === lastYearNum);
                }
            }

            if (pt.status === "Green") {
                if (matchesFilter) {
                    uStats.monthlyKarma += points;
                    uStats.monthlyCompleted += 1;
                }
                if (matchesLastMonthFilter) {
                    uStats.lastMonthKarma += points;
                    uStats.lastMonthCompleted += 1;
                }
            } else if (pt.status !== "Yellow" && pt.status !== "Orange") {
                // Penalty for delayed tasks within month filter
                if (filterType === 'month' || filterType === 'all') {
                    const wasCreatedBeforeMonthEnd = !pt.creation_date || new Date(pt.creation_date) <= endOfTargetMonth;
                    if (wasCreatedBeforeMonthEnd && isPointDelayedOrOverdue(pt, endOfTargetMonth)) {
                        uStats.monthlyKarma -= points;
                    }

                    const wasCreatedBeforeLastMonthEnd = !pt.creation_date || new Date(pt.creation_date) <= endOfLastMonth;
                    if (wasCreatedBeforeLastMonthEnd && isPointDelayedOrOverdue(pt, endOfLastMonth)) {
                        uStats.lastMonthKarma -= points;
                    }
                }
            }
        });

        // Group by team
        const groupedByTeam = {};

        Object.keys(userToTeamsMap).forEach(uIdStr => {
            const userStats = userKarmaMap[uIdStr];
            if (!userStats) return;

            const teams = userToTeamsMap[uIdStr];
            teams.forEach(teamInfo => {
                const teamKey = `${teamInfo.teamName} (HOD: ${teamInfo.hodName})`;
                if (!groupedByTeam[teamKey]) {
                    groupedByTeam[teamKey] = {
                        teamId: teamInfo.teamId,
                        teamName: teamInfo.teamName,
                        hodName: teamInfo.hodName,
                        members: []
                    };
                }

                // Push a clone with current team context
                groupedByTeam[teamKey].members.push({
                    ...userStats,
                    teamName: teamInfo.teamName,
                    hodName: teamInfo.hodName
                });
            });
        });

        // Sort members within teams by appropriate score
        const finalResponse = Object.keys(groupedByTeam).map(key => {
            const teamData = groupedByTeam[key];
            if (filterType === 'month') {
                teamData.members.sort((a, b) => b.monthlyKarma - a.monthlyKarma);
            } else {
                teamData.members.sort((a, b) => b.totalKarma - a.totalKarma);
            }
            return teamData;
        });

        // Sort teams by name
        finalResponse.sort((a, b) => a.teamName.localeCompare(b.teamName));

        res.json(finalResponse);
    } catch (error) {
        console.error("Error fetching team karma leaderboard:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;

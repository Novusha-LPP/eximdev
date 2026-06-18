import TeamModel from '../../model/teamModel.mjs';
import User from '../../model/userModel.mjs';
import mongoose from 'mongoose';

/**
 * Checks if the user is a dynamic Allowed Admin and needs team-based data restrictions.
 * Any user with isAttendanceAllowedAdmin === true is scoped to their own team members.
 */
export function isRestrictedAllowedAdmin(user) {
    if (!user) return false;
    return user.isAttendanceAllowedAdmin === true;
}

/**
 * Resolves all employee user IDs belonging to the allowed admin's team.
 */
export async function getRestrictedEmployeeIds(user) {
    if (!isRestrictedAllowedAdmin(user)) {
        return null;
    }


    const username = String(user.username || '').toLowerCase();
    const userId = user._id;

    // Find all teams where they are HOD or member
    const teams = await TeamModel.find({
        $or: [
            { hodId: userId },
            { hodUsername: username },
            { "members.userId": userId },
            { "members.username": username }
        ],
        isActive: { $ne: false }
    }).lean();

    const memberUserIds = new Set();
    // Always include themselves
    memberUserIds.add(userId.toString());

    const legacyUsernames = [];
    teams.forEach(team => {
        if (team.members && Array.isArray(team.members)) {
            team.members.forEach(member => {
                if (member.userId) {
                    memberUserIds.add(member.userId.toString());
                } else if (member.username) {
                    legacyUsernames.push(String(member.username).trim().toLowerCase());
                }
            });
        }
    });

    if (legacyUsernames.length > 0) {
        const resolvedUsers = await User.find({
            username: { $in: legacyUsernames },
            isActive: { $ne: false }
        }).select('_id');
        resolvedUsers.forEach(u => memberUserIds.add(u._id.toString()));
    }

    return Array.from(memberUserIds);
}

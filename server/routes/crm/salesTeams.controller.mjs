import express from 'express';
import SalesTeam from '../../model/crm/SalesTeam.mjs';
import UserModel from '../../model/userModel.mjs';

const router = express.Router();

// CREATE team — creator becomes manager automatically
router.post('/', async (req, res) => {
  try {
    const { name, description, parentTeamId, type, assignedTerritories, memberIds = [], businessVertical, quotas } = req.body;

    // The logged-in user is the team owner/manager
    const creatorId = req.user?._id || req.user?.id || req.headers['user-id'];
    if (!name || !creatorId) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    // Merge creator into member list
    const allMemberIds = [...new Set([creatorId.toString(), ...memberIds.map(String)])];

    const newTeam = new SalesTeam({
      name,
      description,
      managerId: creatorId,
      parentTeamId,
      type: type || 'regional',
      assignedTerritories,
      memberIds: allMemberIds,
      businessVertical: businessVertical || 'Paramount',
      quotas: quotas || { monthlyRevenue: 0, dealCount: 0 }
    });

    await newTeam.save();

    // Stamp teamId on each member's user record (Disabled to support multi-team assignments without overwriting HR teamId)
    /*
    await UserModel.updateMany(
      { _id: { $in: allMemberIds } },
      { teamId: newTeam._id }
    );
    */

    await newTeam.populate('managerId', 'username email first_name last_name');
    await newTeam.populate('memberIds', 'username email first_name last_name');
    res.status(201).json(newTeam);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET all teams
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    let query = { isActive: true };

    if (type) query.type = type;

    const teams = await SalesTeam.find(query)
      .populate('managerId', 'username first_name last_name email')
      .populate('memberIds', 'username first_name last_name')
      .populate('assignedTerritories', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SalesTeam.countDocuments(query);

    res.json({
      teams,
      pagination: { page: Number(page), limit: Number(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET user's teams (or all teams for admin)
router.get('/my-teams', async (req, res) => {
  try {
    const role = req.user?.crmRole || req.user?.role || req.headers['user-role'];
    const userRole = req.user?.role || req.headers['user-role'];
    const userId = req.user?._id || req.user?.id || req.headers['user-id'];

    const isHOD = userRole === 'HOD' || userRole === 'Head_of_Department' || (typeof userRole === 'string' && (userRole.toLowerCase() === 'hod' || userRole.toLowerCase() === 'head_of_department'));
    const isCrmAdmin = role === 'Admin' || (typeof role === 'string' && role.toLowerCase() === 'admin');
    const isAdmin = isCrmAdmin && !isHOD;

    let query = { isActive: true };
    const seeAll = req.query.all === 'true' || req.query.seeAll === 'true';
    if (!isAdmin && !seeAll && userId) {
      query.$or = [
        { managerId: userId },
        { memberIds: userId }
      ];
    }

    const teams = await SalesTeam.find(query)
      .populate('managerId', 'username first_name last_name email')
      .populate('memberIds', 'username first_name last_name')
      .sort({ name: 1 })
      .lean();

    res.json(teams);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single team
router.get('/:id', async (req, res) => {
  try {
    const team = await SalesTeam.findOne({ _id: req.params.id })
      .populate('managerId', 'name email')
      .populate('memberIds', 'name email')
      .populate('parentTeamId', 'name')
      .populate('assignedTerritories', 'name');

    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE team
router.put('/:id', async (req, res) => {
  try {
    const updatedTeam = await SalesTeam.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    ).populate('managerId memberIds parentTeamId assignedTerritories');

    if (!updatedTeam) return res.status(404).json({ message: 'Team not found' });
    res.json(updatedTeam);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE team
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await SalesTeam.findOneAndDelete({ _id: req.params.id });
    if (!deleted) return res.status(404).json({ message: 'Team not found' });
    res.json({ success: true, message: 'Team deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add member to team
router.post('/:id/members', async (req, res) => {
  try {
    const { memberId } = req.body;

    const team = await SalesTeam.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (!team.memberIds.includes(memberId)) {
      team.memberIds.push(memberId);
      await team.save();
    }

    await team.populate('memberIds', 'name email');
    res.json(team);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Remove member from team
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    const team = await SalesTeam.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    team.memberIds = team.memberIds.filter(id => id.toString() !== req.params.memberId);
    await team.save();

    await team.populate('memberIds', 'name email');
    res.json(team);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get team performance
router.get('/:id/performance', async (req, res) => {
  try {
    const team = await SalesTeam.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    res.json({
      teamId: team._id,
      name: team.name,
      performance: team.performance,
      quotas: team.quotas,
      quotaAttainment: {
        revenue: Math.round((team.performance.currentRevenue / (team.quotas.monthlyRevenue || 1)) * 100),
        deals: team.quotas.dealCount > 0 ? Math.round((team.performance.currentDeals / team.quotas.dealCount) * 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

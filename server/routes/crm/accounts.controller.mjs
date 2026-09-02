import express from 'express';
import mongoose from 'mongoose';
import Account from '../../model/crm/Account.mjs';
import SalesTeam from '../../model/crm/SalesTeam.mjs';

const router = express.Router();

async function buildOwnerFilter(user, requestedTeamId = null, req = null) {
  if (req?.query?.all === 'true' || req?.query?.forSelect === 'true') {
    return {};
  }

  const role = user?.crmRole || user?.role || req?.headers?.['user-role'];
  const userId = user?._id || user?.id || user?.userId || req?.headers?.['user-id'];

  if (requestedTeamId) {
    const team = await SalesTeam.findById(requestedTeamId).lean();
    if (team) {
      const isManager = team.managerId?.toString() === userId?.toString();
      const isMember = team.memberIds?.some(m => m?.toString() === userId?.toString());
      if (role === 'Admin' || (role && role.toLowerCase() === 'admin') || isManager || isMember) {
        const objectIdMemberIds = (team.memberIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
        if (team.managerId) {
          objectIdMemberIds.push(new mongoose.Types.ObjectId(team.managerId.toString()));
        }
        return {
          $or: [
            { ownerId: { $in: objectIdMemberIds } },
            { createdBy: { $in: objectIdMemberIds } }
          ]
        };
      }
    }
  }

  if (role === 'Admin' || (role && role.toLowerCase() === 'admin')) return {};
  if (!userId) return {};

  const myTeams = await SalesTeam.find({
    $or: [
      { managerId: userId },
      { memberIds: userId }
    ]
  }).lean();
  let visibleUserIds = [userId.toString()];

  if (myTeams && myTeams.length > 0) {
    myTeams.forEach(team => {
      if (team.memberIds) {
        visibleUserIds = [...visibleUserIds, ...team.memberIds.map(id => id.toString())];
      }
      if (team.managerId) {
        visibleUserIds.push(team.managerId.toString());
      }
    });
  }

  visibleUserIds = [...new Set(visibleUserIds)];
  const objectIdUserIds = visibleUserIds.map(id => new mongoose.Types.ObjectId(id));

  return {
    $or: [
      { ownerId: { $in: objectIdUserIds } },
      { createdBy: { $in: objectIdUserIds } },
      { ownerId: null },
      { ownerId: { $exists: false } }
    ]
  };
}

// GET /api/crm/accounts
router.get('/', async (req, res) => {
  try {
    const ownerFilter = await buildOwnerFilter(req.user, req.query.teamId, req);
    const accounts = await Account.find(ownerFilter).populate('ownerId', 'username');
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crm/accounts
router.post('/', async (req, res) => {
  try {
    const newAccount = new Account({ ...req.body });
    await newAccount.save();
    res.status(201).json(newAccount);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/crm/accounts/:id
router.get('/:id', async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id }).populate('ownerId', 'username');
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json(account);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/accounts/:id
router.put('/:id', async (req, res) => {
  try {
    const updatedAccount = await Account.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    );
    if (!updatedAccount) return res.status(404).json({ message: 'Account not found' });
    res.json(updatedAccount);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/crm/accounts/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Account.findOneAndDelete({ _id: req.params.id });
    if (!deleted) return res.status(404).json({ message: 'Account not found' });
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

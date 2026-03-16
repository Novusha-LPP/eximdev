import express from 'express';
import Account from '../../model/crm/Account.mjs';
import { requireTenant } from './middleware/tenant.mjs';

const router = express.Router();
router.use(requireTenant);

// GET /api/crm/accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await Account.find({ tenantId: req.tenantId }).populate('ownerId', 'username');
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crm/accounts
router.post('/', async (req, res) => {
  try {
    const newAccount = new Account({ ...req.body, tenantId: req.tenantId });
    await newAccount.save();
    res.status(201).json(newAccount);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/crm/accounts/:id
router.get('/:id', async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, tenantId: req.tenantId }).populate('ownerId', 'username');
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
      { _id: req.params.id, tenantId: req.tenantId },
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
    const deleted = await Account.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!deleted) return res.status(404).json({ message: 'Account not found' });
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

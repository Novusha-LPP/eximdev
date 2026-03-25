import express from 'express';
import Contact from '../../model/crm/Contact.mjs';

const router = express.Router();

// GET /api/crm/contacts
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find({}).populate('accountId', 'name');
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crm/contacts
router.post('/', async (req, res) => {
  try {
    const newContact = new Contact({ ...req.body });
    await newContact.save();
    // Populate account data before responding
    await newContact.populate('accountId', 'name');
    res.status(201).json(newContact);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/crm/contacts/:id
router.get('/:id', async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id }).populate('accountId', 'name');
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/crm/contacts/:id
router.put('/:id', async (req, res) => {
  try {
    const updatedContact = await Contact.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    ).populate('accountId', 'name');
    if (!updatedContact) return res.status(404).json({ message: 'Contact not found' });
    res.json(updatedContact);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/crm/contacts/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Contact.findOneAndDelete({ _id: req.params.id });
    if (!deleted) return res.status(404).json({ message: 'Contact not found' });
    res.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

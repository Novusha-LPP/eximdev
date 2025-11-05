// routes/releaseNoteRoutes.js
import express from 'express';
import ReleaseNote from '../model/releaseNoteModel.js';

const router = express.Router();

// Get all published release notes (public)
router.get('/release-notes', async (req, res) => {
  try {
    const notes = await ReleaseNote.find({ isPublished: true })
      .sort({ releaseDate: -1 })
      .limit(50);
    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('Error fetching published notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all release notes including drafts (public - admin will filter on frontend)
router.get('/release-notes/all', async (req, res) => {
  try {
    const notes = await ReleaseNote.find()
      .sort({ releaseDate: -1 })
      .populate('createdBy', 'name email');
    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('Error fetching all notes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single release note
router.get('/release-notes/:id', async (req, res) => {
  try {
    const note = await ReleaseNote.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Release note not found' });
    }
    res.json({ success: true, data: note });
  } catch (error) {
    console.error('Error fetching single note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new release note (no auth - handled on frontend)
router.post('/release-notes', async (req, res) => {
  try {
    const { version, releaseDate, title, description, changes, isPublished } = req.body;

    // Validate required fields
    if (!version || !title || !changes || changes.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Version, title, and at least one change are required' 
      });
    }

    const newNote = new ReleaseNote({
      version,
      releaseDate: releaseDate || new Date(),
      title,
      description: description || '',
      changes,
      isPublished: isPublished || false
    });

    await newNote.save();
    res.status(201).json({ success: true, data: newNote });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update release note (no auth - handled on frontend)
router.put('/release-notes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Release note ID is required' });
    }

    const note = await ReleaseNote.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ success: false, error: 'Release note not found' });
    }

    res.json({ success: true, data: note });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete release note (no auth - handled on frontend)
router.delete('/release-notes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Release note ID is required' });
    }

    const note = await ReleaseNote.findByIdAndDelete(id);

    if (!note) {
      return res.status(404).json({ success: false, error: 'Release note not found' });
    }

    res.json({ success: true, message: 'Release note deleted' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

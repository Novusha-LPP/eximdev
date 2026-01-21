
import express from 'express';
import MRMItem from '../../model/mrm/mrmItemModel.mjs';
import MRMMetadata from '../../model/mrm/mrmMetadataModel.mjs';
import UserModel from '../../model/userModel.mjs';

const router = express.Router();

// Admin/Manager usernames who can view all users' MRM
const MRM_ADMINS = ['suraj_rajan', 'shallini_arun'];

// Get users who have MRM module assigned
router.get('/api/mrm/users', async (req, res) => {
    try {
        const users = await UserModel.find(
            { modules: 'MRM' },
            { first_name: 1, last_name: 1, username: 1, _id: 1 }
        ).sort({ first_name: 1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin Dashboard - Get all users' MRM summary for a month/year
router.get('/api/mrm/dashboard', async (req, res) => {
    try {
        const { month, year } = req.query;
        const requestingUsername = req.headers['username'];

        // Only admins can access dashboard
        if (!MRM_ADMINS.includes(requestingUsername)) {
            return res.status(403).json({ error: "Not authorized" });
        }

        if (!month || !year) {
            return res.status(400).json({ error: "Month and Year are required" });
        }

        // Get all users with MRM module
        const mrmUsers = await UserModel.find(
            { modules: 'MRM' },
            { first_name: 1, last_name: 1, username: 1, _id: 1 }
        ).sort({ first_name: 1 });

        // Get metadata for the month (shared across users for now)
        const metadata = await MRMMetadata.findOne({ month, year });

        // Build dashboard data for each user
        const dashboardData = await Promise.all(mrmUsers.map(async (user) => {
            // Get items for this user
            const items = await MRMItem.find({
                month,
                year,
                createdBy: user._id
            });

            // Count statuses
            let greenCount = 0, yellowCount = 0, redCount = 0, grayCount = 0;
            items.forEach(item => {
                switch (item.status) {
                    case 'Green': greenCount++; break;
                    case 'Yellow': yellowCount++; break;
                    case 'Red': redCount++; break;
                    default: grayCount++; break;
                }
            });

            return {
                userId: user._id,
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                reviewDate: metadata?.reviewDate || null,
                meetingDate: metadata?.meetingDate || null,
                itemsCount: items.length,
                greenCount,
                yellowCount,
                redCount,
                grayCount
            };
        }));

        res.json(dashboardData);
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});


// --- Metadata Routes ---

// Get Metadata
router.get('/api/mrm/metadata', async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) return res.status(400).json({ error: "Month/Year required" });

        let metadata = await MRMMetadata.findOne({ month, year });
        if (!metadata) {
            // Return empty structure if not found
            return res.json({ meetingDate: '', reviewDate: '' });
        }
        res.json(metadata);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update/Create Metadata
router.post('/api/mrm/metadata', async (req, res) => {
    try {
        const { month, year, meetingDate, reviewDate } = req.body;

        const metadata = await MRMMetadata.findOneAndUpdate(
            { month, year },
            { meetingDate, reviewDate },
            { new: true, upsert: true }
        );
        res.json(metadata);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Item Routes ---

// Get MRM Items (with optional userId filter for admin view)
router.get('/api/mrm', async (req, res) => {
    try {
        const { month, year, userId } = req.query;
        const requestingUsername = req.headers['username'];

        if (!month || !year) {
            return res.status(400).json({ error: "Month and Year are required" });
        }

        // Build query
        let query = { month, year };

        // If userId is provided (admin viewing specific user), filter by createdBy
        if (userId) {
            // Only admins can view other users' data
            if (!MRM_ADMINS.includes(requestingUsername)) {
                return res.status(403).json({ error: "Not authorized to view other users' MRM" });
            }
            query.createdBy = userId;
        }

        const items = await MRMItem.find(query).sort({ createdAt: 1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create MRM Item
router.post('/api/mrm', async (req, res) => {
    try {
        const item = new MRMItem(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update MRM Item
router.put('/api/mrm/:id', async (req, res) => {
    try {
        const item = await MRMItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete MRM Item
router.delete('/api/mrm/:id', async (req, res) => {
    try {
        await MRMItem.findByIdAndDelete(req.params.id);
        res.json({ message: "Item deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Import Items
router.post('/api/mrm/import', async (req, res) => {
    try {
        const { targetMonth, targetYear, sourceMonth, sourceYear, mode } = req.body;

        if (!targetMonth || !targetYear || !sourceMonth || !sourceYear || !mode) {
            return res.status(400).json({ error: "Missing required fields for import" });
        }

        // Delete existing items for target month to avoid duplicates if re-importing? 
        // User might want to append. Let's assume append for now, or check UI logic. 
        // Safe bet: if import is requested, maybe they want to start fresh or fill gaps. 
        // Let's just append.

        const sourceItems = await MRMItem.find({ month: sourceMonth, year: sourceYear });

        if (sourceItems.length === 0) {
            return res.status(404).json({ error: "No data found in source month to import" });
        }

        let newItems = [];

        if (mode === 'as-is') {
            newItems = sourceItems.map(item => ({
                month: targetMonth,
                year: targetYear,
                processDescription: item.processDescription,
                objective: item.objective,
                target: item.target,
                monitoringFrequency: item.monitoringFrequency,
                responsibility: item.responsibility,
                actual: item.actual,
                plan: item.plan,
                actionPlan: item.actionPlan,
                responsibilityAction: item.responsibilityAction,
                targetDate: item.targetDate,
                status: item.status,
                remarks: item.remarks,
                createdBy: req.body.userId // Assuming userId is passed or in session (simplified)
            }));
        } else if (mode === 'blank') {
            newItems = sourceItems.map(item => ({
                month: targetMonth,
                year: targetYear,
                processDescription: item.processDescription,
                objective: item.objective,
                target: item.target,
                monitoringFrequency: item.monitoringFrequency,
                responsibility: item.responsibility,
                // Clear others
                actual: "",
                plan: "",
                actionPlan: "",
                responsibilityAction: "",
                targetDate: null,
                status: "Gray",
                remarks: "",
                createdBy: req.body.userId
            }));
        }

        await MRMItem.insertMany(newItems);
        const result = await MRMItem.find({ month: targetMonth, year: targetYear });
        res.json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

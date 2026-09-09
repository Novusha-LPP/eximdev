import express from 'express';
import MRMMetadata from '../../model/mrm/mrmMetadataModel.mjs';
import MRMItem from '../../model/mrm/mrmItemModel.mjs';
import OpenPoint from '../../model/openPoints/openPointModel.mjs';
import UserModel from '../../model/userModel.mjs';
import auditMiddleware from '../../middleware/auditTrail.mjs';
import authMiddleware from '../../middleware/authMiddleware.mjs';
import { syncActionPlanToOpenPoint } from '../../services/mrmOpenPointsSyncService.mjs';
import { calculateAnnualRollup, analyzeRecurringIssues, parseNumericValue, detectAnomalies } from '../../services/mrmAnalyticsService.mjs';

const router = express.Router();

/**
 * Helper to determine if the requesting user is Suraj Rajan or an Administrator.
 */
const isAuthorizedApprover = (reqUser) => {
    if (!reqUser) return false;
    const role = String(reqUser.role || '').toLowerCase();
    const username = String(reqUser.username || '').toLowerCase();
    return role === 'admin' || username === 'suraj_rajan' || username.includes('suraj');
};

// ==========================================
// USER & DASHBOARD OVERVIEW ROUTES
// ==========================================

// Get users who have MRM module assigned or are presenters/HODs/Admins
router.get('/api/mrm/users', authMiddleware, async (req, res) => {
    try {
        const distinctMetadataUsers = await MRMMetadata.distinct('userId');
        const users = await UserModel.find(
            {
                isActive: { $ne: false },
                $or: [
                    { modules: 'MRM' },
                    { role: { $regex: /^(head_of_department|admin|hod)$/i } },
                    { _id: { $in: distinctMetadataUsers } }
                ]
            },
            { first_name: 1, last_name: 1, username: 1, _id: 1, role: 1 }
        ).lean();

        // Format clean display name and filter out any blank user records
        const validUsers = users
            .map(u => {
                const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                const displayName = fullName || u.username || '';
                return {
                    ...u,
                    first_name: u.first_name || displayName,
                    last_name: u.last_name || '',
                    displayName
                };
            })
            .filter(u => u.displayName.length > 0)
            .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));

        res.json(validUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin & HOD Dashboard - Summary of users' MRM for month/year with status
router.get('/api/mrm/dashboard', authMiddleware, async (req, res) => {
    try {
        const { month, year } = req.query;
        const requestingRole = String(req.user?.role || '').toLowerCase();
        const isApprover = isAuthorizedApprover(req.user);

        if (!month || !year) {
            return res.status(400).json({ error: "Month and Year are required" });
        }

        // Determine user filter: Approvers see all HODs/Admins; HODs see their team + self
        let userQuery = {
            modules: 'MRM',
            isActive: { $ne: false }
        };

        if (!isApprover && requestingRole !== 'admin') {
            const orConditions = [{ _id: req.user._id }];
            if (req.user._id) {
                orConditions.push({ hod_id: req.user._id });
            }
            if (req.user.department) {
                orConditions.push({ department: req.user.department });
            }
            userQuery.$or = orConditions;
        } else {
            userQuery.role = { $in: ['Head_of_Department', 'head_of_department', 'Admin', 'admin'] };
        }

        const mrmUsers = await UserModel.find(
            userQuery,
            { first_name: 1, last_name: 1, username: 1, _id: 1, role: 1 }
        ).sort({ first_name: 1 });

        const allMetadata = await MRMMetadata.find({ month, year });

        const dashboardData = await Promise.all(mrmUsers.map(async (user) => {
            const items = await MRMItem.find({
                month,
                year,
                createdBy: user._id
            });

            let greenCount = 0, yellowCount = 0, redCount = 0, grayCount = 0;
            items.forEach(item => {
                if (item.isTitleRow) return;
                switch (item.status) {
                    case 'Green': greenCount++; break;
                    case 'Yellow': yellowCount++; break;
                    case 'Red': redCount++; break;
                    default: grayCount++; break;
                }
            });

            const userMeta = allMetadata.find(m => m.userId && m.userId.toString() === user._id.toString());
            
            // Backward-compatible status mapping
            let status = userMeta?.status;
            if (!status) {
                status = userMeta?.meetingDone ? 'Approved' : 'Draft';
            }
            const isLocked = userMeta?.isLocked || userMeta?.meetingDone || (status === 'Approved');

            return {
                userId: user._id,
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                reviewDate: userMeta?.reviewDate || null,
                meetingDate: userMeta?.meetingDate || null,
                meetingDone: userMeta?.meetingDone || false,
                status,
                isLocked,
                submittedAt: userMeta?.submittedAt || null,
                approvedAt: userMeta?.approvedAt || null,
                latestRevisionComment: userMeta?.revisionHistory?.length > 0
                    ? userMeta.revisionHistory[userMeta.revisionHistory.length - 1].comment
                    : null,
                itemsCount: items.filter(i => !i.isTitleRow).length,
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

// ==========================================
// METADATA & WORKFLOW ROUTES
// ==========================================

// Get Metadata for user-month-year (with backwards compatibility)
router.get('/api/mrm/metadata', authMiddleware, async (req, res) => {
    try {
        const { month, year, userId } = req.query;
        if (!month || !year) return res.status(400).json({ error: "Month/Year required" });

        const targetUserId = userId || req.user?._id;
        let metadata = await MRMMetadata.findOne({ month, year, userId: targetUserId });

        if (!metadata) {
            return res.json({ 
                meetingDate: '', 
                reviewDate: '', 
                status: 'Draft', 
                isLocked: false,
                meetingDone: false
            });
        }

        // Backward compatibility mapping
        const result = metadata.toObject();
        if (!result.status) {
            result.status = result.meetingDone ? 'Approved' : 'Draft';
        }
        result.isLocked = result.isLocked || result.meetingDone || (result.status === 'Approved');

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update/Create Scheduling Dates
router.post('/api/mrm/metadata', authMiddleware, auditMiddleware("MRM_Metadata"), async (req, res) => {
    try {
        const { month, year, userId } = req.body;
        let { meetingDate, reviewDate } = req.body;
        const targetUserId = userId || req.user?._id;

        if (!targetUserId) return res.status(400).json({ error: "UserId is required" });

        if (meetingDate === '') meetingDate = null;
        if (reviewDate === '') reviewDate = null;

        const metadata = await MRMMetadata.findOneAndUpdate(
            { month, year, userId: targetUserId },
            { meetingDate, reviewDate },
            { new: true, upsert: true }
        );
        res.json(metadata);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle Meeting Done Status (Admin only - Legacy support)
router.post('/api/mrm/metadata/toggle-meeting', authMiddleware, auditMiddleware("MRM_Metadata"), async (req, res) => {
    try {
        const { month, year, userId, meetingDone } = req.body;
        const requestingRole = String(req.user?.role || '').toLowerCase();

        if (requestingRole !== 'admin' && !isAuthorizedApprover(req.user)) {
            return res.status(403).json({ error: "Not authorized" });
        }

        if (!userId || !month || !year) {
            return res.status(400).json({ error: "UserId, month, and year are required" });
        }

        const newStatus = meetingDone ? 'Approved' : 'Draft';
        const metadata = await MRMMetadata.findOneAndUpdate(
            { month, year, userId },
            { 
                meetingDone: meetingDone,
                status: newStatus,
                isLocked: meetingDone
            },
            { new: true, upsert: true }
        );
        res.json(metadata);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// SUBMISSION & APPROVAL WORKFLOW ROUTES
// ==========================================

// Submit MRM with Completeness Validation Gate
router.post('/api/mrm/submit', authMiddleware, async (req, res) => {
    try {
        const { month, year, userId } = req.body;
        const requestingRole = String(req.user?.role || '').toLowerCase();
        const targetUserId = (requestingRole === 'admin' && userId) ? userId : (userId || req.user?._id);

        if (!month || !year || !targetUserId) {
            return res.status(400).json({ error: "Month, Year, and UserId are required" });
        }

        // Fetch all rows
        const items = await MRMItem.find({ month, year, createdBy: targetUserId }).sort({ seq: 1 });
        const nonTitleItems = items.filter(i => !i.isTitleRow);

        if (nonTitleItems.length === 0) {
            return res.status(400).json({ error: "Cannot submit an empty MRM. Please add objectives first." });
        }

        // Dynamically resolve parent tile name from preceding title rows
        let activeTile = 'General';
        items.forEach(it => {
            if (it.isTitleRow) {
                activeTile = (it.tileName || it.processDescription || 'General').trim();
            } else if (!it.tileName) {
                it.tileName = activeTile;
            }
        });

        // Enforce PRD Completeness Rules
        const errors = [];
        nonTitleItems.forEach((item, index) => {
            const rowNum = index + 1;
            const objectiveName = item.objective || item.processDescription || `Objective #${rowNum}`;
            const tileName = item.tileName || activeTile || 'General';

            const missingFields = [];
            if (item.plan === undefined || item.plan === null || !String(item.plan).trim()) missingFields.push('Plan');
            if (item.actual === undefined || item.actual === null || !String(item.actual).trim()) missingFields.push('Actual');

            if (item.status === 'Red') {
                if (!item.actionPlan || !String(item.actionPlan).trim()) missingFields.push('Action Plan');
                if (!item.responsibilityAction || !String(item.responsibilityAction).trim()) missingFields.push('Action Responsibility');
            }

            if (missingFields.length > 0) {
                errors.push({
                    itemId: item._id,
                    seq: item.seq || rowNum,
                    rowNum,
                    tile: tileName,
                    objective: objectiveName,
                    missingFields,
                    status: item.status || 'Gray',
                    reason: `Objective has missing required field(s): ${missingFields.join(', ')}`
                });
            }
        });

        if (errors.length > 0) {
            return res.status(422).json({
                success: false,
                message: `Submission blocked: ${errors.length} objective(s) are incomplete.`,
                errors
            });
        }

        // Validation passed -> Update lifecycle to 'Submitted'
        const metadata = await MRMMetadata.findOneAndUpdate(
            { month, year, userId: targetUserId },
            {
                status: 'Submitted',
                submittedAt: new Date(),
                submittedBy: req.user._id,
                isLocked: false
            },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            message: "MRM submitted successfully to Suraj Rajan for review.",
            metadata
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Suraj / Admin Approval Endpoint
router.post('/api/mrm/approve', authMiddleware, async (req, res) => {
    try {
        if (!isAuthorizedApprover(req.user)) {
            return res.status(403).json({ error: "Not authorized. Only Suraj Rajan or an Admin can approve MRMs." });
        }

        const { month, year, userId } = req.body;
        if (!month || !year || !userId) {
            return res.status(400).json({ error: "Month, Year, and UserId are required" });
        }

        const metadata = await MRMMetadata.findOneAndUpdate(
            { month, year, userId },
            {
                status: 'Approved',
                approvedAt: new Date(),
                approvedBy: req.user._id,
                isLocked: true,
                meetingDone: true
            },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            message: "MRM approved and locked.",
            metadata
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Suraj / Admin Send Back for Revision Endpoint (requires comment)
router.post('/api/mrm/request-revision', authMiddleware, async (req, res) => {
    try {
        if (!isAuthorizedApprover(req.user)) {
            return res.status(403).json({ error: "Not authorized. Only Suraj Rajan or an Admin can request revisions." });
        }

        const { month, year, userId, comment } = req.body;
        if (!month || !year || !userId) {
            return res.status(400).json({ error: "Month, Year, and UserId are required" });
        }
        if (!comment || !comment.trim()) {
            return res.status(400).json({ error: "A comment explaining why revision is needed is required." });
        }

        const metadata = await MRMMetadata.findOneAndUpdate(
            { month, year, userId },
            {
                status: 'RevisionRequested',
                isLocked: false,
                meetingDone: false,
                $push: {
                    revisionHistory: {
                        comment: comment.trim(),
                        requestedBy: req.user._id,
                        requestedAt: new Date()
                    }
                }
            },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            message: "MRM sent back for revision with feedback.",
            metadata
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Formal Reopening Endpoint (Suraj/Admin only, requires logged reason)
router.post('/api/mrm/reopen', authMiddleware, async (req, res) => {
    try {
        if (!isAuthorizedApprover(req.user)) {
            return res.status(403).json({ error: "Not authorized. Only Suraj Rajan or an Admin can reopen approved MRMs." });
        }

        const { month, year, userId, reason } = req.body;
        if (!month || !year || !userId) {
            return res.status(400).json({ error: "Month, Year, and UserId are required" });
        }
        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: "A logged reason is required to reopen an approved month." });
        }

        const metadata = await MRMMetadata.findOneAndUpdate(
            { month, year, userId },
            {
                status: 'Draft',
                isLocked: false,
                meetingDone: false,
                $push: {
                    reopenHistory: {
                        reason: reason.trim(),
                        reopenedBy: req.user._id,
                        reopenedAt: new Date()
                    }
                }
            },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            message: "Month reopened successfully for editing.",
            metadata
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Executive & HOD Approval Queue (sorted by wait time)
router.get('/api/mrm/approval-queue', authMiddleware, async (req, res) => {
    try {
        const isApprover = isAuthorizedApprover(req.user);
        const requestingRole = String(req.user?.role || '').toLowerCase();
        const isHOD = requestingRole === 'head_of_department' || requestingRole === 'hod';

        if (!isApprover && !isHOD && requestingRole !== 'admin') {
            return res.status(403).json({ error: "Not authorized to view approval queue" });
        }

        const { year } = req.query;
        const query = { status: 'Submitted' };
        if (year) query.year = Number(year);

        // HODs view only their department / reporting team's pending submissions
        if (!isApprover && requestingRole !== 'admin') {
            const orConditions = [{ _id: req.user._id }];
            if (req.user._id) orConditions.push({ hod_id: req.user._id });
            if (req.user.department) orConditions.push({ department: req.user.department });
            const teamUsers = await UserModel.find({ $or: orConditions }).distinct('_id');
            query.userId = { $in: teamUsers };
        }

        const pendingList = await MRMMetadata.find(query)
            .populate('userId', 'first_name last_name username role')
            .populate('submittedBy', 'first_name last_name username')
            .sort({ submittedAt: 1 }); // Oldest first = longest wait time

        const queueData = await Promise.all(pendingList.map(async (meta) => {
            const targetId = meta.userId?._id || meta.userId;
            const items = await MRMItem.find({
                month: meta.month,
                year: meta.year,
                createdBy: targetId
            });

            let greenCount = 0, yellowCount = 0, redCount = 0, grayCount = 0;
            items.forEach(item => {
                if (item.isTitleRow) return;
                switch (item.status) {
                    case 'Green': greenCount++; break;
                    case 'Yellow': yellowCount++; break;
                    case 'Red': redCount++; break;
                    default: grayCount++; break;
                }
            });

            const now = new Date();
            const submittedTime = meta.submittedAt ? new Date(meta.submittedAt) : new Date(meta.updatedAt);
            const waitHours = Math.max(0, Math.floor((now - submittedTime) / (1000 * 60 * 60)));
            const waitDays = Math.floor(waitHours / 24);

            const presenterName = meta.userId 
                ? `${meta.userId.first_name || ''} ${meta.userId.last_name || ''}`.trim() || meta.userId.username 
                : 'Unknown Presenter';
            const username = meta.userId?.username || 'Unknown';
            const totalCount = items.filter(i => !i.isTitleRow).length;

            return {
                _id: meta._id,
                metadataId: meta._id,
                month: meta.month,
                year: meta.year,
                userId: targetId,
                presenterName,
                username,
                user: meta.userId,
                submittedBy: meta.submittedBy,
                submittedAt: meta.submittedAt,
                daysPending: waitDays,
                waitHours,
                waitDays,
                waitDisplay: waitDays > 0 ? `${waitDays}d ${waitHours % 24}h` : `${waitHours}h`,
                totalItems: totalCount,
                itemsCount: totalCount,
                greenCount,
                yellowCount,
                redCount,
                grayCount
            };
        }));

        res.json(queueData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// ITEM CRUD ROUTES (WITH SAVE-TIME SYNC & LOCK CHECK)
// ==========================================

// Get MRM Items
router.get('/api/mrm', authMiddleware, async (req, res) => {
    try {
        const { month, year, userId } = req.query;
        const requestingRole = String(req.user?.role || '').toLowerCase();
        const requestingUserId = String(req.user?._id || '');

        if (!month || !year) {
            return res.status(400).json({ error: "Month and Year are required" });
        }

        let query = { month, year };

        if (userId) {
            const isOwnData = String(userId) === requestingUserId;
            const isApprover = isAuthorizedApprover(req.user);

            if (!isOwnData && !isApprover && requestingRole !== 'admin') {
                return res.status(403).json({ error: "Not authorized to view other users' MRM" });
            }
            query.createdBy = userId;
        }

        const items = await MRMItem.find(query).sort({ seq: 1, createdAt: 1 });

        const targetUserId = query.createdBy || requestingUserId;
        // Fetch prior months of this year to compute trailing actuals for anomaly detection
        const priorItems = await MRMItem.find({
            year: Number(year),
            month: { $lt: String(month) },
            createdBy: targetUserId,
            isTitleRow: false
        }).sort({ month: 1 });

        const priorActualsMap = new Map();
        priorItems.forEach(p => {
            const key = p.objective || p.processDescription;
            if (!priorActualsMap.has(key)) priorActualsMap.set(key, []);
            const num = parseNumericValue(p.actual);
            if (num !== null) priorActualsMap.get(key).push(num);
        });

        const enrichedItems = items.map(item => {
            const obj = item.toObject();
            const numActual = parseNumericValue(item.actual);

            // 1. Dual YoY Delta Calculation if baseline exists
            if (numActual !== null && item.lastYearBaseline != null) {
                const absDelta = Number((numActual - item.lastYearBaseline).toFixed(2));
                const pctDelta = item.lastYearBaseline !== 0
                    ? Number(((absDelta / item.lastYearBaseline) * 100).toFixed(1))
                    : null;
                
                const sign = absDelta > 0 ? '+' : '';
                const formattedText = pctDelta !== null
                    ? `${sign}${absDelta} (${pctDelta > 0 ? '+' : ''}${pctDelta}%)`
                    : `${sign}${absDelta}`;

                obj.yoyDelta = {
                    baseline: item.lastYearBaseline,
                    metric: item.lastYearBaselineMetric,
                    absDelta,
                    pctDelta,
                    formattedText
                };
            } else {
                obj.yoyDelta = null;
            }

            // 2. Anomaly Detection vs trailing actuals
            const key = item.objective || item.processDescription;
            const trailing = priorActualsMap.get(key) || [];
            if (trailing.length >= 2 && numActual !== null) {
                obj.anomaly = detectAnomalies([...trailing, numActual]);
            } else {
                obj.anomaly = { isAnomaly: false };
            }

            return obj;
        });

        res.json(enrichedItems);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Objective Configuration (Admin & Presenter - Aggregation, Optimization Direction, Tolerance, Baseline)
router.put('/api/mrm/objective/config', authMiddleware, async (req, res) => {
    try {
        const { 
            objective, 
            processDescription, 
            userId, 
            year, 
            aggregationType, 
            optimizationDirection, 
            toleranceBand,
            lastYearBaseline,
            lastYearBaselineMetric,
            macroReferences,
            applyToAllMonths = true
        } = req.body;

        const requestingRole = String(req.user?.role || '').toLowerCase();
        const isAdmin = requestingRole === 'admin' || isAuthorizedApprover(req.user);

        // Security check: Only Admin can configure aggregationType, optimizationDirection, and toleranceBand
        if ((aggregationType !== undefined || optimizationDirection !== undefined || toleranceBand !== undefined) && !isAdmin) {
            return res.status(403).json({ error: "Only Administrators can modify aggregation, optimization direction, or tolerance bands." });
        }

        const targetUserId = userId || req.user?._id;
        if (!objective && !processDescription) {
            return res.status(400).json({ error: "Objective or process description required" });
        }

        const updateFields = {};
        if (isAdmin) {
            if (aggregationType !== undefined) updateFields.aggregationType = aggregationType;
            if (optimizationDirection !== undefined) updateFields.optimizationDirection = optimizationDirection;
            if (toleranceBand !== undefined) updateFields.toleranceBand = toleranceBand;
        }
        if (lastYearBaseline !== undefined) updateFields.lastYearBaseline = (lastYearBaseline === '' || lastYearBaseline === null) ? null : Number(lastYearBaseline);
        if (lastYearBaselineMetric !== undefined) updateFields.lastYearBaselineMetric = lastYearBaselineMetric;
        if (macroReferences !== undefined) updateFields.macroReferences = macroReferences;

        const filter = {
            createdBy: targetUserId,
            $or: [
                { objective: objective },
                { processDescription: processDescription || objective }
            ]
        };
        if (year) filter.year = Number(year);

        if (applyToAllMonths) {
            await MRMItem.updateMany(filter, { $set: updateFields });
        } else if (req.body.itemId) {
            await MRMItem.findByIdAndUpdate(req.body.itemId, { $set: updateFields });
        }

        res.json({ success: true, message: "Objective configuration updated successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create MRM Item (With Save-Time OpenPoints sync)
router.post('/api/mrm', authMiddleware, async (req, res) => {
    try {
        const { month, year, createdBy, insertAfterSeq } = req.body;
        const targetUserId = createdBy || req.user?._id;

        // Check if month is locked
        const meta = await MRMMetadata.findOne({ month, year, userId: targetUserId });
        if (meta?.isLocked && !isAuthorizedApprover(req.user)) {
            return res.status(403).json({ error: "This month is locked and approved. Contact Suraj Rajan to reopen." });
        }

        let item;
        if (insertAfterSeq !== undefined) {
            await MRMItem.updateMany(
                { month, year, createdBy: targetUserId, seq: { $gt: insertAfterSeq } },
                { $inc: { seq: 1 } }
            );
            
            item = new MRMItem({
                ...req.body,
                createdBy: targetUserId,
                seq: insertAfterSeq + 1
            });
            await item.save();
        } else {
            const lastItem = await MRMItem.findOne({ month, year, createdBy: targetUserId }).sort({ seq: -1 });
            const nextSeq = lastItem && lastItem.seq !== undefined ? lastItem.seq + 1 : 1;

            item = new MRMItem({
                ...req.body,
                createdBy: targetUserId,
                seq: nextSeq
            });
            await item.save();
        }

        // Dynamically resolve and persist parent tileName if blank
        if (!item.isTitleRow && !item.tileName) {
            const prevTitle = await MRMItem.findOne({
                month,
                year,
                createdBy: targetUserId,
                isTitleRow: true,
                seq: { $lt: item.seq }
            }).sort({ seq: -1 });
            if (prevTitle) {
                const resolvedTile = (prevTitle.tileName || prevTitle.processDescription || '').trim();
                if (resolvedTile) {
                    item.tileName = resolvedTile;
                    await MRMItem.findByIdAndUpdate(item._id, { tileName: resolvedTile });
                }
            }
        }

        // Trigger safe Save-time OpenPoint sync
        if (item.actionPlan) {
            const point = await syncActionPlanToOpenPoint(item, req.user);
            if (point) {
                item.openPointId = point._id;
            }
        }

        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk Reorder MRM Items
router.put('/api/mrm-bulk/reorder', authMiddleware, async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: "Items array is required" });
        }

        const bulkOps = items.map(item => ({
            updateOne: {
                filter: { _id: item._id },
                update: { $set: { seq: item.seq } }
            }
        }));

        await MRMItem.bulkWrite(bulkOps);
        res.json({ message: "Reordered successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update MRM Item (With Save-Time OpenPoints sync & Lock Check)
router.put('/api/mrm/:id', authMiddleware, auditMiddleware("MRM_Item"), async (req, res) => {
    try {
        const existingItem = await MRMItem.findById(req.params.id);
        if (!existingItem) return res.status(404).json({ error: "Item not found" });

        // Check if month is locked
        const meta = await MRMMetadata.findOne({ 
            month: existingItem.month, 
            year: existingItem.year, 
            userId: existingItem.createdBy 
        });

        if (meta?.isLocked && !isAuthorizedApprover(req.user)) {
            return res.status(403).json({ error: "This month is locked and approved. Contact Suraj Rajan to reopen." });
        }

        const item = await MRMItem.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // Dynamically resolve and persist parent tileName if blank on normal row
        if (item && !item.isTitleRow && !item.tileName) {
            const prevTitle = await MRMItem.findOne({
                month: item.month,
                year: item.year,
                createdBy: item.createdBy,
                isTitleRow: true,
                seq: { $lt: item.seq }
            }).sort({ seq: -1 });
            if (prevTitle) {
                const resolvedTile = (prevTitle.tileName || prevTitle.processDescription || '').trim();
                if (resolvedTile) {
                    item.tileName = resolvedTile;
                    await MRMItem.findByIdAndUpdate(item._id, { tileName: resolvedTile });
                }
            }
        }

        // Trigger safe Save-time OpenPoint sync
        if (item && (item.actionPlan || item.openPointId)) {
            const point = await syncActionPlanToOpenPoint(item, req.user);
            if (point) {
                item.openPointId = point._id;
            }
        }

        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete MRM Item (With Lock Check)
router.delete('/api/mrm/:id', authMiddleware, auditMiddleware("MRM_Item"), async (req, res) => {
    try {
        const item = await MRMItem.findById(req.params.id);
        if (!item) return res.status(404).json({ error: "Item not found" });

        // Check if month is locked
        const meta = await MRMMetadata.findOne({ 
            month: item.month, 
            year: item.year, 
            userId: item.createdBy 
        });

        if (meta?.isLocked && !isAuthorizedApprover(req.user)) {
            return res.status(403).json({ error: "This month is locked and approved. Contact Suraj Rajan to reopen." });
        }

        await MRMItem.findByIdAndDelete(req.params.id);
        res.json({ message: "Item deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk Delete MRM Items for a month (With Lock Check)
router.delete('/api/mrm-bulk/delete', authMiddleware, async (req, res) => {
    try {
        const { month, year, userId } = req.query;
        const requestingRole = String(req.user?.role || '').toLowerCase();
        const requestingUserId = String(req.user?._id || '');

        if (!month || !year || !userId) {
            return res.status(400).json({ error: "Month, Year and UserId are required" });
        }

        const isOwnData = String(userId) === requestingUserId;
        const isApprover = isAuthorizedApprover(req.user);

        if (!isOwnData && !isApprover && requestingRole !== 'admin') {
            return res.status(403).json({ error: "Not authorized to delete this data" });
        }

        const meta = await MRMMetadata.findOne({ month, year, userId });
        if (meta?.isLocked && !isApprover) {
            return res.status(403).json({ error: "This month is locked and approved. Contact Suraj Rajan to reopen." });
        }

        const result = await MRMItem.deleteMany({ month, year, createdBy: userId });
        res.json({ message: `${result.deletedCount} items deleted`, count: result.deletedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Import Items
router.post('/api/mrm/import', authMiddleware, auditMiddleware("MRM_Item"), async (req, res) => {
    try {
        const { targetMonth, targetYear, sourceMonth, sourceYear, mode, userId } = req.body;

        if (!targetMonth || !targetYear || !sourceMonth || !sourceYear || !mode) {
            return res.status(400).json({ error: "Missing required fields for import" });
        }

        const targetUserId = userId || req.user?._id;

        // Check if target month is locked
        const meta = await MRMMetadata.findOne({ month: targetMonth, year: targetYear, userId: targetUserId });
        if (meta?.isLocked && !isAuthorizedApprover(req.user)) {
            return res.status(403).json({ error: "The target month is locked and approved. Contact Suraj Rajan to reopen." });
        }

        const sourceItems = await MRMItem.find({
            month: sourceMonth,
            year: sourceYear,
            createdBy: targetUserId
        });

        if (sourceItems.length === 0) {
            return res.status(404).json({ error: "No data found in source month to import" });
        }

        const validSourceItems = sourceItems.sort((a, b) => {
            if (a.seq !== b.seq) return (a.seq || 0) - (b.seq || 0);
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

        const lastTargetItem = await MRMItem.findOne({ 
            month: targetMonth, 
            year: targetYear, 
            createdBy: targetUserId 
        }).sort({ seq: -1 });

        const startSeq = lastTargetItem && lastTargetItem.seq !== undefined ? lastTargetItem.seq + 1 : 1;

        let newItems = [];

        if (mode === 'as-is') {
            newItems = validSourceItems.map((item, index) => ({
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
                createdBy: targetUserId,
                seq: startSeq + index,
                isTitleRow: item.isTitleRow || false,
                bgColor: item.bgColor || '#ffffff',
                tileName: item.tileName || '',
                aggregationType: item.aggregationType || 'Sum',
                optimizationDirection: item.optimizationDirection || 'Higher',
                toleranceBand: item.toleranceBand || 5,
                lastYearBaseline: item.lastYearBaseline || null
            }));
        } else if (mode === 'blank') {
            newItems = validSourceItems.map((item, index) => ({
                month: targetMonth,
                year: targetYear,
                processDescription: item.processDescription,
                objective: item.objective,
                target: item.target,
                monitoringFrequency: item.monitoringFrequency,
                responsibility: item.responsibility,
                actual: "",
                plan: "",
                actionPlan: "",
                responsibilityAction: "",
                targetDate: null,
                status: "Gray",
                remarks: "",
                createdBy: targetUserId,
                seq: startSeq + index,
                isTitleRow: item.isTitleRow || false,
                bgColor: item.bgColor || '#ffffff',
                tileName: item.tileName || '',
                aggregationType: item.aggregationType || 'Sum',
                optimizationDirection: item.optimizationDirection || 'Higher',
                toleranceBand: item.toleranceBand || 5,
                lastYearBaseline: item.lastYearBaseline || null
            }));
        }

        await MRMItem.insertMany(newItems);
        const result = await MRMItem.find({ month: targetMonth, year: targetYear, createdBy: targetUserId });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// ANALYTICS & ROLLUP ROUTES
// ==========================================

// Annual Rollup & Forecasting (Approved months only)
router.get('/api/mrm/annual-rollup', authMiddleware, async (req, res) => {
    try {
        const { year, userId, forecastMethod } = req.query;
        const requestingRole = String(req.user?.role || '').toLowerCase();
        const requestingUserId = String(req.user?._id || '');

        let targetUserId = userId;
        if (!targetUserId && requestingRole !== 'admin' && !isAuthorizedApprover(req.user)) {
            targetUserId = requestingUserId;
        }

        const data = await calculateAnnualRollup({
            year: year || new Date().getFullYear(),
            userId: targetUserId,
            forecastMethod: forecastMethod || 'best_worst'
        });

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Recurring Issues & Bottlenecks Analysis
router.get('/api/mrm/recurring-issues', authMiddleware, async (req, res) => {
    try {
        const { year } = req.query;
        const data = await analyzeRecurringIssues({ year: year || new Date().getFullYear() });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Filtered MRM Open Points Hub
router.get('/api/mrm/open-points', authMiddleware, async (req, res) => {
    try {
        const { status, owner, userId, age } = req.query;
        const query = { originModule: 'MRM' };
        if (status && status !== 'all') query.status = status;
        if (userId) query['originContext.personId'] = userId;
        if (owner && owner.trim()) {
            const reg = new RegExp(owner.trim(), 'i');
            query.$or = [
                { responsibility: reg },
                { assigned_to_name: reg }
            ];
        }

        if (age === '30') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            query.createdAt = { $lte: thirtyDaysAgo };
        } else if (age === '60') {
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            query.createdAt = { $lte: sixtyDaysAgo };
        } else if (age === 'overdue') {
            query.target_date = { $lt: new Date() };
            query.status = { $in: ['Red', 'Yellow', 'Orange'] };
        }

        const points = await OpenPoint.find(query)
            .populate('responsible_person', 'first_name last_name username')
            .populate('created_by', 'first_name last_name username')
            .sort({ createdAt: -1 });

        const formattedPoints = points.map(pt => {
            const obj = pt.toObject();
            obj.task = pt.description || pt.title || '';
            obj.assigned_to_name = pt.responsible_person 
                ? `${pt.responsible_person.first_name || ''} ${pt.responsible_person.last_name || ''}`.trim() || pt.responsible_person.username
                : (pt.responsibility || 'Unassigned');
            return obj;
        });

        res.json(formattedPoints);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

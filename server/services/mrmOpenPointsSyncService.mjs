import OpenPointProject from '../model/openPoints/openPointProjectModel.mjs';
import OpenPoint from '../model/openPoints/openPointModel.mjs';
import MRMItem from '../model/mrm/mrmItemModel.mjs';
import UserModel from '../model/userModel.mjs';

/**
 * Ensures the system-level "MRM Action Points" project exists (legacy fallback).
 */
export const getOrCreateMRMProject = async () => {
    let project = await OpenPointProject.findOne({
        $or: [{ name: 'MRM Action Points' }, { initials: 'MRM' }]
    });

    if (!project) {
        const ownerUser = await UserModel.findOne({ username: 'suraj_rajan' }) ||
                          await UserModel.findOne({ role: { $in: ['Admin', 'admin'] } }) ||
                          await UserModel.findOne();

        const activeUsers = await UserModel.find({ 
            status: { $ne: 'Inactive' },
            role: { $nin: ['driver'] }
        }).select('_id');

        const teamMembers = activeUsers.map(u => ({
            user: u._id,
            role: 'L2'
        }));

        project = new OpenPointProject({
            name: 'MRM Action Points',
            initials: 'MRM',
            description: 'Automated action points originating from Monthly Review Meetings (MRM).',
            owner: ownerUser?._id,
            status: 'Active',
            team_members: teamMembers
        });
        await project.save();
    }
    return project;
};

/**
 * Ensures a per-HOD "MRM - {HOD Name}" project exists.
 */
export const getOrCreateHodMRMProject = async (hodUser) => {
    if (!hodUser) return await getOrCreateMRMProject();

    const firstName = (hodUser.first_name || '').trim();
    const lastName = (hodUser.last_name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || hodUser.username;
    const projectName = `MRM - ${fullName}`;

    // Initials: MRM-{initials} (e.g. MRM-SR)
    const firstInitial = firstName ? firstName[0].toUpperCase() : (hodUser.username ? hodUser.username[0].toUpperCase() : '');
    const lastInitial = lastName ? lastName[0].toUpperCase() : (firstName.length > 1 ? firstName[1].toUpperCase() : 'H');
    const initials = `MRM-${firstInitial}${lastInitial}`;

    let project = await OpenPointProject.findOne({
        $or: [{ name: projectName }, { initials }]
    });

    if (!project) {
        let deptMembers = [];
        if (hodUser.department) {
            deptMembers = await UserModel.find({
                department: hodUser.department,
                status: { $ne: 'Inactive' },
                role: { $nin: ['driver'] }
            }).select('_id');
        }

        const teamMembers = deptMembers.map(u => ({
            user: u._id,
            role: 'L2'
        }));

        if (!teamMembers.some(tm => tm.user.toString() === hodUser._id.toString())) {
            teamMembers.push({ user: hodUser._id, role: 'L1' });
        }

        project = new OpenPointProject({
            name: projectName,
            initials,
            description: `Automated MRM action points for ${fullName} (${hodUser.department || 'General'}).`,
            owner: hodUser._id,
            status: 'Active',
            team_members: teamMembers
        });
        await project.save();
    }
    return project;
};

/**
 * Maps MRM status to OpenPoint status.
 */
const mapMRMStatusToOpenPoint = (status) => {
    if (status === 'Not Required') return null;
    if (status === 'Green') return 'Green';
    if (status === 'Yellow') return 'Yellow';
    return 'Red';
};

/**
 * Maps OpenPoint status to MRM status.
 */
export const mapOpenPointStatusToMRM = (status) => {
    if (status === 'Green') return 'Green';
    if (status === 'Yellow' || status === 'Orange') return 'Yellow';
    return 'Red';
};

/**
 * Synchronizes an MRM action plan to Open Points at Save time.
 * Wrapped in an error boundary to guarantee non-breaking execution.
 */
export const syncActionPlanToOpenPoint = async (mrmItem, reqUser = null) => {
    try {
        if (process.env.ENABLE_MRM_OP_SYNC === 'false') {
            return null;
        }

        if (mrmItem.status === 'Not Required') {
            return null;
        }

        const hasActionPlan = Boolean(mrmItem.actionPlan && mrmItem.actionPlan.trim());
        const hasRemarks = Boolean(mrmItem.remarks && mrmItem.remarks.trim());

        // If no action plan text exists, no remarks exist, and no existing point, nothing to create
        if (!hasActionPlan && !hasRemarks && !mrmItem.openPointId) {
            return null;
        }

        // Resolve HOD user for per-HOD MRM Project
        let hodUser = null;
        if (mrmItem.createdBy) {
            hodUser = await UserModel.findById(mrmItem.createdBy);
        }
        if (!hodUser && reqUser) {
            hodUser = reqUser;
        }

        const mrmProject = await getOrCreateHodMRMProject(hodUser);
        if (!mrmProject) return null;

        // Dynamically resolve parent Process Tile if tileName is missing
        let tileName = (mrmItem.tileName || '').trim();
        if (!tileName && !mrmItem.isTitleRow) {
            const prevTitle = await MRMItem.findOne({
                month: mrmItem.month,
                year: mrmItem.year,
                createdBy: mrmItem.createdBy,
                isTitleRow: true,
                seq: { $lt: mrmItem.seq }
            }).sort({ seq: -1 });

            if (prevTitle) {
                tileName = (prevTitle.tileName || prevTitle.processDescription || '').trim();
                // Backfill tileName on mrmItem if empty
                await MRMItem.findByIdAndUpdate(mrmItem._id, { tileName });
            }
        }
        if (!tileName) {
            tileName = 'General';
        }

        // Resolve responsibility: Prioritize MRM "Resp." (responsibility), fallback to "Act. Resp." (responsibilityAction)
        const rawResp = String(mrmItem.responsibility || mrmItem.responsibilityAction || '').trim();
        let resolvedUser = null;
        if (rawResp) {
            const safeResp = rawResp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const userQuery = [
                { username: { $regex: new RegExp(`^${safeResp}$`, 'i') } },
                { first_name: { $regex: new RegExp(`^${safeResp}$`, 'i') } },
                { 
                    $expr: {
                        $eq: [
                            { $toLower: { $trim: { input: { $concat: ["$first_name", " ", "$last_name"] } } } },
                            rawResp.toLowerCase()
                        ]
                    }
                }
            ];
            if (rawResp.match(/^[0-9a-fA-F]{24}$/)) {
                userQuery.push({ _id: rawResp });
            }
            resolvedUser = await UserModel.findOne({ $or: userQuery, status: { $ne: 'Inactive' } });

            // If not found, try first token (e.g. "Rahul Patel" -> "Rahul", "Alpesh/Anup" -> "Alpesh")
            if (!resolvedUser) {
                const firstWord = rawResp.split(/[\s/+,&]+/)[0]?.trim();
                if (firstWord && firstWord.length > 2) {
                    const safeFirstWord = firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    resolvedUser = await UserModel.findOne({
                        $or: [
                            { first_name: { $regex: new RegExp(`^${safeFirstWord}$`, 'i') } },
                            { username: { $regex: new RegExp(`^${safeFirstWord}`, 'i') } }
                        ],
                        status: { $ne: 'Inactive' }
                    });
                }
            }
        }

        const assignedResp = resolvedUser ? resolvedUser.username : (rawResp || 'Unassigned');

        let existingPoint = null;

        // 1. Try to find by direct reference ID
        if (mrmItem.openPointId) {
            existingPoint = await OpenPoint.findById(mrmItem.openPointId);
        }

        // 2. If not found, deduplicate by matching originating context across recurring months
        const targetObjective = (mrmItem.objective || mrmItem.processDescription || '').trim();
        if (!existingPoint && mrmItem.createdBy && targetObjective) {
            const safeObjRegex = new RegExp(`^${targetObjective.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
            existingPoint = await OpenPoint.findOne({
                originModule: 'MRM',
                'originContext.personId': mrmItem.createdBy,
                $or: [
                    { 'originContext.objective': targetObjective },
                    { 'originContext.objective': safeObjRegex }
                ]
            });
        }

        const pointStatus = mapMRMStatusToOpenPoint(mrmItem.status);

        if (existingPoint) {
            // Update existing Open Point (deduplicated across recurring months)
            existingPoint.gap_action = mrmItem.actionPlan || '';
            existingPoint.remarks = mrmItem.remarks || '';
            existingPoint.description = mrmItem.actionPlan || mrmItem.remarks || '';
            if (mrmItem.targetDate) existingPoint.target_date = mrmItem.targetDate;
            if (rawResp) {
                existingPoint.responsibility = assignedResp;
                existingPoint.responsible_person = resolvedUser ? resolvedUser._id : null;
            }
            
            // Only update status if explicitly changed
            if (pointStatus && existingPoint.status !== pointStatus) {
                existingPoint.status = pointStatus;
                if (pointStatus === 'Green') {
                    existingPoint.completion_date = new Date();
                } else {
                    existingPoint.completion_date = null;
                }
            }

            // Update month/year context to latest and ensure correct parent tile
            if (existingPoint.originContext) {
                existingPoint.originContext.month = mrmItem.month;
                existingPoint.originContext.year = mrmItem.year;
                existingPoint.originContext.mrmItemId = mrmItem._id;
                if (tileName) existingPoint.originContext.tile = tileName;
            }

            await existingPoint.save();

            // Ensure MRMItem has the link
            if (!mrmItem.openPointId || String(mrmItem.openPointId) !== String(existingPoint._id)) {
                await MRMItem.findByIdAndUpdate(mrmItem._id, { openPointId: existingPoint._id });
            }

            return existingPoint;
        }

        // 3. Create new Open Point
        const lastPoint = await OpenPoint.findOne({ project_id: mrmProject._id }).sort({ seq_id: -1 });
        const nextSeqId = lastPoint && lastPoint.seq_id ? lastPoint.seq_id + 1 : 1;
        const initials = mrmProject.initials || 'MRM';
        const uniqueId = `${initials}-${nextSeqId}`;

        const newPoint = new OpenPoint({
            project_id: mrmProject._id,
            title: `[MRM] ${targetObjective || mrmItem.actionPlan || mrmItem.remarks || 'Action Plan'}`,
            description: mrmItem.actionPlan || mrmItem.remarks || '',
            gap_action: mrmItem.actionPlan || '',
            remarks: mrmItem.remarks || '',
            seq_id: nextSeqId,
            unique_id: uniqueId,
            responsibility: assignedResp,
            responsible_person: resolvedUser ? resolvedUser._id : null,
            target_date: mrmItem.targetDate || null,
            status: pointStatus,
            priority: mrmItem.status === 'Red' ? 'High' : 'Medium',
            created_by: reqUser?._id || mrmItem.createdBy,
            creation_date: new Date(),
            completion_date: pointStatus === 'Green' ? new Date() : null,
            originModule: 'MRM',
            originContext: {
                mrmItemId: mrmItem._id,
                personId: mrmItem.createdBy,
                personName: reqUser?.first_name ? `${reqUser.first_name} ${reqUser.last_name || ''}`.trim() : '',
                tile: tileName,
                objective: targetObjective,
                month: mrmItem.month,
                year: mrmItem.year
            }
        });

        await newPoint.save();

        // Update MRMItem with reference ID
        await MRMItem.findByIdAndUpdate(mrmItem._id, { openPointId: newPoint._id });

        return newPoint;
    } catch (err) {
        console.error('Safe warning: MRM ↔ OpenPoint sync encountered an issue:', err.message);
        // Non-breaking: return null without rethrowing
        return null;
    }
};

/**
 * Reverse sync hook: Updates linked MRMItem status, actionPlan, remarks, and targetDate when an Open Point is updated.
 */
export const syncOpenPointStatusToMRM = async (openPoint) => {
    try {
        if (!openPoint || openPoint.originModule !== 'MRM') return;

        const targetItemId = openPoint.originContext?.mrmItemId;
        const mappedStatus = mapOpenPointStatusToMRM(openPoint.status);

        const filter = [];
        if (targetItemId) filter.push({ _id: targetItemId });
        if (openPoint._id) filter.push({ openPointId: openPoint._id });

        if (filter.length > 0) {
            const updateFields = { status: mappedStatus };
            if (openPoint.gap_action !== undefined) {
                updateFields.actionPlan = openPoint.gap_action;
            }
            if (openPoint.remarks !== undefined) {
                updateFields.remarks = openPoint.remarks;
            }
            if (openPoint.target_date !== undefined) {
                updateFields.targetDate = openPoint.target_date;
            }
            if (openPoint.responsibility !== undefined) {
                updateFields.responsibility = openPoint.responsibility;
            }

            await MRMItem.updateMany(
                { $or: filter, status: { $ne: 'Not Required' } },
                updateFields
            );
        }
    } catch (err) {
        console.error('Safe warning: OpenPoint -> MRM reverse status sync error:', err.message);
    }
};

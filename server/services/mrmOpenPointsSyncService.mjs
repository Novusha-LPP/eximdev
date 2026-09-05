import OpenPointProject from '../model/openPoints/openPointProjectModel.mjs';
import OpenPoint from '../model/openPoints/openPointModel.mjs';
import MRMItem from '../model/mrm/mrmItemModel.mjs';
import UserModel from '../model/userModel.mjs';

/**
 * Ensures the system-level "MRM Action Points" project exists.
 */
export const getOrCreateMRMProject = async () => {
    let project = await OpenPointProject.findOne({
        $or: [{ name: 'MRM Action Points' }, { initials: 'MRM' }]
    });

    if (!project) {
        const ownerUser = await UserModel.findOne({ username: 'suraj_rajan' }) ||
                          await UserModel.findOne({ role: { $in: ['Admin', 'admin'] } }) ||
                          await UserModel.findOne();

        project = new OpenPointProject({
            name: 'MRM Action Points',
            initials: 'MRM',
            description: 'Automated action points originating from Monthly Review Meetings (MRM).',
            owner: ownerUser?._id,
            status: 'Active',
            team_members: []
        });
        await project.save();
    }
    return project;
};

/**
 * Maps MRM status to OpenPoint status.
 */
const mapMRMStatusToOpenPoint = (status) => {
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

        // If no action plan text exists and no existing point, nothing to create
        if ((!mrmItem.actionPlan || !mrmItem.actionPlan.trim()) && !mrmItem.openPointId) {
            return null;
        }

        const mrmProject = await getOrCreateMRMProject();
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

        // Resolve responsible user by username or full name if provided
        let resolvedUser = null;
        if (mrmItem.responsibilityAction) {
            const respStr = String(mrmItem.responsibilityAction).trim();
            const userQuery = [
                { username: { $regex: new RegExp(`^${respStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
                { 
                    $expr: {
                        $eq: [
                            { $toLower: { $trim: { input: { $concat: ["$first_name", " ", "$last_name"] } } } },
                            respStr.toLowerCase()
                        ]
                    }
                }
            ];
            if (respStr.match(/^[0-9a-fA-F]{24}$/)) {
                userQuery.push({ _id: respStr });
            }
            resolvedUser = await UserModel.findOne({ $or: userQuery });
        }

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
            existingPoint.description = mrmItem.actionPlan;
            if (mrmItem.targetDate) existingPoint.target_date = mrmItem.targetDate;
            if (mrmItem.responsibilityAction) existingPoint.responsibility = mrmItem.responsibilityAction;
            if (resolvedUser) existingPoint.responsible_person = resolvedUser._id;
            
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
            title: `[MRM] ${targetObjective || 'Action Plan'}`,
            description: mrmItem.actionPlan,
            seq_id: nextSeqId,
            unique_id: uniqueId,
            responsibility: mrmItem.responsibilityAction || (resolvedUser ? `${resolvedUser.first_name} ${resolvedUser.last_name || ''}`.trim() : 'Unassigned'),
            responsible_person: resolvedUser ? resolvedUser._id : null,
            target_date: mrmItem.targetDate || null,
            status: pointStatus,
            priority: mrmItem.status === 'Red' ? 'High' : 'Medium',
            created_by: reqUser?._id || mrmItem.createdBy,
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
 * Reverse sync hook: Updates linked MRMItem status when an Open Point is updated.
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
            await MRMItem.updateMany(
                { $or: filter },
                { status: mappedStatus }
            );
        }
    } catch (err) {
        console.error('Safe warning: OpenPoint -> MRM reverse status sync error:', err.message);
    }
};

import UserBranchModel from "../model/userBranchModel.mjs";
import JobModel from "../model/jobModel.mjs";

/**
 * Middleware to verify if the user has access to the requested branch.
 */
export const verifyBranchAccess = async (req, res, next) => {
    try {
        const userId = req.headers['user-id'] || req.user?.id; // Adjust based on how auth is handled
        const branchId = req.params.branchId || req.body.branch_id || req.query.branch_id;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User ID missing" });
        }

        if (!branchId) {
            return res.status(400).json({ message: "Branch ID is required" });
        }

        const access = await UserBranchModel.findOne({ user_id: userId, branch_id: branchId });

        if (!access) {
            return res.status(403).json({ message: "Access denied to this branch" });
        }

        req.branchId = branchId;
        next();
    } catch (error) {
        console.error("Error in branchMiddleware:", error);
        res.status(500).json({ message: "Internal server error in branch access check" });
    }
};

/**
 * Middleware to verify access to a specific job based on its branch.
 */
export const verifyJobBranchAccess = async (req, res, next) => {
    try {
        const userId = req.headers['user-id'] || req.user?.id;
        const jobId = req.params.id || req.params.jobId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: User ID missing" });
        }

        if (!jobId) {
            return next(); // Let next middleware handle missing jobId if applicable
        }

        const job = await JobModel.findById(jobId).select('branch_id');
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        if (!job.branch_id) {
            // Handle legacy jobs if needed. For now, assume open or restricted.
            // If system policy is strict, restricted.
            return next();
        }

        const access = await UserBranchModel.findOne({ user_id: userId, branch_id: job.branch_id });

        if (!access) {
            return res.status(403).json({ message: "Access denied to this job's branch" });
        }

        next();
    } catch (error) {
        console.error("Error in verifyJobBranchAccess:", error);
        res.status(500).json({ message: "Internal server error in job branch access check" });
    }
};

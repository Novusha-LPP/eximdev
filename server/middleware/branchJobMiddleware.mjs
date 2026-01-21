import { getJobModelForBranch } from "../utils/modelHelper.mjs";
import { jobSchema } from "../model/jobModel.mjs";

/**
 * Branch Job Middleware
 * 
 * This middleware observes the current branch from the request header (x-branch)
 * and attaches the appropriate Job model to the request object.
 * 
 * - AHMEDABAD HO (Main Branch): Uses 'jobs' collection
 * - GANDHIDHAM: Uses 'jobs_gandhidham' collection
 * - AIR: Uses 'jobs_air' collection
 * 
 * All collections exist in the same main database.
 * 
 * Usage in routes:
 *   const JobModel = req.JobModel; // Use this instead of importing JobModel directly
 */
const branchJobMiddleware = (req, res, next) => {
    try {
        // Get branch from header, default to AHMEDABAD HO
        const branch = req.headers["x-branch"] || "AHMEDABAD HO";

        // Normalize branch name
        let normalizedBranch = branch;
        if (branch === "Main Branch") normalizedBranch = "AHMEDABAD HO";
        if (branch === "Gandhidham" || branch === "Gandhidham Branch") normalizedBranch = "GANDHIDHAM";
        if (branch === "Air" || branch === "AIR Branch") normalizedBranch = "AIR";

        // Get the appropriate Job model for this branch
        const JobModel = getJobModelForBranch(normalizedBranch, jobSchema);

        // Attach to request object for use in route handlers
        req.JobModel = JobModel;
        req.currentBranch = normalizedBranch;

        // Log for debugging
        console.log(`DEBUG: [branchJobMiddleware] Branch: "${normalizedBranch}" -> JobModel attached`);

        next();
    } catch (error) {
        console.error("Error in branchJobMiddleware:", error);
        res.status(500).json({ error: "Failed to initialize branch context" });
    }
};

export default branchJobMiddleware;

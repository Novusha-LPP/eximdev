import { getJobModel } from "../model/jobModelFactory.mjs";

/**
 * Middleware to extract branch and category from headers
 * and attach the correct JobModel to the request object.
 */
const branchFilter = (req, res, next) => {
    const branchName = req.headers['x-branch'] || 'AHMEDABAD';
    const category = req.headers['x-category'] || 'SEA';

    try {
        req.branchName = branchName;
        req.category = category;
        req.JobModel = getJobModel(branchName, category);
        next();
    } catch (error) {
        console.error("Error in branchFilter middleware:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

export default branchFilter;

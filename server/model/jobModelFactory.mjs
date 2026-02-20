import mongoose from "mongoose";
import { jobSchema } from "./jobModel.mjs";

const modelsCache = {};

export const getJobModel = (branchName, category) => {
    // Graceful fallback for legacy endpoints that haven't passed branch/category
    if (!branchName || !category) {
        return mongoose.models.Job || mongoose.model("Job", jobSchema);
    }

    // Preserve backwards compatibility for AHMEDABAD / SEA
    if (branchName === "AHMEDABAD" && category === "SEA") {
        return mongoose.models.Job || mongoose.model("Job", jobSchema);
    }

    // Clean strings for collection naming
    const cleanBranch = branchName.replace(/\s+/g, '_').toLowerCase();
    const cleanCategory = category.replace(/\s+/g, '_').toLowerCase();

    const collectionName = `${cleanBranch}_jobs_${cleanCategory}`;
    const modelName = `Job_${cleanBranch}_${cleanCategory}`;

    // Use cached model if it exists
    if (modelsCache[modelName]) {
        return modelsCache[modelName];
    }

    // Create new model attached to specific collection, if not already in mongoose.models
    const model = mongoose.models[modelName] || mongoose.model(modelName, jobSchema, collectionName);

    modelsCache[modelName] = model;
    return model;
};

export const initializeBranchCollections = async (branchName, categories) => {
    try {
        for (const category of categories) {
            // Skip legacy Ahmedabad Sea as it uses default collection
            if (branchName === "AHMEDABAD" && category === "SEA") continue;

            const cleanBranch = branchName.replace(/\s+/g, '_').toLowerCase();
            const cleanCategory = category.replace(/\s+/g, '_').toLowerCase();
            const collectionName = `${cleanBranch}_jobs_${cleanCategory}`;

            // Create collection if it doesn't exist
            const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
            if (collections.length === 0) {
                await mongoose.connection.db.createCollection(collectionName);
                console.log(`Created collection: ${collectionName}`);
            }
        }
    } catch (error) {
        console.error("Error initializing branch collections:", error);
    }
};

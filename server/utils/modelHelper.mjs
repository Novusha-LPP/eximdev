import { getConnection } from "./connectionManager.mjs";

// Cache for models per collection to avoid re-creating them
const modelCache = new Map();

/**
 * Creates a dynamic model that uses the standard connection.
 * For Job model, the actual collection is determined by the branchJobMiddleware at runtime.
 */
export const createDynamicModel = (modelName, schema) => {
    return new Proxy({}, {
        get: (target, prop) => {
            const conn = getConnection();

            if (!conn) {
                console.error(`DEBUG: [modelHelper] No connection available when accessing "${modelName}.${prop}"`);
                throw new Error(`Database connection is not available`);
            }

            if (schema.get('bufferCommands') !== false) {
                schema.set('bufferCommands', false);
            }

            // Use standard model name - branch-specific routing is handled by middleware
            const model = conn.models[modelName] || conn.model(modelName, schema);

            const value = model[prop];
            if (typeof value === 'function') {
                if (prop === 'then' || prop === 'catch' || prop === 'finally') {
                    return value.bind(model);
                }
                return (...args) => {
                    if (conn.readyState !== 1) {
                        console.warn(`DEBUG: [modelHelper] Executing "${modelName}.${prop}" while connection is NOT READY (State: ${conn.readyState})`);
                    }
                    return Reflect.apply(model[prop], model, args);
                };
            }
            return value;
        }
    });
};

/**
 * Get a Job model for a specific branch collection.
 * This is used by the branchJobMiddleware to provide the correct model.
 */
export const getJobModelForBranch = (branch, schema) => {
    const conn = getConnection();

    if (!conn) {
        throw new Error("Database connection is not available");
    }

    let collectionName;
    let modelName;

    switch (branch) {
        case "AIR":
            collectionName = "jobs_air";
            modelName = "Job_AIR";
            break;
        case "GANDHIDHAM":
            collectionName = "jobs_gandhidham";
            modelName = "Job_GANDHIDHAM";
            break;
        default:
            // AHMEDABAD HO or any other branch uses default 'jobs' collection
            collectionName = "jobs";
            modelName = "Job";
            break;
    }

    // Check cache first
    const cacheKey = `${modelName}_${collectionName}`;
    if (modelCache.has(cacheKey)) {
        return modelCache.get(cacheKey);
    }

    // Create new model for this collection
    if (schema.get('bufferCommands') !== false) {
        schema.set('bufferCommands', false);
    }

    const model = conn.models[modelName] || conn.model(modelName, schema, collectionName);
    modelCache.set(cacheKey, model);

    console.log(`DEBUG: [modelHelper] Created/Retrieved model "${modelName}" for collection "${collectionName}"`);

    return model;
};

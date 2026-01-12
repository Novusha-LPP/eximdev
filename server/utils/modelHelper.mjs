import { branchContext } from "./branchContext.mjs";
import { getConnection } from "./connectionManager.mjs";

export const createDynamicModel = (modelName, schema, pinnedBranch = null) => {
    return new Proxy({}, {
        get: (target, prop) => {
            const branch = pinnedBranch || branchContext.getStore() || "AHMEDABAD HO";
            const conn = getConnection(branch);

            if (!conn) {
                console.error(`DEBUG: [modelHelper] No connection for branch "${branch}" when accessing "${modelName}.${prop}"`);
                throw new Error(`Database connection for branch "${branch}" is not available`);
            }

            if (schema.get('bufferCommands') !== false) {
                schema.set('bufferCommands', false);
            }

            const model = conn.models[modelName] || conn.model(modelName, schema);

            // Log state for debugging
            console.log(`DEBUG: [modelHelper] Model "${modelName}.${prop}" using branch "${branch}" (State: ${conn.readyState})`);

            const value = model[prop];
            if (typeof value === 'function') {
                // Return a function that preserves 'this' context, but don't bind .then/.catch
                // as they are handled by the promise mechanism
                if (prop === 'then' || prop === 'catch' || prop === 'finally') {
                    return value.bind(model);
                }
                // Use reflect to call the function with the correct context and arguments
                return (...args) => {
                    if (conn.readyState !== 1) {
                        console.warn(`DEBUG: [modelHelper] Executing "${modelName}.${prop}" while connection is NOT READY (State: ${conn.readyState}). Branch: "${branch}"`);
                    }
                    return Reflect.apply(model[prop], model, args);
                };
            }
            return value;
        }
    });
};

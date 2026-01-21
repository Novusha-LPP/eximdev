import mongoose from "mongoose";
import logger from "../logger.js";

let mainConnection = null;

const options = {
    minPoolSize: 10,
    maxPoolSize: 100,
};

export const initConnections = async () => {
    // Always use the main database URI based on environment
    let mainUri = process.env.NODE_ENV === "production"
        ? process.env.PROD_MONGODB_URI
        : process.env.NODE_ENV === "server"
            ? process.env.SERVER_MONGODB_URI
            : process.env.DEV_MONGODB_URI;

    // Helper to strip quotes and fix common Atlas URI issues
    const cleanUri = (uri) => {
        if (!uri) return uri;
        let cleaned = uri.trim();
        // Remove quotes
        if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.substring(1, cleaned.length - 1);
        }
        cleaned = cleaned.trim();

        // Ensure there is a / before the first parameter separator (? or &)
        const protocolEnd = cleaned.indexOf('://') + 3;
        const firstSep = cleaned.indexOf('?', protocolEnd) !== -1 ? cleaned.indexOf('?', protocolEnd) : cleaned.indexOf('&', protocolEnd);
        const firstSlash = cleaned.indexOf('/', protocolEnd);

        if (firstSep !== -1 && (firstSlash === -1 || firstSlash > firstSep)) {
            // Found a parameter separator before a slash
            cleaned = cleaned.substring(0, firstSep) + '/test?' + cleaned.substring(firstSep + 1);
        } else if (firstSlash === -1) {
            // No slash and no parameter separator
            cleaned = cleaned + '/test';
        }

        return cleaned;
    };

    mainUri = cleanUri(mainUri);

    if (mainUri) {
        const masked = mainUri.replace(/\/\/.*@/, "//USER:PASS@");
        console.log("DEBUG: Main MongoDB URI:", masked);
    }

    if (!mainUri) {
        logger.error("No Main MongoDB URI found in environment variables!");
        throw new Error("Missing MONGODB_URI");
    }

    try {
        // Single Main Connection for all branches
        logger.info(`Connecting to Main database...`);
        mainConnection = mongoose.createConnection(mainUri, {
            ...options,
            bufferCommands: false,
        });

        // Wait for Main connection to be ready
        await new Promise((resolve, reject) => {
            mainConnection.once('open', () => {
                console.log(`✅ [PID:${process.pid}] Successfully connected to Main database`);
                logger.info(`Successfully connected to Main database on PID:${process.pid}`);
                resolve();
            });
            mainConnection.on('error', (err) => {
                console.error(`❌ Main database connection error on PID:${process.pid}:`, err);
                logger.error(`Main database connection error on PID:${process.pid}:`, err);
                reject(err);
            });
        });

        logger.info("Database connection initialized successfully - all branches use main database");
    } catch (error) {
        console.error("❌ Database connection initialization failed!");
        logger.error("Database connection initialization failed:", error);
        throw error;
    }
};

// Always return the main connection regardless of branch
// Branch-specific collection routing is handled by the middleware
export const getConnection = () => {
    if (!mainConnection) {
        console.warn("DEBUG: Main connection not initialized yet");
        return null;
    }

    if (mainConnection.readyState !== 1) {
        console.warn(`DEBUG: Main connection not ready (State: ${mainConnection.readyState})`);
    }

    return mainConnection;
};

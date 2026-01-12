import mongoose from "mongoose";
import logger from "../logger.js";

const connections = {};

const options = {
    minPoolSize: 10,
    maxPoolSize: 100, // Reduced from 1000 to be safer for Atlas free tier
};

export const initConnections = async () => {
    let mainUri = process.env.NODE_ENV === "production"
        ? process.env.PROD_MONGODB_URI
        : process.env.NODE_ENV === "server"
            ? process.env.SERVER_MONGODB_URI
            : process.env.DEV_MONGODB_URI;

    let gandhidhamUri = process.env.NODE_ENV === "production"
        ? process.env.PROD_MONGODB_URI_GANDHIDHAM
        : process.env.NODE_ENV === "server"
            ? process.env.SERVER_MONGODB_URI_GANDHIDHAM
            : process.env.DEV_MONGODB_URI_GANDHIDHAM;

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
    gandhidhamUri = cleanUri(gandhidhamUri);

    if (mainUri) {
        const masked = mainUri.replace(/\/\/.*@/, "//USER:PASS@");
        console.log("DEBUG: Main MongoDB URI:", masked);
    }
    if (gandhidhamUri) {
        const masked = gandhidhamUri.replace(/\/\/.*@/, "//USER:PASS@");
        console.log("DEBUG: Gandhidham MongoDB URI:", masked);
    }

    if (!mainUri) {
        logger.error("No Main MongoDB URI found in environment variables!");
        throw new Error("Missing MONGODB_URI");
    }

    try {
        // Main Connection
        logger.info(`Connecting to Main database...`);
        const mainConn = mongoose.createConnection(mainUri, {
            ...options,
            bufferCommands: false, // Useful for debugging hangs, but might break some patterns
        });

        // Wait for Main connection to be ready
        await new Promise((resolve, reject) => {
            mainConn.once('open', () => {
                console.log(`✅ [PID:${process.pid}] Successfully connected to Main database`);
                logger.info(`Successfully connected to Main database on PID:${process.pid}`);
                resolve();
            });
            mainConn.on('error', (err) => {
                console.error(`❌ Main database connection error on PID:${process.pid}:`, err);
                logger.error(`Main database connection error on PID:${process.pid}:`, err);
                reject(err);
            });
        });

        connections["AHMEDABAD HO"] = mainConn;

        // GANDHIDHAM Connection
        if (gandhidhamUri) {
            logger.info("Connecting to GANDHIDHAM database...");
            const gandhidhamConn = mongoose.createConnection(gandhidhamUri, {
                ...options,
                bufferCommands: false,
            });

            // Wait for connection to be ready (with timeout)
            try {
                await Promise.race([
                    new Promise((resolve, reject) => {
                        gandhidhamConn.once('open', () => {
                            console.log(`✅ [PID:${process.pid}] Successfully connected to GANDHIDHAM database`);
                            logger.info(`Successfully connected to GANDHIDHAM database on PID:${process.pid}`);
                            resolve();
                        });
                        gandhidhamConn.on('error', (err) => {
                            logger.error(`GANDHIDHAM database connection error on PID:${process.pid}:`, err);
                            reject(err);
                        });
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("GANDHIDHAM connection timeout")), 10000))
                ]);

                // Connection successful, store it
                connections["GANDHIDHAM"] = gandhidhamConn;
                logger.info("GANDHIDHAM connection stored successfully");
            } catch (err) {
                logger.error(`GANDHIDHAM connection failed or timed out on PID:${process.pid}:`, err.message);
                console.error(`❌ GANDHIDHAM connection failed: ${err.message}`);
                // Don't store the failed connection, use main connection as fallback
                connections["GANDHIDHAM"] = mainConn;
                logger.warn("Using AHMEDABAD HO connection as fallback for GANDHIDHAM");
            }
        } else {
            logger.warn("PROD_MONGODB_URI_GANDHIDHAM not provided, using main database for Gandhidham branch");
            connections["GANDHIDHAM"] = mainConn;
        }
    } catch (error) {
        console.error("❌ Database connection initialization failed!");
        logger.error("Database connection initialization failed:", error);
        throw error;
    }
};

export const getConnection = (branch) => {
    console.log(`DEBUG: [getConnection] Requested branch: "${branch}"`);
    let conn = connections[branch];
    console.log(`DEBUG: [getConnection] Connection exists: ${!!conn}, ReadyState: ${conn?.readyState || 'N/A'}, Available connections:`, Object.keys(connections));

    // If branch connection doesn't exist or isn't connected, fallback to AHMEDABAD HO
    if (!conn || conn.readyState !== 1) {
        if (branch !== "AHMEDABAD HO") {
            const mainConn = connections["AHMEDABAD HO"];
            if (mainConn && mainConn.readyState === 1) {
                console.log(`DEBUG: Branch "${branch}" not ready, falling back to AHMEDABAD HO`);
                return mainConn;
            }
        }
    }

    if (!conn) {
        console.warn(`DEBUG: No connection found for branch: "${branch}". Available branches:`, Object.keys(connections));
        return null;
    }

    return conn;
};

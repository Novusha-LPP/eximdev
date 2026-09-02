import mongoose from "mongoose";
import dotenv from "dotenv";
import CountryModel from "../model/countryModel.mjs";

dotenv.config();

async function migrate() {
    try {
        console.log("Starting migration to uppercase all country names...");

        const MONGODB_URI ="mongodb://exim:I9y5bcMUHkGHpgq2@ac-oqmvpdw-shard-00-00.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-01.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-02.xya3qh0.mongodb.net:27017/exim?ssl=true&replicaSet=atlas-103rb8-shard-0&authSource=admin&retryWrites=true&w=majority";

        if (!MONGODB_URI) {
            console.error("No MongoDB URI found in environment variables.");
            process.exit(1);
        }

        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB.");

        const countries = await CountryModel.find({});
        console.log(`Found ${countries.length} countries to check.`);

        let updatedCount = 0;

        for (const country of countries) {
            const upperName = (country.name || "").toUpperCase();
            const upperCode = (country.code || "").toUpperCase();
            let changed = false;

            if (country.name !== upperName) {
                country.name = upperName;
                changed = true;
            }
            if (country.code !== upperCode) {
                country.code = upperCode;
                changed = true;
            }

            if (changed) {
                try {
                    await country.save();
                    updatedCount++;
                } catch (saveErr) {
                    console.error(`Failed to update country ${country._id} (name: ${upperName}, code: ${upperCode}):`, saveErr.message);
                }
            }
        }

        console.log(`Migration completed successfully.`);
        console.log(`Updated ${updatedCount} countries to uppercase.`);
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();

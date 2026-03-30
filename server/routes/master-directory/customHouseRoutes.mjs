import express from "express";
import CustomHouseModel from "../../model/customHouseModel.mjs";

const router = express.Router();

// GET all custom houses
router.get("/get-custom-houses", async (req, res) => {
    try {
        const customHouses = await CustomHouseModel.find().sort({ name: 1 });
        res.json(customHouses);
    } catch (error) {
        res.status(500).json({ message: "Error fetching custom houses", error: error.message });
    }
});

// ADD a new custom house
router.post("/add-custom-house", async (req, res) => {
    try {
        const { name, code } = req.body;
        
        // Check if code already exists
        const existing = await CustomHouseModel.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ message: "Custom House code already exists" });
        }

        const newCustomHouse = new CustomHouseModel({
            name,
            code: code.toUpperCase()
        });

        await newCustomHouse.save();
        res.status(201).json(newCustomHouse);
    } catch (error) {
        res.status(400).json({ message: "Error adding custom house", error: error.message });
    }
});

// UPDATE a custom house
router.put("/update-custom-house/:id", async (req, res) => {
    try {
        const { name, code, is_active } = req.body;
        const updated = await CustomHouseModel.findByIdAndUpdate(
            req.params.id,
            { name, code: code.toUpperCase(), is_active },
            { new: true }
        );
        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: "Error updating custom house", error: error.message });
    }
});

// SEED custom houses
router.post("/seed-custom-houses", async (req, res) => {
    try {
        const customHousesToSeed = [
            { name: "ICD SANAND", code: "INSAU6" },
            { name: "ICD SACHANA", code: "INJKA6" },
            { name: "ICD KHODIYAR", code: "INSBI6" },
            { name: "ICD VARANAMA", code: "INBRC5" },
            { name: "HAZIRA PORT", code: "INHZA1" },
            { name: "MUNDRA PORT", code: "INMUN1" }
        ];

        // Batch insert with ordered: false to skip duplicates
        const result = await CustomHouseModel.insertMany(customHousesToSeed, { ordered: false });
        res.json({ message: "Successfully seeded custom houses", count: result.length });
    } catch (error) {
        if (error.code === 11000 || (error.writeErrors && error.writeErrors.length > 0)) {
            const insertedCount = error.result?.nInserted || 0;
            res.json({ message: "Custom Houses partially seeded (skipped duplicates)", count: insertedCount });
        } else {
            res.status(500).json({ message: "Error seeding custom houses", error: error.message });
        }
    }
});

export default router;

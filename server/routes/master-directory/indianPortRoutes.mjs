import express from "express";
import IndianPortModel from "../../model/indianPortModel.mjs";

const router = express.Router();

// GET all Indian ports
router.get("/get-indian-ports", async (req, res) => {
    try {
        const ports = await IndianPortModel.find().sort({ port_code: 1 });
        res.json(ports);
    } catch (error) {
        res.status(500).json({ message: "Error fetching Indian ports", error: error.message });
    }
});

// ADD a new Indian port
router.post("/add-indian-port", async (req, res) => {
    try {
        const { port_code, address, place, pincode } = req.body;
        
        // Check if port code already exists
        const existingPort = await IndianPortModel.findOne({ port_code: port_code.toUpperCase() });
        if (existingPort) {
            return res.status(400).json({ message: "Port code already exists" });
        }

        const newPort = new IndianPortModel({
            port_code: port_code.toUpperCase(),
            address,
            place,
            pincode
        });

        await newPort.save();
        res.status(201).json(newPort);
    } catch (error) {
        res.status(400).json({ message: "Error adding Indian port", error: error.message });
    }
});

// UPDATE an Indian port
router.put("/update-indian-port/:id", async (req, res) => {
    try {
        const { port_code, address, place, pincode } = req.body;
        const updatedPort = await IndianPortModel.findByIdAndUpdate(
            req.params.id,
            { 
                port_code: port_code.toUpperCase(), 
                address, 
                place, 
                pincode 
            },
            { new: true }
        );
        res.json(updatedPort);
    } catch (error) {
        res.status(400).json({ message: "Error updating Indian port", error: error.message });
    }
});

// DELETE an Indian port
router.delete("/delete-indian-port/:id", async (req, res) => {
    try {
        await IndianPortModel.findByIdAndDelete(req.params.id);
        res.json({ message: "Indian port deleted successfully" });
    } catch (error) {
        res.status(400).json({ message: "Error deleting Indian port", error: error.message });
    }
});

export default router;

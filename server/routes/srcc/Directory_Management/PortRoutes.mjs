import express from "express";
import Port from "../../../model/srcc/Directory_Management/PortOfReporting.mjs";

const router = express.Router();

// 📌 1. Add a new port
router.post("/api/add-port", async (req, res) => {
  try {
    const data = { ...req.body };

    // Optional: convert custom_fields to a Map if needed
    if (data.custom_fields && typeof data.custom_fields === "object") {
      data.custom_fields = new Map(Object.entries(data.custom_fields));
    }

    const newPort = new Port(data);
    await newPort.save();

    res.status(201).json({ message: "Port added successfully!", port: newPort });
  } catch (error) {
    console.error("Error adding port:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 2. Get all ports
router.get("/api/get-port", async (req, res) => {
  try {
    const ports = await Port.find();
    res.json(ports);
  } catch (error) {
    console.error("Error fetching ports:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 3. Get a single port by ID
router.get("/api/get-port/:id", async (req, res) => {
  try {
    const port = await Port.findById(req.params.id);
    if (!port) {
      return res.status(404).json({ error: "Port not found" });
    }
    res.json(port);
  } catch (error) {
    console.error("Error fetching port:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 4. Update a port by ID
router.put("/api/update-port/:id", async (req, res) => {
  try {
    const data = { ...req.body };

    // Optional: convert custom_fields to a Map
    if (data.custom_fields && typeof data.custom_fields === "object") {
      data.custom_fields = new Map(Object.entries(data.custom_fields));
    }

    const updatedPort = await Port.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true }
    );

    if (!updatedPort) {
      return res.status(404).json({ error: "Port not found" });
    }

    res.json({
      message: "Port updated successfully!",
      port: updatedPort,
    });
  } catch (error) {
    console.error("Error updating port:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 5. Delete a port by ID
router.delete("/api/delete-port/:id", async (req, res) => {
  try {
    const deletedPort = await Port.findByIdAndDelete(req.params.id);
    if (!deletedPort) {
      return res.status(404).json({ error: "Port not found" });
    }
    res.json({ message: "Port deleted successfully!" });
  } catch (error) {
    console.error("Error deleting port:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/api/add-port-field", async (req, res) => {
    const { fieldName, fieldType } = req.body;
  
    if (!fieldName || !fieldType) {
      return res.status(400).json({ error: "Field name and type are required." });
    }
  
    // Transform field name: lowercase and replace spaces with underscores
    const transformedFieldName = fieldName.toLowerCase().replace(/\s+/g, '_');
  
    const defaultValues = {
      string: "",
      number: 0,
      boolean: false
    };
  
    const defaultValue = defaultValues[fieldType];
    if (defaultValue === undefined) {
      return res.status(400).json({ error: "Unsupported data type" });
    }
  
    try {
      await Port.updateMany(
        { [`custom_fields.${transformedFieldName}`]: { $exists: false } }, // don't override existing
        { $set: { [`custom_fields.${transformedFieldName}`]: defaultValue } }
      );
      
      // Return both the original and transformed field name for UI reference
      res.json({ 
        message: `Field "${fieldName}" added as "${transformedFieldName}" with default value.`,
        originalName: fieldName,
        transformedName: transformedFieldName
      });
    } catch (err) {
      console.error("Error adding custom field:", err);
      res.status(500).json({ error: "Server error" });
    }
  });
export default router;

import express from "express";
import ContainerType from "../../../model/srcc/containerType.mjs";

const router = express.Router();

/**
 * @route POST /api/add-container-type
 * @desc Create a new container type
 */
router.post("/api/add-container-type", async (req, res) => {
  const { name, iso_code, teu, outer_dimension, tare_weight, payload } =
    req.body;

  try {
    const existingContainer = await ContainerType.findOne({ iso_code });
    if (existingContainer) {
      return res
        .status(400)
        .json({ error: "Container type with this ISO code already exists" });
    }

    const newContainer = await ContainerType.create({
      name,
      iso_code,
      teu,
      outer_dimension,
      tare_weight,
      payload,
    });

    res.status(201).json({
      message: "Container Type added successfully",
      data: newContainer,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route GET /api/get-container-types
 * @desc Retrieve all container types
 */
router.get("/api/get-container-types", async (req, res) => {
  try {
    const containerTypes = await ContainerType.find();
    res.status(200).json(containerTypes);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route GET /api/get-container-type/:id
 * @desc Retrieve a single container type by ID
 */
router.get("/api/get-container-type/:id", async (req, res) => {
  try {
    const containerType = await ContainerType.findById(req.params.id);
    if (!containerType) {
      return res.status(404).json({ error: "Container type not found" });
    }
    res.status(200).json(containerType);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route PUT /api/update-container-type/:id
 * @desc Update an existing container type
 */
router.put("/api/update-container-type/:id", async (req, res) => {
  try {
    const { name, iso_code, teu, outer_dimension, tare_weight, payload } =
      req.body;

    const existingContainer = await ContainerType.findOne({
      iso_code,
      _id: { $ne: req.params.id },
    });

    if (existingContainer) {
      return res
        .status(400)
        .json({ error: "Container type with this ISO code already exists" });
    }

    const updatedContainer = await ContainerType.findByIdAndUpdate(
      req.params.id,
      { name, iso_code, teu, outer_dimension, tare_weight, payload },
      { new: true, runValidators: true }
    );

    if (!updatedContainer) {
      return res.status(404).json({ error: "Container type not found" });
    }

    res.status(200).json({
      message: "Container type updated successfully",
      data: updatedContainer,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route DELETE /api/delete-container-type/:id
 * @desc Delete a container type
 */
router.delete("/api/delete-container-type/:id", async (req, res) => {
  try {
    const deletedContainer = await ContainerType.findByIdAndDelete(
      req.params.id
    );
    if (!deletedContainer) {
      return res.status(404).json({ error: "Container type not found" });
    }
    res.status(200).json({ message: "Container type deleted successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

import express from "express";
import mongoose from "mongoose";
import ContainerType from "../../../model/srcc/containerType.mjs"; // Ensure correct path
import { authenticateJWT } from "../../../auth/auth.mjs";

const router = express.Router();

/**
 * @route POST /api/add-container-type
 * @desc Create a new container type
 */
router.post("/api/add-container-type",authenticateJWT, async (req, res) => {


  const {
    container_type,
    iso_code,
    teu,
    outer_dimension,
    cubic_capacity,
    tare_weight,
    payload,
    is_temp_controlled, // new field
    is_tank_container, // new field
    size, // new field
  } = req.body;

  try {
    if (!container_type) {
      return res.status(400).json({ error: "Container type is required" });
    }

    const existingContainer = await ContainerType.findOne({ iso_code });
    if (existingContainer) {
      return res
        .status(400)
        .json({ error: "Container type with this ISO code already exists" });
    }

    const newContainer = await ContainerType.create({
      container_type,
      iso_code,
      teu,
      outer_dimension,
      cubic_capacity, // added
      tare_weight,
      payload,
      is_temp_controlled, // added
      is_tank_container, // added
      size, // added
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
router.get("/api/get-container-types",authenticateJWT, async (req, res) => {
  try {
    const containerTypes = await ContainerType.find();
    res.status(200).json(containerTypes);
  } catch (error) {
    console.error("Error fetching container types:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route GET /api/get-container-type/:id
 * @desc Retrieve a single container type by ID
 */
router.get("/api/get-container-type/:id",authenticateJWT, async (req, res) => {
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
router.put("/api/update-container-type/:id",authenticateJWT, async (req, res) => {
  try {
    const {
      container_type,
      iso_code,
      teu,
      outer_dimension,
      cubic_capacity,
      tare_weight,
      payload,
      is_temp_controlled, // new field
      is_tank_container, // new field
      size, // new field
    } = req.body;

    if (!req.params.id) {
      return res.status(400).json({ error: "Container type ID is required" });
    }

    const updatedContainer = await ContainerType.findByIdAndUpdate(
      req.params.id,
      {
        container_type,
        iso_code,
        teu,
        outer_dimension,
        cubic_capacity, // added
        tare_weight,
        payload,
        is_temp_controlled, // added
        is_tank_container, // added
        size, // added
      },
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
router.delete("/api/delete-container-type/:id",authenticateJWT, async (req, res) => {
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

import express from "express";
import UserModel from "../../model/userModel.mjs";
import ImporterModel from "../../model/importerSchemaModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";
const router = express.Router();
router.post("/api/importers",authenticateJWT, async (req, res) => {
  const { name, contact, email, address } = req.body;

  // Validate input fields
  if (!name) {
    return res.status(400).send({ message: "Importer name is required" });
  }

  if (!email) {
    return res.status(400).send({ message: "Importer email is required" });
  }

  try {
    // Create a new importer
    const newImporter = new ImporterModel({ name, contact, email, address });

    // Save to the database
    await newImporter.save();

    // Send a success response
    res.status(201).send({
      message: "Importer created successfully",
      importer: newImporter,
    });
  } catch (error) {
    // Handle duplicate email error (MongoDB unique constraint)
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res
        .status(400)
        .send({ message: "Email already exists. Please use a unique email." });
    }

    // Handle other errors
    res.status(500).send({
      message: "An error occurred while creating the importer.",
      error: error.message,
    });
  }
});

router.get("/api/importers",authenticateJWT, async (req, res) => {
  try {
    const importers = await ImporterModel.find();
    res
      .status(200)
      .send({ message: "Importers fetched successfully", importers });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
});
router.patch("/api/importers/:id",authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { name, contact, email, address } = req.body;

  try {
    const importer = await ImporterModel.findById(id);
    if (!importer) {
      return res.status(404).send({ message: "Importer not found" });
    }

    // Update fields if provided in the request body
    if (name) importer.name = name;
    if (contact) importer.contact = contact;
    if (email) importer.email = email;
    if (address) importer.address = address;

    await importer.save();

    res
      .status(200)
      .send({ message: "Importer updated successfully", importer });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
});

router.delete("/api/importers/:id",authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const importer = await ImporterModel.findByIdAndDelete(id);
    if (!importer) {
      return res.status(404).send({ message: "Importer not found" });
    }
    res.status(200).send({ message: "Importer deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
});

// PATCH API to assign importers to a user
router.patch("/api/users/:userId/importers",authenticateJWT, async (req, res) => {
  const { userId } = req.params;
  const { importers } = req.body; // Array of importer names to assign

  if (!importers || !Array.isArray(importers)) {
    return res
      .status(400)
      .send({ message: "Importers must be an array of valid names." });
  }

  try {
    // Find the user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Assign the importer names to the user
    user.assigned_importer_name = importers;
    await user.save();

    res.status(200).send({
      message: "Importers assigned successfully to the user.",
      
    });
  } catch (error) {
    console.error("Error assigning importers:", error);
    res.status(500).send({
      message: "Failed to assign importers. Please try again.",
      error: error.message,
    });
  }
});

// GET API to fetch a user with assigned importers
router.get("/api/users/:userId",authenticateJWT, async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await UserModel.findById(userId).populate(
      "assigned_importer",
      "name"
    );

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    res.status(200).send({ message: "User fetched successfully.", user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .send({ message: "Failed to fetch user.", error: error.message });
  }
});

export default router;

import express from "express";
import ExitInteViewModel from "../../model/exitInterviewModel.mjs";

const router = express.Router();

router.post("/api/add-exit-interview", async (req, res) => {
  try {
    // Create a new instance of the model
    const exitInterview = new ExitInteViewModel();

    // Assign all properties from req.body to the model instance
    Object.assign(exitInterview, req.body);

    // Save the instance to the database
    await exitInterview.save();

    // Send success response
    res.status(201).json({
      message: "Exit interview added successfully",
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "An error occurred while adding the exit interview" });
  }
});

export default router;

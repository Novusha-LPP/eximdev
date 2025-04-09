import express from "express";
import PrData from "../../model/srcc/pr.mjs";

const router = express.Router();

router.post("/api/update-srcc-dsr", async (req, res) => {
  const { tr_no, status, lr_completed } = req.body; // Get tr_no, status, and lr_completed from the request body

  try {
    // Update the status and lr_completed fields in the container with the matching tr_no
    const updateFields = { "containers.$.status": status };
    if (lr_completed !== undefined) {
      updateFields["containers.$.lr_completed"] = lr_completed;
    }

    const updatedDocument = await PrData.findOneAndUpdate(
      { "containers.tr_no": tr_no }, // Find the document with the matching tr_no
      { $set: updateFields }, // Update the fields in the matched container
      { new: true } // Return the updated document
    );

    if (updatedDocument) {
      // If a document is updated, return it as a response
      res
        .status(200)
        .json({ message: "Updated successfully", data: updatedDocument });
    } else {
      // If no document is found, return an appropriate response
      res.status(404).json({ message: "Document not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

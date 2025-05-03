import express from "express";
import InwardRegisterModel from "../../model/inwardRegisterModel.mjs";

const router = express.Router();

router.post("/api/handle-status", async (req, res) => {
  const { param, _id } = req.body;

  // Map `param` to the database field to update
  const fieldToUpdate =
    param === "courier_handed_over"
      ? "courier_handed_over"
      : "courier_received";

  try {
    // Find the document by ID and update it
    const updatedDocument = await InwardRegisterModel.findByIdAndUpdate(
      { _id },
      { $set: { [fieldToUpdate]: "Done" } }, // Dynamically set the field to "Done"
      { new: true } // Return the updated document
    );

    // Check if the document was successfully updated
    if (updatedDocument) {
      res.status(200).send({ message: "Updated successfully" });
    } else {
     
      res.status(404).send("Document not found");
    }
  } catch (error) {
    console.error(`Error updating document: ${error}`);
    res.status(500).send("Error updating document");
  }
});

export default router;

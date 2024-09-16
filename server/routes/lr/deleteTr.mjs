import express from "express";
import PrData from "../../model/srcc/pr.mjs";
import Tr from "../../model/srcc/trModel.mjs";

const router = express.Router();

router.post("/api/delete-tr", async (req, res) => {
  const { pr_no, tr_no, container_number } = req.body;

  try {
    // Find the document with matching pr_no
    const prData = await PrData.findOne({ pr_no });

    // Check if the document exists
    if (!prData) {
      return res.status(404).send({ error: "PR document not found" });
    }

    const lastTr = await Tr.findOne({}).sort({ _id: -1 });

    // If tr_no is at last index, remove it
    if (tr_no && tr_no.split("/")[2] === lastTr.tr_no) {
      // Delete the lastTr from the database
      await lastTr.remove();
    }

    // Find and remove the container if it exists
    let containerIndex = -1;
    prData.containers.forEach((container, index) => {
      if (
        (tr_no && container.tr_no === tr_no) ||
        container.container_number === container_number ||
        (!tr_no && !container.tr_no)
      ) {
        containerIndex = index;
      }
    });

    // If container found, remove it and save the document
    if (containerIndex !== -1) {
      prData.containers.splice(containerIndex, 1);

      // Update container_count by decreasing it by 1
      prData.container_count = String(parseInt(prData.container_count) - 1);

      await prData.save();
      return res
        .status(200)
        .send({ message: "Container deleted successfully" });
    } else {
      return res.status(404).send({ error: "Container not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;

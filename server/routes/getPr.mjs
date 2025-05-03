import express from "express";
import PrData from "../model/pr.mjs";
import { authenticateJWT } from "../auth/auth.mjs";
const router = express.Router();

router.get("/api/getPrData/:branch", authenticateJWT, async (req, res) => {
  const { branch } = req.params;

  try {
    const prDataArray = await PrData.find({});

    let matchingBranchCode = prDataArray;

    // If branch is not empty, filter by branch code
    if (branch !== "all") {
      matchingBranchCode = prDataArray.filter((doc) => {
        // Extract branch code from pr_no
        const prBranchCode = doc.pr_no.split("/")[1];

        // Compare branch code from pr_no with branch from request parameters
        return prBranchCode === branch;
      });
    }

    // Filter out documents based on the conditions
    const filteredPrDataArray = matchingBranchCode.filter((doc) => {
      // Condition 1: No containers array present
      if (!doc.containers) {
        return true;
      }
      // Condition 2: Containers array length is 0
      if (doc.containers.length === 0) {
        return true;
      }
      // Condition 3: At least one container does not have tr_no
      return doc.containers.some((container) => !container.tr_no);
    });

    const prDataMap = filteredPrDataArray.reduce((map, doc) => {
      map.set(doc.pr_no, doc); // Use pr_no as the key, will automatically keep only the document at the later index
      return map;
    }, new Map());

    res.status(200).json([...prDataMap.values()]); // Convert map values back to an array for response
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

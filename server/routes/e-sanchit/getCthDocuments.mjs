import express from "express";
import DocumentListModel from "../../model/cthDocumentsModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-cth-docs/:cth_no",authenticateJWT, async (req, res) => {
  const { cth_no } = req.params;

  if (isNaN(parseInt(cth_no, 10))) {
    return res.status(200).send("Invalid CTH number");
  } else {
    const data = await DocumentListModel.find({ cth: parseInt(cth_no) });

    if (!data) {
      return res.status(200).send("Data not found");
    }
    res.status(200).json(data);
  }
});

export default router;

import express from "express";
import CcModel from "../../model/accounts/creditCardModel.mjs";

const router = express.Router();

router.post("/api/add-cc", (req, res) => {
  const data = new CcModel(req.body);
  data
    .save()
    .then(() => {
      res.send({ message: "Data added successfully" });
    })
    .catch((error) => {
      res.send(error);
    });
});

export default router;

import express from "express";
import AmcModel from "../../model/accounts/amcModel.mjs";

const router = express.Router();

router.post("/api/add-amc", (req, res) => {
  const data = new AmcModel(req.body);
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

import express from "express";
import LicModel from "../../model/accounts/LicModel.mjs";

const router = express.Router();

router.post("/api/add-lic", (req, res) => {
  const data = new LicModel(req.body);
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

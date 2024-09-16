import express from "express";
import ElectricityModel from "../../model/accounts/ElectricityModel.mjs";

const router = express.Router();

router.post("/api/add-electricity", (req, res) => {
  const data = new ElectricityModel(req.body);
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

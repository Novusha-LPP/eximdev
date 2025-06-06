import express from "express";
import RentModel from "../../model/accounts/rentModel.mjs";

const router = express.Router();

router.post("/api/add-rent", (req, res) => {
  const data = new RentModel(req.body);
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

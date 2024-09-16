import express from "express";
import MobileModel from "../../model/accounts/mobileModel.mjs";

const router = express.Router();

router.post("/api/add-mobile", (req, res) => {
  const data = new MobileModel(req.body);
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

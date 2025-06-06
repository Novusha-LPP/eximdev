import express from "express";
import FdModel from "../../model/accounts/fdModel.mjs";

const router = express.Router();

router.post("/api/add-fd", (req, res) => {
  const data = new FdModel(req.body);
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

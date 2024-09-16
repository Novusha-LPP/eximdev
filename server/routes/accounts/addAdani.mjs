import express from "express";
import AdaniModel from "../../model/accounts/adaniModel.mjs";

const router = express.Router();

router.post("/api/add-adani", (req, res) => {
  const data = new AdaniModel(req.body);
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

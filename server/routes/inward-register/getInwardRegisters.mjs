import express from "express";
import InwardRegisterModel from "../../model/inwardRegisterModel.mjs";

const router = express.Router();

router.post("/api/get-inward-registers", async (req, res) => {
  const { first_name, middle_name, last_name } = req.body;
  const contact_person_name = [first_name, middle_name, last_name]
    .filter(Boolean)
    .join(" ");

  try {
    const inwardRegisterData = await InwardRegisterModel.find({
      contact_person_name,
    });
    res.status(200).json(inwardRegisterData);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;

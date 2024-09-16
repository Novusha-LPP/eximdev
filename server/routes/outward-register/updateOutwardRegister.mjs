import express from "express";
import OutwardRegisterModel from "../../model/outwardRegisterModel.mjs";

const router = express.Router();

router.post("/api/update-outward-register/:_id", async (req, res) => {
  const { _id } = req.params;
  const { weight, docket_no, outward_consignment_photo, courier_details } =
    req.body;

  try {
    await OutwardRegisterModel.updateOne(
      { _id },
      {
        $set: {
          weight,
          docket_no,
          outward_consignment_photo,
          courier_details,
        },
      }
    );

    res.status(200).json({ message: "Outward register updated successfully" });
  } catch (err) {
    console.log(err);
  }
});

export default router;

import express from "express";
import OutwardRegisterModel from "../../model/outwardRegisterModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();

router.put("/api/update-outward-register/:id", authMiddleware, auditMiddleware("outwardRegister"), async (req, res) => {
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

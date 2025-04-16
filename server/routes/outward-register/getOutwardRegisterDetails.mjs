import express from "express";
import OutwardRegisterModel from "../../model/outwardRegisterModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-outward-register-details/:id",authenticateJWT, async (req, res) => {
  const { id } = req.params;

  const data = await OutwardRegisterModel.findById(id);
  res.status(200).json(data);
});

export default router;

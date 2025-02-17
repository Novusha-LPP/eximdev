import express from "express";
import ContainerType from "../../model/srcc/containerType.mjs";

const router = express.Router();

// router.post("/api/add-container-type", async (req, res) => {
//   const { container_type } = req.body;
//   console.log(container_type);
//   try {
//     await ContainerType.create({ container_type });
//     res.status(201).json({ message: "Container Type added successfully" });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

export default router;

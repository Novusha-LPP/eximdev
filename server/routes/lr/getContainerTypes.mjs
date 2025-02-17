import express from "express";
import ContainerType from "../../model/srcc/containerType.mjs";

const router = express.Router();

// router.get("/api/get-container-types", async (req, res) => {
//   try {
//     const containerTypes = await ContainerType.find({});
//     const containerTypeArray = containerTypes.map(
//       (type) => type.container_type
//     );
//     res.status(201).json(containerTypeArray);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

export default router;

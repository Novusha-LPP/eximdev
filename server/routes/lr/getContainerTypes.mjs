import express from "express";
import ContainerType from "../../model/srcc/containerType.mjs";

const router = express.Router();

// This route has been moved to ContainerTypeRoute.mjs with proper populate functionality
// router.get("/api/get-container-types", async (req, res) => {
//   try {
//     const containerTypes = await ContainerType.find({});
//     // Return the full container type objects with ObjectIds
//     res.status(200).json(containerTypes);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

export default router;

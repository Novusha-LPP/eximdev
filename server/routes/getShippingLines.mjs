import express from "express";
// JobModel is now attached to req by branchJobMiddleware

const router = express.Router();

router.get("/api/get-shipping-lines/:year", async (req, res) => {
  try {
    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

    const selectedYear = req.params.year;

    // Use Mongoose aggregation to group and retrieve unique importer and importerURL values
    const uniqueShippingLines = await JobModel.aggregate([
      {
        $match: { year: selectedYear }, // Filter documents by year
      },
      {
        $group: {
          _id: { shipping_line_airline: "$shipping_line_airline" },
        },
      },
      {
        $project: {
          _id: 0, // Exclude the default _id field
          shipping_line_airline: "$_id.shipping_line_airline",
        },
      },
      {
        $sort: {
          shipping_line_airline: 1, // Sort importer in ascending order (alphabetical)
        },
      },
    ]);

    res.status(200).json(uniqueShippingLines);
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while fetching importers.");
  }
});

export default router;

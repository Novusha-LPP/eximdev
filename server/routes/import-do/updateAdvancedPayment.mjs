import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

router.patch(
    "/api/update-advanced-payment/:id",
    auditMiddleware("Job"),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { advanced_payment_done, username } = req.body;

            if (typeof advanced_payment_done !== "boolean") {
                return res
                    .status(400)
                    .json({ message: "Invalid value for advanced_payment_done" });
            }

            const updateFields = {
                advanced_payment_done,
                advanced_payment_date: advanced_payment_done ? new Date() : null,
                advanced_payment_by: advanced_payment_done ? username : null,
            };

            const updatedJob = await JobModel.findByIdAndUpdate(
                id,
                { $set: updateFields },
                { new: true }
            );

            if (!updatedJob) {
                return res.status(404).json({ message: "Job not found" });
            }

            res.status(200).json({
                message: "Advanced payment status updated successfully",
                job: updatedJob,
            });
        } catch (error) {
            console.error("Error updating advanced payment:", error);
            res
                .status(500)
                .json({ message: "Internal Server Error", error: error.message });
        }
    }
);

export default router;

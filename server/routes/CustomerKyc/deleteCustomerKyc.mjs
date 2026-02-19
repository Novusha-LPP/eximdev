import express from "express";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";

const deleteCustomerKyc = express.Router();

deleteCustomerKyc.delete("/api/delete-customer-kyc/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deletedKyc = await CustomerKycModel.findByIdAndDelete(id);

        if (!deletedKyc) {
            return res.status(404).json({ message: "Application not found" });
        }

        res.status(200).json({ message: "Application deleted successfully" });
    } catch (error) {
        console.error("Error deleting Customer KYC:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default deleteCustomerKyc;

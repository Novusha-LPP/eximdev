import express from "express";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";

const router = express.Router();

// Helper to generate a unique training reference code
const generateUniqueTrainingCode = async () => {
  let isUnique = false;
  let code = "";
  
  while (!isUnique) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    code = `TRN-${dateStr}-${randStr}`;
    
    // Check if code already exists under any customer's trainings
    const existing = await CustomerKycModel.findOne({ "trainings.training_code": code });
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code;
};

// GET /api/customer-trainings: Get all trainings across all customers
router.get("/api/customer-trainings", async (req, res) => {
  try {
    const customers = await CustomerKycModel.find({ trainings: { $exists: true, $not: { $size: 0 } } })
      .select("name_of_individual iec_no trainings")
      .lean();

    const allTrainings = [];
    customers.forEach(customer => {
      if (customer.trainings && Array.isArray(customer.trainings)) {
        customer.trainings.forEach(tr => {
          allTrainings.push({
            ...tr,
            customerId: customer._id,
            customerName: customer.name_of_individual,
            customerIec: customer.iec_no
          });
        });
      }
    });

    // Sort by training date descending
    allTrainings.sort((a, b) => new Date(b.training_date) - new Date(a.training_date));

    res.json(allTrainings);
  } catch (error) {
    console.error("Error fetching all training records:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/customer-trainings/customers: Get non-draft customer names & IDs for selection dropdown
router.get("/api/customer-trainings/customers", async (req, res) => {
  try {
    const customers = await CustomerKycModel.find({ draft: { $ne: "true" } })
      .select("name_of_individual iec_no udyam_no")
      .sort({ name_of_individual: 1 })
      .lean();
    res.json(customers);
  } catch (error) {
    console.error("Error fetching customers for dropdown:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/customer-trainings: Create a new training record
router.post("/api/customer-trainings", async (req, res) => {
  try {
    const { customerId, ...trainingData } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: "Customer ID is required" });
    }

    const customer = await CustomerKycModel.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Auto-generate unique training code
    const training_code = await generateUniqueTrainingCode();

    const newTraining = {
      ...trainingData,
      training_code
    };

    customer.trainings.push(newTraining);

    // If new training is Completed, auto-populate udyam_no
    if (newTraining.training_status === "Completed") {
      customer.udyam_no = training_code;
    }

    await customer.save();

    res.status(201).json({
      message: "Training record added successfully",
      training: customer.trainings[customer.trainings.length - 1]
    });
  } catch (error) {
    console.error("Error adding training record:", error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/customer-trainings/:trainingId: Update an existing training record
router.put("/api/customer-trainings/:trainingId", async (req, res) => {
  try {
    const { trainingId } = req.params;
    const { customerId, ...updateFields } = req.body;

    // Find the customer that owns this training session
    const customer = await CustomerKycModel.findOne({ "trainings._id": trainingId });
    if (!customer) {
      return res.status(404).json({ message: "Training record or customer not found" });
    }

    const training = customer.trainings.id(trainingId);
    if (!training) {
      return res.status(404).json({ message: "Training record not found" });
    }

    // Update the subdocument fields
    Object.assign(training, updateFields);

    // Sync udyam_no with the Completed training status
    if (training.training_status === "Completed") {
      customer.udyam_no = training.training_code;
    } else {
      const otherCompleted = customer.trainings.find(t => t.training_status === "Completed" && String(t._id) !== String(trainingId));
      if (otherCompleted) {
        customer.udyam_no = otherCompleted.training_code;
      } else if (customer.udyam_no === training.training_code) {
        customer.udyam_no = ""; // Clear if this was the active udyam code
      }
    }

    await customer.save();

    res.json({
      message: "Training record updated successfully",
      training
    });
  } catch (error) {
    console.error("Error updating training record:", error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/customer-trainings/:trainingId: Delete an existing training record
router.delete("/api/customer-trainings/:trainingId", async (req, res) => {
  try {
    const { trainingId } = req.params;

    // Find customer by subdocument ID
    const customer = await CustomerKycModel.findOne({ "trainings._id": trainingId });
    if (!customer) {
      return res.status(404).json({ message: "Training record or customer not found" });
    }

    const trainingToDelete = customer.trainings.id(trainingId);
    const codeToDelete = trainingToDelete ? trainingToDelete.training_code : "";

    customer.trainings.pull({ _id: trainingId });

    // If deleted training was the one populating udyam_no, fallback or clear
    if (customer.udyam_no === codeToDelete) {
      const otherCompleted = customer.trainings.find(t => t.training_status === "Completed");
      customer.udyam_no = otherCompleted ? otherCompleted.training_code : "";
    }

    await customer.save();

    res.json({ message: "Training record deleted successfully" });
  } catch (error) {
    console.error("Error deleting training record:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;

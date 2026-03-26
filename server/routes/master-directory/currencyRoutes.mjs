import express from "express";
import CurrencyModel from "../../model/currencyModel.mjs";

const router = express.Router();

// Get all currencies
router.get("/get-currencies", async (req, res) => {
  try {
    const currencies = await CurrencyModel.find().sort({ name: 1 });
    res.status(200).json(currencies);
  } catch (error) {
    res.status(500).json({ message: "Error fetching currencies", error });
  }
});

// Add new currency
router.post("/add-currency", async (req, res) => {
  try {
    const { name, code, country } = req.body;
    const newCurrency = new CurrencyModel({ name, code, country });
    await newCurrency.save();
    res.status(201).json(newCurrency);
  } catch (error) {
    res.status(500).json({ message: "Error adding currency", error });
  }
});

// Update currency
router.put("/update-currency/:id", async (req, res) => {
  try {
    const updatedCurrency = await CurrencyModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json(updatedCurrency);
  } catch (error) {
    res.status(500).json({ message: "Error updating currency", error });
  }
});

// Delete currency
router.delete("/delete-currency/:id", async (req, res) => {
  try {
    await CurrencyModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Currency deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting currency", error });
  }
});

export default router;

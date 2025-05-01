import express from "express";
import Currency from "../../../model/srcc/Directory_Management/Currency.mjs";

const router = express.Router();

// 📌 1. Add a new country
router.post("/api/add-currency", async (req, res) => {
  try {
    const newCurrency = new Currency(req.body);
    await newCurrency.save();
    res
      .status(201)
      .json({ message: "Currency added successfully!", country: newCurrency });
  } catch (error) {
    console.error("Error adding currency:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 2. Get all currency
router.get("/api/get-currency", async (req, res) => {
  try {
    const countries = await Currency.find();
    res.json(countries);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 3. Get a single currency by ID
router.get("/api/get-currency/:id", async (req, res) => {
  try {
    const currency = await Currency.findById(req.params.id);
    if (!currency) {
      return res.status(404).json({ error: "Currency not found" });
    }
    res.json(currency);
  } catch (error) {
    console.error("Error fetching currency:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 4. Update a currency by ID
router.put("/api/update-currency/:id", async (req, res) => {
  try {
    const updatedCurrency = await Currency.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedCurrency) {
      return res.status(404).json({ error: "Currency not found" });
    }
    res.json({
      message: "Currency updated successfully!",
      country: updatedCurrency,
    });
  } catch (error) {
    console.error("Error updating country:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 5. Delete a country by ID
router.delete("/api/delete-currency/:id", async (req, res) => {
  try {
    const deletedCurrency = await Currency.findByIdAndDelete(req.params.id);
    if (!deletedCurrency) {
      return res.status(404).json({ error: "Currency not found" });
    }
    res.json({ message: "Currency deleted successfully!" });
  } catch (error) {
    console.error("Error deleting currency:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

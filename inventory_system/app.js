const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect('mongodb://0.0.0.0:27017/inventory_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define Item Schema
const itemSchema = new mongoose.Schema({
    itemId: { type: String, required: true, unique: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    category: { type: String, required: true },
    warrantyStartDate: { type: Date, required: true },
    warrantyEndDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Create Item Model
const Item = mongoose.model('Item', itemSchema);

// API Routes

// Get all items
app.get('/api/items', async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a single item by ID
app.get('/api/items/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new item
app.post('/api/items', async (req, res) => {
    const item = new Item({
        itemId: req.body.itemId,
        brand: req.body.brand,
        model: req.body.model,
        category: req.body.category,
        warrantyStartDate: req.body.warrantyStartDate,
        warrantyEndDate: req.body.warrantyEndDate
    });

    try {
        const newItem = await item.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update an item
app.put('/api/items/:id', async (req, res) => {
    try {
        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id,
            {
                itemId: req.body.itemId,
                brand: req.body.brand,
                model: req.body.model,
                category: req.body.category,
                warrantyStartDate: req.body.warrantyStartDate,
                warrantyEndDate: req.body.warrantyEndDate
            },
            { new: true }
        );

        if (!updatedItem) return res.status(404).json({ message: 'Item not found' });
        res.json(updatedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete an item
app.delete('/api/items/:id', async (req, res) => {
    try {
        const item = await Item.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json({ message: 'Item deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

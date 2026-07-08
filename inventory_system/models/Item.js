const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    itemId: { type: String, required: true, unique: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    category: { type: String, required: true },
    warrantyStartDate: { type: Date, required: true },
    warrantyEndDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', itemSchema);

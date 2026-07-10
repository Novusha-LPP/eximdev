const mongoose = require('mongoose');
const Item = require('./models/Item'); // Make sure to create this model file

// Connect to MongoDB
mongoose.connect('mongodb://0.0.0.0:27017/inventory_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Sample data
const sampleItems = [
    {
        itemId: 'ITM001',
        brand: 'Dell',
        model: 'OptiPlex 5050',
        category: 'Desktop Computer',
        warrantyStartDate: '2023-01-15',
        warrantyEndDate: '2025-01-15'
    },
    {
        itemId: 'ITM002',
        brand: 'HP',
        model: 'EliteBook 840',
        category: 'Laptop',
        warrantyStartDate: '2023-02-20',
        warrantyEndDate: '2025-02-20'
    },
    {
        itemId: 'ITM003',
        brand: 'Canon',
        model: 'ImageClass LBP6030w',
        category: 'Printer',
        warrantyStartDate: '2023-03-10',
        warrantyEndDate: '2025-03-10'
    },
    {
        itemId: 'ITM004',
        brand: 'Samsung',
        model: 'Galaxy Tab S7',
        category: 'Tablet',
        warrantyStartDate: '2023-04-05',
        warrantyEndDate: '2025-04-05'
    }
];

// Function to insert sample data
async function insertSampleData() {
    try {
        // Clear existing items
        await Item.deleteMany({});
        console.log('Cleared existing items');

        // Insert sample items
        const insertedItems = await Item.insertMany(sampleItems);
        console.log(`${insertedItems.length} sample items inserted`);

        // Close the connection
        mongoose.connection.close();
        console.log('Database connection closed');
    } catch (err) {
        console.error('Error inserting sample data:', err);
        mongoose.connection.close();
    }
}

// Run the function
insertSampleData();

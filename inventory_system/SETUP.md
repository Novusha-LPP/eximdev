# Inventory Management System - Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 14 or higher)
- MongoDB (version 4.4 or higher)
- npm (comes with Node.js)

## Setup Instructions

1. **Clone or download the project** to your local machine.

2. **Install dependencies**:
   ```
   cd inventory_system
   npm install
   ```

3. **Start MongoDB**:
   - Make sure MongoDB is installed and running on your system.
   - By default, the application connects to MongoDB at `mongodb://0.0.0.0:27017/inventory_db`.
   - If your MongoDB is running on a different host or port, update the connection string in `app.js`.

4. **Insert sample data (optional)**:
   ```
   node setup.js
   ```
   This will insert some sample inventory items into the database.

5. **Run the application**:
   ```
   npm start
   ```
   The server will start on port 3000.

6. **Access the application**:
   Open your web browser and navigate to `http://0.0.0.0:3000`.

## Using the Application

### Adding a New Item
1. Fill in the form on the left side of the page with the item details:
   - Item ID / Asset ID
   - Brand
   - Model
   - Category
   - Warranty Start Date
   - Warranty End Date
2. Click the "Add Item" button.

### Viewing Items
- All items are displayed in the table on the right side of the page.
- Click the "Refresh" button to reload the items.

### Editing an Item
1. Click the "Edit" button next to the item you want to modify.
2. Make the necessary changes in the modal that appears.
3. Click "Update Item" to save the changes.

### Deleting an Item
1. Click the "Delete" button next to the item you want to remove.
2. Confirm the deletion in the dialog box.

## API Endpoints

The application provides the following API endpoints:

- `GET /api/items` - Retrieve all items
- `GET /api/items/:id` - Retrieve a specific item by ID
- `POST /api/items` - Create a new item
- `PUT /api/items/:id` - Update an existing item
- `DELETE /api/items/:id` - Delete an item

## Troubleshooting

### MongoDB Connection Issues
If you encounter connection errors, ensure:
- MongoDB is running
- The connection string in `app.js` is correct
- The specified database exists

### Port Already in Use
If you get an error indicating that port 3000 is already in use, you can change the port in `app.js`:
```javascript
const PORT = process.env.PORT || 3001; // Change to a different port
```

## Project Structure

```
inventory_system/
├── app.js              # Main application file
├── models/             # Mongoose models
│   └── Item.js        # Item model
├── public/            # Frontend files
│   ├── index.html     # Main HTML file
│   └── app.js         # Frontend JavaScript
├── setup.js           # Script to insert sample data
├── package.json       # Project dependencies
├── .gitignore         # Git ignore file
└── README.md          # Project information
```

## License

This project is for educational purposes.

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const itemForm = document.getElementById('itemForm');
    const editForm = document.getElementById('editForm');
    const itemsTableBody = document.getElementById('itemsTableBody');
    const refreshBtn = document.getElementById('refreshBtn');
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));

    // API Base URL
    const API_URL = '/api/items';

    // Event Listeners
    itemForm.addEventListener('submit', handleAddItem);
    editForm.addEventListener('submit', handleEditItem);
    refreshBtn.addEventListener('click', fetchItems);

    // Initial fetch of items
    fetchItems();

    // Functions

    /**
     * Handle adding a new item
     */
    async function handleAddItem(e) {
        e.preventDefault();

        const itemData = {
            itemId: document.getElementById('itemId').value,
            brand: document.getElementById('brand').value,
            model: document.getElementById('model').value,
            category: document.getElementById('category').value,
            warrantyStartDate: document.getElementById('warrantyStartDate').value,
            warrantyEndDate: document.getElementById('warrantyEndDate').value
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            });

            if (!response.ok) {
                throw new Error('Failed to add item');
            }

            const newItem = await response.json();
            showToast('Item added successfully', 'success');
            itemForm.reset();
            fetchItems();
        } catch (error) {
            showToast('Error adding item: ' + error.message, 'danger');
        }
    }

    /**
     * Handle editing an existing item
     */
    async function handleEditItem(e) {
        e.preventDefault();

        const itemId = document.getElementById('editId').value;
        const itemData = {
            itemId: document.getElementById('editItemId').value,
            brand: document.getElementById('editBrand').value,
            model: document.getElementById('editModel').value,
            category: document.getElementById('editCategory').value,
            warrantyStartDate: document.getElementById('editWarrantyStartDate').value,
            warrantyEndDate: document.getElementById('editWarrantyEndDate').value
        };

        try {
            const response = await fetch(`${API_URL}/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(itemData)
            });

            if (!response.ok) {
                throw new Error('Failed to update item');
            }

            const updatedItem = await response.json();
            showToast('Item updated successfully', 'success');
            editModal.hide();
            fetchItems();
        } catch (error) {
            showToast('Error updating item: ' + error.message, 'danger');
        }
    }

    /**
     * Fetch all items from the API
     */
    async function fetchItems() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('Failed to fetch items');
            }

            const items = await response.json();
            renderItems(items);
        } catch (error) {
            showToast('Error fetching items: ' + error.message, 'danger');
        }
    }

    /**
     * Render items in the table
     */
    function renderItems(items) {
        itemsTableBody.innerHTML = '';

        items.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.itemId}</td>
                <td>${item.brand}</td>
                <td>${item.model}</td>
                <td>${item.category}</td>
                <td>${new Date(item.warrantyStartDate).toLocaleDateString()}</td>
                <td>${new Date(item.warrantyEndDate).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editItem('${item._id}')">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteItem('${item._id}')">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            `;
            itemsTableBody.appendChild(row);
        });
    }

    /**
     * Edit an item
     */
    async function editItem(id) {
        try {
            const response = await fetch(`${API_URL}/${id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch item');
            }

            const item = await response.json();

            // Populate edit form
            document.getElementById('editId').value = item._id;
            document.getElementById('editItemId').value = item.itemId;
            document.getElementById('editBrand').value = item.brand;
            document.getElementById('editModel').value = item.model;
            document.getElementById('editCategory').value = item.category;
            document.getElementById('editWarrantyStartDate').value = item.warrantyStartDate.split('T')[0];
            document.getElementById('editWarrantyEndDate').value = item.warrantyEndDate.split('T')[0];

            // Show modal
            editModal.show();
        } catch (error) {
            showToast('Error fetching item: ' + error.message, 'danger');
        }
    }

    /**
     * Delete an item
     */
    async function deleteItem(id) {
        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete item');
            }

            showToast('Item deleted successfully', 'success');
            fetchItems();
        } catch (error) {
            showToast('Error deleting item: ' + error.message, 'danger');
        }
    }

    /**
     * Show a toast notification
     */
    function showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = 'toast-' + Date.now();

        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);

        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 5000
        });

        toast.show();

        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
});

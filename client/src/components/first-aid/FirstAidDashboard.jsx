import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import firstAidAPI from '../../api/firstAid.api';
import FirstAidChecklistForm from './FirstAidChecklistForm';
import toast from 'react-hot-toast';
import { CircularProgress } from '@mui/material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import moment from 'moment';
import './firstAid.css';

function FirstAidDashboard() {
    const { user } = useContext(UserContext);
    const isRabs = user?.company && /RABS/i.test(user.company);
    const isAdminOrHod = user?.role === 'Admin' || user?.role === 'Head_of_Department' || user?.role === 'HOD' || user?.isHOD;
    const hasAccess = isRabs && isAdminOrHod;

    const [activeTab, setActiveTab] = useState('checklists');
    const [checklists, setChecklists] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingChecklists, setLoadingChecklists] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState(null);

    // Filter states
    const [filterMonth, setFilterMonth] = useState(moment().format('YYYY-MM'));
    const [filterArea, setFilterArea] = useState('');
    const [showAllMonths, setShowAllMonths] = useState(false);

    // Navigation state
    const [selectedChecklistId, setSelectedChecklistId] = useState(null);

    // Modal state for adding product
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductGenericName, setNewProductGenericName] = useState('');
    const [newProductPurpose, setNewProductPurpose] = useState('');
    const [newProductTotalStock, setNewProductTotalStock] = useState('');
    const [submittingProduct, setSubmittingProduct] = useState(false);

    // Modal state for editing product
    const [showEditProductModal, setShowEditProductModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null); // { _id, name, status }
    const [editProductName, setEditProductName] = useState('');
    const [editProductGenericName, setEditProductGenericName] = useState('');
    const [editProductPurpose, setEditProductPurpose] = useState('');
    const [editProductTotalStock, setEditProductTotalStock] = useState('');
    const [editProductStatus, setEditProductStatus] = useState('active');

    // Create Checklist State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createMonth, setCreateMonth] = useState(moment().format('YYYY-MM'));
    const [createArea, setCreateArea] = useState('Security Cabin');
    const [createResp, setCreateResp] = useState('');
    const [submittingChecklist, setSubmittingChecklist] = useState(false);

    // Custom confirm modal state
    const [confirmModal, setConfirmModal] = useState({
        open: false,
        message: '',
        onConfirm: null
    });

    const areasList = ['Security Cabin', 'Pantry', 'Reception', 'Office Area', 'Production Floor'];

    // Fetch logged in user context
    useEffect(() => {
        const storedUser = localStorage.getItem('user') || localStorage.getItem('exim_user');
        if (storedUser) {
            try {
                setLoggedInUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
    }, []);

    const fetchChecklists = async () => {
        if (!hasAccess) return;
        try {
            setLoadingChecklists(true);
            const data = await firstAidAPI.getChecklists();
            setChecklists(data);
        } catch (err) {
            console.error('Failed to fetch checklists:', err);
            toast.error('Failed to load checklists.');
        } finally {
            setLoadingChecklists(false);
        }
    };

    const fetchProducts = async () => {
        if (!hasAccess) return;
        try {
            setLoadingProducts(true);
            const data = await firstAidAPI.getProducts();
            setProducts(data);
        } catch (err) {
            console.error('Failed to fetch products:', err);
            toast.error('Failed to load products list.');
        } finally {
            setLoadingProducts(false);
        }
    };

    useEffect(() => {
        if (hasAccess) {
            fetchChecklists();
        }
    }, [hasAccess]);

    useEffect(() => {
        if (activeTab === 'products' && hasAccess) {
            fetchProducts();
        }
    }, [activeTab, hasAccess]);

    const handleCreateChecklist = async (e) => {
        e.preventDefault();
        if (!createMonth || !createArea || !createResp.trim()) {
            toast.error('Please fill in all fields.');
            return;
        }

        try {
            setSubmittingChecklist(true);
            const data = await firstAidAPI.createChecklist({
                month: createMonth,
                area: createArea,
                responsibility: createResp.trim()
            });
            toast.success('Monthly checklist created successfully.');
            setChecklists([data, ...checklists]);
            setShowCreateModal(false);
            setCreateResp('');
            setSelectedChecklistId(data._id); // open it immediately
        } catch (err) {
            console.error('Failed to create checklist:', err);
            toast.error(err.response?.data?.message || 'Failed to create checklist.');
        } finally {
            setSubmittingChecklist(false);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        if (!newProductName.trim()) {
            toast.error('Please enter product name.');
            return;
        }

        try {
            setSubmittingProduct(true);
            const data = await firstAidAPI.addProduct({
                name: newProductName,
                genericName: newProductGenericName,
                purpose: newProductPurpose,
                totalStock: newProductTotalStock
            });
            toast.success('Medicine product added successfully.');
            setProducts([...products, data].sort((a, b) => a.name.localeCompare(b.name)));
            setNewProductName('');
            setNewProductGenericName('');
            setNewProductPurpose('');
            setNewProductTotalStock('');
            setShowAddProductModal(false);
        } catch (err) {
            console.error('Failed to add product:', err);
            toast.error(err.response?.data?.message || 'Failed to add product.');
        } finally {
            setSubmittingProduct(false);
        }
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        if (!editProductName.trim()) {
            toast.error('Please enter product name.');
            return;
        }

        try {
            const data = await firstAidAPI.updateProduct(editProduct._id, {
                name: editProductName,
                genericName: editProductGenericName,
                purpose: editProductPurpose,
                totalStock: editProductTotalStock,
                status: editProductStatus
            });
            toast.success('Medicine product updated successfully.');
            setProducts(products.map(p => p._id === editProduct._id ? data : p).sort((a, b) => a.name.localeCompare(b.name)));
            setShowEditProductModal(false);
            setEditProduct(null);
            setEditProductName('');
            setEditProductGenericName('');
            setEditProductPurpose('');
            setEditProductTotalStock('');
        } catch (err) {
            console.error('Failed to update product:', err);
            toast.error(err.response?.data?.message || 'Failed to update product.');
        }
    };

    const handleDeleteProduct = (id) => {
        setConfirmModal({
            open: true,
            message: 'Are you sure you want to deactivate this medicine? It will no longer be included in new checklists.',
            onConfirm: async () => {
                try {
                    const data = await firstAidAPI.deleteProduct(id);
                    toast.success('Medicine deactivated successfully.');
                    setProducts(products.map(p => p._id === id ? data.product : p));
                } catch (err) {
                    console.error('Failed to delete product:', err);
                    toast.error(err.response?.data?.message || 'Failed to deactivate product.');
                }
            }
        });
    };

    // Filter checklists
    const filteredChecklists = checklists.filter(c => {
        const matchMonth = showAllMonths ? true : (filterMonth ? c.month === filterMonth : true);
        const matchArea = filterArea ? c.area === filterArea : true;
        return matchMonth && matchArea;
    });

    if (!hasAccess) {
        return (
            <div className="firstaid-container">
                <div className="audit5s-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <span className="empty-icon" style={{ fontSize: '48px' }}>🚫</span>
                    <h3 style={{ marginTop: '20px', color: '#1e293b' }}>Access Denied</h3>
                    <p style={{ color: '#64748b' }}>
                        The First Aid Kit module is restricted to RABS Admin and HOD users only.
                    </p>
                </div>
            </div>
        );
    }

    if (selectedChecklistId) {
        return (
            <div className="firstaid-container">
                <FirstAidChecklistForm
                    checklistId={selectedChecklistId}
                    loggedInUser={loggedInUser}
                    onBack={() => {
                        setSelectedChecklistId(null);
                        fetchChecklists();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="firstaid-container">
            <div className="firstaid-content-wrapper">
            {/* Header section */}
            <div className="firstaid-header">
                <div className="firstaid-title">
                    <MedicalServicesIcon />
                    <span>First Aid Kit Checklist</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="firstaid-tabs">
                        <button
                            className={`firstaid-tab-btn ${activeTab === 'checklists' ? 'active' : ''}`}
                            onClick={() => setActiveTab('checklists')}
                        >
                            <FactCheckIcon fontSize="inherit" style={{ marginRight: '6px' }} />
                            Checklists
                        </button>
                        {isAdminOrHod && (
                            <button
                                className={`firstaid-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
                                onClick={() => setActiveTab('products')}
                            >
                                <SettingsIcon fontSize="inherit" style={{ marginRight: '6px' }} />
                                Manage Medicines
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Checklists Tab */}
            {activeTab === 'checklists' && (
                <div className="firstaid-card" style={{ padding: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    {/* Horizontal Filters Bar */}
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter Area</label>
                            <select
                                className="firstaid-input"
                                value={filterArea}
                                onChange={(e) => setFilterArea(e.target.value)}
                                style={{ height: '38px', minWidth: '180px' }}
                            >
                                <option value="">All Areas</option>
                                {areasList.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter Month</label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', height: '38px' }}>
                                <input
                                    type="month"
                                    className="firstaid-input"
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(e.target.value)}
                                    disabled={showAllMonths}
                                    style={{
                                        height: '38px',
                                        opacity: showAllMonths ? 0.5 : 1,
                                        cursor: showAllMonths ? 'not-allowed' : 'default'
                                    }}
                                />
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer', margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={showAllMonths}
                                        onChange={(e) => setShowAllMonths(e.target.checked)}
                                    />
                                    Show All Months
                                </label>
                            </div>
                        </div>

                        <button
                            className="btn-firstaid btn-firstaid-primary"
                            style={{ height: '38px', marginLeft: 'auto', alignSelf: 'flex-end' }}
                            onClick={() => setShowCreateModal(true)}
                        >
                            <AddIcon fontSize="small" /> Create Monthly Checklist
                        </button>
                    </div>

                    {loadingChecklists ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <CircularProgress color="primary" />
                        </div>
                    ) : filteredChecklists.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                            <h3 style={{ margin: 0, color: '#64748b', fontSize: '16px', fontWeight: 600 }}>No checklists found for selection.</h3>
                            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 16px 0' }}>
                                Start a new checklist for this month and area to begin tracking.
                            </p>
                            <button className="btn-firstaid btn-firstaid-primary" onClick={() => setShowCreateModal(true)}>
                                Create Checklist Now
                            </button>
                        </div>
                    ) : (
                        <div className="firstaid-card-grid">
                            {filteredChecklists.map(c => {
                                const checkedCount = c.checked_by_weeks?.length || 0;
                                const reviewedCount = c.reviewed_by_weeks?.length || 0;

                                return (
                                    <div
                                        key={c._id}
                                        className="firstaid-grid-item"
                                        onClick={() => setSelectedChecklistId(c._id)}
                                        style={{ minHeight: '140px' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{c.area}</span>
                                            <span className="firstaid-badge firstaid-badge-success" style={{ textTransform: 'capitalize' }}>
                                                {moment(c.month, 'YYYY-MM').format('MMM YYYY')}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>
                                            Responsibility: <strong style={{ color: '#334155' }}>{c.responsibility}</strong>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                            <span className="firstaid-badge firstaid-badge-success">
                                                Checked: {checkedCount}/5
                                            </span>
                                            <span className="firstaid-badge firstaid-badge-pending">
                                                Reviewed: {reviewedCount}/5
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Manage Medicines Tab */}
            {activeTab === 'products' && (
                <div className="firstaid-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Medicine Inventory Master</h3>
                        <button className="btn-firstaid btn-firstaid-primary" onClick={() => setShowAddProductModal(true)}>
                            <AddIcon /> Add Medicine
                        </button>
                    </div>

                    {loadingProducts ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <CircularProgress color="primary" />
                        </div>
                    ) : (
                        <div className="firstaid-checklist-table-wrapper">
                            <table className="firstaid-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px', textAlign: 'center' }}>S.No</th>
                                        <th>Medicine / Supply Name</th>
                                        <th>Generic Name</th>
                                        <th>Used For (Purpose)</th>
                                        <th style={{ width: '100px', textAlign: 'center' }}>Total Stock</th>
                                        <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                                        <th style={{ width: '180px', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((p, idx) => (
                                        <tr key={p._id}>
                                            <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                                            <td style={{ fontWeight: 700, color: '#1e293b' }}>{p.name}</td>
                                            <td style={{ color: '#475569' }}>{p.generic_name || '—'}</td>
                                            <td style={{ color: '#475569', fontSize: '13px' }}>{p.purpose || '—'}</td>
                                            <td style={{ textAlign: 'center', color: '#1e293b', fontWeight: 600 }}>{p.total_stock !== undefined ? p.total_stock : 0}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`firstaid-badge ${p.status === 'active' ? 'firstaid-badge-success' : 'firstaid-badge-error'}`}>
                                                    {p.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button
                                                        className="btn-firstaid btn-firstaid-secondary"
                                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                                        onClick={() => {
                                                            setEditProduct(p);
                                                            setEditProductName(p.name);
                                                            setEditProductGenericName(p.generic_name || '');
                                                            setEditProductPurpose(p.purpose || '');
                                                            setEditProductTotalStock(p.total_stock !== undefined ? p.total_stock : 0);
                                                            setEditProductStatus(p.status);
                                                            setShowEditProductModal(true);
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    {p.status === 'active' && (
                                                        <button
                                                            className="btn-firstaid btn-firstaid-secondary"
                                                            style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#ffe4e6', color: '#be123c', background: '#fff5f5' }}
                                                            onClick={() => handleDeleteProduct(p._id)}
                                                        >
                                                            Deactivate
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Create Checklist Modal */}
            {showCreateModal && (
                <div className="firstaid-modal-overlay">
                    <div className="firstaid-modal">
                        <div className="firstaid-modal-header">
                            <span className="firstaid-modal-title">Create Monthly Checklist</span>
                            <button className="firstaid-modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateChecklist}>
                            <div className="firstaid-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="firstaid-form-group">
                                    <label>Month</label>
                                    <input
                                        type="month"
                                        className="firstaid-input"
                                        value={createMonth}
                                        onChange={(e) => setCreateMonth(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="firstaid-form-group">
                                    <label>Area / Location</label>
                                    <select
                                        className="firstaid-input"
                                        value={createArea}
                                        onChange={(e) => setCreateArea(e.target.value)}
                                        required
                                    >
                                        {areasList.map(a => (
                                            <option key={a} value={a}>{a}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="firstaid-form-group">
                                    <label>Responsibility (Employee Name)</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={createResp}
                                        onChange={(e) => setCreateResp(e.target.value)}
                                        placeholder="e.g. Ashwini / Afzal"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="firstaid-modal-footer">
                                <button type="button" className="btn-firstaid btn-firstaid-secondary" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-firstaid btn-firstaid-primary" disabled={submittingChecklist}>
                                    {submittingChecklist ? 'Creating...' : 'Create Checklist'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Product Modal */}
            {showAddProductModal && (
                <div className="firstaid-modal-overlay">
                    <div className="firstaid-modal">
                        <div className="firstaid-modal-header">
                            <span className="firstaid-modal-title">Add Medicine / Supply</span>
                            <button className="firstaid-modal-close" onClick={() => setShowAddProductModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleAddProduct}>
                            <div className="firstaid-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="firstaid-form-group">
                                    <label>Medicine Name</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={newProductName}
                                        onChange={(e) => setNewProductName(e.target.value)}
                                        placeholder="e.g. Paracetamol Tablets IP 500 mg"
                                        required
                                    />
                                </div>
                                <div className="firstaid-form-group">
                                    <label>Generic Name</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={newProductGenericName}
                                        onChange={(e) => setNewProductGenericName(e.target.value)}
                                        placeholder="e.g. Paracetamol"
                                    />
                                </div>
                                <div className="firstaid-form-group">
                                    <label>Used For (Purpose)</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={newProductPurpose}
                                        onChange={(e) => setNewProductPurpose(e.target.value)}
                                        placeholder="e.g. Fever, headache, body pain"
                                    />
                                </div>
                                <div className="firstaid-form-group">
                                    <label>Total Stock</label>
                                    <input
                                        type="number"
                                        className="firstaid-input"
                                        value={newProductTotalStock}
                                        onChange={(e) => setNewProductTotalStock(e.target.value)}
                                        placeholder="e.g. 50"
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div className="firstaid-modal-footer">
                                <button type="button" className="btn-firstaid btn-firstaid-secondary" onClick={() => setShowAddProductModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-firstaid btn-firstaid-primary" disabled={submittingProduct}>
                                    {submittingProduct ? 'Adding...' : 'Add Medicine'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {showEditProductModal && (
                <div className="firstaid-modal-overlay">
                    <div className="firstaid-modal">
                        <div className="firstaid-modal-header">
                            <span className="firstaid-modal-title">Edit Medicine / Supply</span>
                            <button className="firstaid-modal-close" onClick={() => setShowEditProductModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleUpdateProduct}>
                            <div className="firstaid-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="firstaid-form-group">
                                    <label>Medicine Name</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={editProductName}
                                        onChange={(e) => setEditProductName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="firstaid-form-group">
                                    <label>Generic Name</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={editProductGenericName}
                                        onChange={(e) => setEditProductGenericName(e.target.value)}
                                    />
                                </div>
                                <div className="firstaid-form-group">
                                    <label>Used For (Purpose)</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={editProductPurpose}
                                        onChange={(e) => setEditProductPurpose(e.target.value)}
                                    />
                                </div>
                                <div className="firstaid-form-group">
                                    <label>Total Stock</label>
                                    <input
                                        type="number"
                                        className="firstaid-input"
                                        value={editProductTotalStock}
                                        onChange={(e) => setEditProductTotalStock(e.target.value)}
                                        placeholder="e.g. 50"
                                        min="0"
                                    />
                                </div>
                                <div className="firstaid-form-group">
                                    <label>Status</label>
                                    <select
                                        className="firstaid-input"
                                        value={editProductStatus}
                                        onChange={(e) => setEditProductStatus(e.target.value)}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="firstaid-modal-footer">
                                <button type="button" className="btn-firstaid btn-firstaid-secondary" onClick={() => setShowEditProductModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-firstaid btn-firstaid-primary">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {confirmModal.open && (
                <div className="firstaid-modal-overlay">
                    <div className="firstaid-modal" style={{ maxWidth: '400px' }}>
                        <div className="firstaid-modal-header">
                            <span className="firstaid-modal-title">Confirm Action</span>
                            <button className="firstaid-modal-close" onClick={() => setConfirmModal({ open: false, message: '', onConfirm: null })}>&times;</button>
                        </div>
                        <div className="firstaid-modal-body">
                            <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
                                {confirmModal.message}
                            </p>
                        </div>
                        <div className="firstaid-modal-footer">
                            <button
                                type="button"
                                className="btn-firstaid btn-firstaid-secondary"
                                onClick={() => setConfirmModal({ open: false, message: '', onConfirm: null })}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-firstaid btn-firstaid-primary"
                                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                                onClick={() => {
                                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                                    setConfirmModal({ open: false, message: '', onConfirm: null });
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

export default FirstAidDashboard;

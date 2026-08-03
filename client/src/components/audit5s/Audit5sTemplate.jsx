import React, { useState, useEffect, useCallback } from "react";
import audit5sAPI from "../../api/audit5s.api";
import { toast } from "react-hot-toast";
import "./Audit5s.css";

const Audit5sTemplate = () => {
    const [zones, setZones] = useState([]);
    const [selectedZoneId, setSelectedZoneId] = useState("");
    
    const [docNo, setDocNo] = useState("");
    const [revNo, setRevNo] = useState("");
    const [revDate, setRevDate] = useState("");
    const [categories, setCategories] = useState([]);
    
    const [loadingZones, setLoadingZones] = useState(true);
    const [loadingTemplate, setLoadingTemplate] = useState(false);
    const [saving, setSaving] = useState(false);

    // Bulk add helper states
    const [bulkInputText, setBulkInputText] = useState({});
    const [bulkInputVisible, setBulkInputVisible] = useState({});

    // Format Date helper for input element type="date"
    const formatDateYYYYMMDD = (dStr) => {
        if (!dStr) return "";
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return dStr;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    // Load available zones
    const loadZones = async () => {
        try {
            setLoadingZones(true);
            const res = await audit5sAPI.getZones();
            if (res.success && Array.isArray(res.data)) {
                setZones(res.data);
                if (res.data.length > 0) {
                    setSelectedZoneId(res.data[0]._id);
                }
            }
        } catch (err) {
            console.error("Failed to load zones for template configuration:", err);
            toast.error("Failed to load zones.");
        } finally {
            setLoadingZones(false);
        }
    };

    // Load template for selected zone
    const loadTemplate = useCallback(async (zoneId) => {
        if (!zoneId) return;
        try {
            setLoadingTemplate(true);
            const res = await audit5sAPI.getTemplate(zoneId);
            if (res.success && res.data) {
                const tpl = res.data;
                setDocNo(tpl.docNo || "");
                setRevNo(tpl.revNo || "");
                setRevDate(formatDateYYYYMMDD(tpl.revDate) || "");
                setCategories(tpl.categories || []);
            }
        } catch (err) {
            console.error("Failed to load template config:", err);
            toast.error("Failed to load template for this zone.");
        } finally {
            setLoadingTemplate(false);
        }
    }, []);

    useEffect(() => {
        loadZones();
    }, []);

    useEffect(() => {
        if (selectedZoneId) {
            loadTemplate(selectedZoneId);
        }
    }, [selectedZoneId, loadTemplate]);

    // Handle template save
    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!selectedZoneId) {
            toast.error("Please select a zone to configure.");
            return;
        }

        try {
            setSaving(true);
            const res = await audit5sAPI.saveTemplate({
                zoneId: selectedZoneId,
                docNo,
                revNo,
                revDate,
                categories
            });
            if (res.success) {
                toast.success("Zone template configuration saved successfully!");
                loadTemplate(selectedZoneId);
            }
        } catch (err) {
            console.error("Failed to save template config:", err);
            toast.error("Failed to save template configuration.");
        } finally {
            setSaving(false);
        }
    };





    // Handle Category fields change
    const handleCategoryChange = (catIdx, field, val) => {
        const updated = [...categories];
        updated[catIdx] = { ...updated[catIdx], [field]: val };
        setCategories(updated);
    };

    // Add New Category
    const handleAddCategory = () => {
        setCategories([
            ...categories,
            {
                name: "New 5S Category",
                subName: "Description",
                items: []
            }
        ]);
    };

    // Remove Category
    const handleRemoveCategory = (catIdx) => {
        if (!window.confirm("Are you sure you want to delete this entire category and all of its questions?")) {
            return;
        }
        const updated = [...categories];
        updated.splice(catIdx, 1);
        setCategories(updated);
    };

    // Handle Item input change
    const handleItemTextChange = (catIdx, itemIdx, textVal) => {
        const updated = [...categories];
        const items = [...updated[catIdx].items];
        items[itemIdx] = { ...items[itemIdx], text: textVal };
        updated[catIdx] = { ...updated[catIdx], items };
        setCategories(updated);
    };

    // Add item to a category
    const handleAddItem = (catIdx) => {
        const updated = [...categories];
        const items = [...updated[catIdx].items, { text: "" }];
        updated[catIdx] = { ...updated[catIdx], items };
        setCategories(updated);
    };

    // Remove item from a category
    const handleRemoveItem = (catIdx, itemIdx) => {
        const updated = [...categories];
        const items = [...updated[catIdx].items];
        items.splice(itemIdx, 1);
        updated[catIdx] = { ...updated[catIdx], items };
        setCategories(updated);
    };

    // Toggle Bulk Add visibility
    const toggleBulkAdd = (catIdx) => {
        setBulkInputVisible({
            ...bulkInputVisible,
            [catIdx]: !bulkInputVisible[catIdx]
        });
    };

    // Run Bulk Add Items
    const handleBulkAddItems = (catIdx) => {
        const text = bulkInputText[catIdx] || "";
        if (!text.trim()) {
            toast.error("Please paste or type checklist questions.");
            return;
        }

        const lines = text.split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (lines.length === 0) {
            toast.error("No valid questions found.");
            return;
        }

        const updated = [...categories];
        const items = [...updated[catIdx].items, ...lines.map(t => ({ text: t }))];
        updated[catIdx] = { ...updated[catIdx], items };
        
        setCategories(updated);
        setBulkInputText({ ...bulkInputText, [catIdx]: "" });
        setBulkInputVisible({ ...bulkInputVisible, [catIdx]: false });
        toast.success(`Appended ${lines.length} items to this category!`);
    };

    if (loadingZones) {
        return (
            <div className="audit-sheet-loader">
                <div className="db-spin" />
                <p>Loading Active Zones...</p>
            </div>
        );
    }

    return (
        <div className="audit-template-editor">
            {/* Zone Selector Card & Quick Actions */}
            <div className="template-meta-card zone-selector-card">
                <div className="zone-select-row">
                    <div className="form-group flex-grow">
                        <label htmlFor="zone-select-template">Select Zone to Configure:</label>
                        {zones.length === 0 ? (
                            <span className="error-text">No active zones configured. Please create a zone first.</span>
                        ) : (
                            <select
                                id="zone-select-template"
                                className="audit5s-input large-select"
                                value={selectedZoneId}
                                onChange={(e) => setSelectedZoneId(e.target.value)}
                            >
                                {zones.map((z) => (
                                    <option key={z._id} value={z._id}>
                                        Zone {z.zoneNo}: {z.zoneName}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>


            </div>

            {selectedZoneId && (
                loadingTemplate ? (
                    <div className="audit-sheet-loader">
                        <div className="db-spin" />
                        <p>Loading Zone Configuration...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="template-form">
                        {/* Meta details header card */}
                        <div className="template-meta-card">
                            <h3>Document Control Details</h3>
                            <p className="description">Configure the standard pre-printed header fields that will automatically copy to new monthly checklists for this zone.</p>
                            
                            <div className="meta-inputs-grid">
                                <div className="form-group">
                                    <label htmlFor="doc-no-tpl">Doc No:</label>
                                    <input
                                        id="doc-no-tpl"
                                        type="text"
                                        className="audit5s-input"
                                        value={docNo}
                                        onChange={(e) => setDocNo(e.target.value)}
                                        placeholder="RI/QAD/R/04"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="rev-no-tpl">Rev No:</label>
                                    <input
                                        id="rev-no-tpl"
                                        type="text"
                                        className="audit5s-input"
                                        value={revNo}
                                        onChange={(e) => setRevNo(e.target.value)}
                                        placeholder="00"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="rev-date-tpl">Rev Date:</label>
                                    <input
                                        id="rev-date-tpl"
                                        type="date"
                                        className="audit5s-input"
                                        value={revDate}
                                        onChange={(e) => setRevDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Categories & Items Accordions/Cards */}
                        <div className="template-categories-list">
                            <div className="categories-header-row">
                                <div>
                                    <h3>5S Audit Checklist Items</h3>
                                    <p className="description">Add/edit categories and checklist questions specifically for this zone's audit sheet.</p>
                                </div>
                                <button
                                    type="button"
                                    className="btn-audit5s btn-secondary"
                                    onClick={handleAddCategory}
                                >
                                    ➕ Add Category
                                </button>
                            </div>

                            {categories.length === 0 ? (
                                <div className="audit5s-empty-state">
                                    <h3>No Categories Configured</h3>
                                    <p>Please click "Add Category" to start building your sheet format.</p>
                                </div>
                            ) : (
                                categories.map((cat, catIdx) => (
                                    <div className="category-card" key={cat._id || catIdx}>
                                        <div className="category-card-header">
                                            <div className="cat-name-inputs">
                                                <input
                                                    type="text"
                                                    className="cat-header-input"
                                                    value={cat.name}
                                                    onChange={(e) => handleCategoryChange(catIdx, "name", e.target.value)}
                                                    placeholder="Category Name (e.g. 1S Sort)"
                                                />
                                                <input
                                                    type="text"
                                                    className="cat-subheader-input"
                                                    value={cat.subName || ""}
                                                    onChange={(e) => handleCategoryChange(catIdx, "subName", e.target.value)}
                                                    placeholder="Subname (e.g. Organization)"
                                                />
                                            </div>
                                            
                                            <div className="cat-header-actions">
                                                <button
                                                    type="button"
                                                    className="btn-audit5s btn-secondary compact"
                                                    onClick={() => handleAddItem(catIdx)}
                                                >
                                                    ➕ Add Item
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-audit5s btn-secondary compact"
                                                    onClick={() => toggleBulkAdd(catIdx)}
                                                    title="Add multiple questions at once"
                                                >
                                                    📄 Bulk Add
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-audit5s btn-danger compact"
                                                    onClick={() => handleRemoveCategory(catIdx)}
                                                >
                                                    ✕ Delete Cat
                                                </button>
                                            </div>
                                        </div>

                                        {/* Bulk Import text area */}
                                        {bulkInputVisible[catIdx] && (
                                            <div className="bulk-add-panel">
                                                <p className="bulk-desc">Paste checklist questions below (one question per line):</p>
                                                <textarea
                                                    className="audit5s-input bulk-textarea"
                                                    rows={4}
                                                    value={bulkInputText[catIdx] || ""}
                                                    onChange={(e) => setBulkInputText({ ...bulkInputText, [catIdx]: e.target.value })}
                                                    placeholder="Example Question 1&#10;Example Question 2&#10;Example Question 3"
                                                />
                                                <div className="bulk-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-audit5s btn-primary compact"
                                                        onClick={() => handleBulkAddItems(catIdx)}
                                                    >
                                                        Import Questions
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-audit5s btn-secondary compact"
                                                        onClick={() => toggleBulkAdd(catIdx)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="category-items-list">
                                            {cat.items.length === 0 ? (
                                                <div className="no-items-placeholder">No audit items configured. Add at least one item to proceed.</div>
                                            ) : (
                                                cat.items.map((item, itemIdx) => (
                                                    <div className="item-row" key={item._id || itemIdx}>
                                                        <span className="item-index">{itemIdx + 1}.</span>
                                                        <input
                                                            type="text"
                                                            className="audit5s-input item-text-input"
                                                            value={item.text}
                                                            onChange={(e) => handleItemTextChange(catIdx, itemIdx, e.target.value)}
                                                            placeholder="Enter audit check question description..."
                                                        />
                                                        <button
                                                            type="button"
                                                            className="btn-item-delete"
                                                            onClick={() => handleRemoveItem(catIdx, itemIdx)}
                                                            title="Delete item"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer Save Row */}
                        <div className="template-actions-bar">
                            <button
                                type="submit"
                                className="btn-audit5s btn-primary large"
                                disabled={saving}
                            >
                                {saving ? "Saving Configuration..." : "💾 Save Zone Template Configuration"}
                            </button>
                        </div>
                    </form>
                )
            )}
        </div>
    );
};

export default Audit5sTemplate;

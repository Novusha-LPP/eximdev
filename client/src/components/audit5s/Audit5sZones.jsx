import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import audit5sAPI from "../../api/audit5s.api";
import apiClient from "../../api/attendanceApiClient";
import { toast } from "react-hot-toast";
import "./Audit5s.css";

const Audit5sZones = ({ onZonesChanged }) => {
    const [zones, setZones] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Form states
    const [editingId, setEditingId] = useState(null);
    const [zoneNo, setZoneNo] = useState("");
    const [zoneName, setZoneName] = useState("");
    const [respPersonId, setRespPersonId] = useState("");

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [zonesRes, usersRes] = await Promise.all([
                audit5sAPI.getZones(),
                axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`)
            ]);

            if (zonesRes.success) {
                setZones(zonesRes.data);
            }
            if (Array.isArray(usersRes.data)) {
                const rabsUsers = usersRes.data.filter(u => {
                    const compName = u.company || (u.company_id && u.company_id.company_name) || "";
                    return /RABS/i.test(compName);
                });
                setUsers(rabsUsers);
            }
        } catch (err) {
            console.error("Failed to load zones manager data:", err);
            toast.error("Failed to load zones configuration.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const resetForm = () => {
        setEditingId(null);
        setZoneNo("");
        setZoneName("");
        setRespPersonId("");
    };

    const handleEdit = (zone) => {
        setEditingId(zone._id);
        setZoneNo(zone.zoneNo);
        setZoneName(zone.zoneName);
        setRespPersonId(zone.responsiblePerson?._id || zone.responsiblePerson || "");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!zoneNo.trim() || !zoneName.trim() || !respPersonId) {
            toast.error("Please fill in all fields.");
            return;
        }

        // Check uniqueness locally before saving (except if editing the same zone)
        const isDuplicate = zones.some(z => z.zoneNo === zoneNo.trim() && z._id !== editingId);
        if (isDuplicate) {
            toast.error(`Zone number "${zoneNo}" is already in use.`);
            return;
        }

        try {
            setActionLoading(true);
            const payload = {
                zoneNo: zoneNo.trim(),
                zoneName: zoneName.trim().toUpperCase(),
                responsiblePerson: respPersonId
            };
            if (editingId) {
                payload.id = editingId;
            }

            const res = await audit5sAPI.saveZone(payload);
            if (res.success) {
                toast.success(editingId ? "Zone updated successfully." : "Zone created successfully.");
                resetForm();
                loadData();
                if (onZonesChanged) onZonesChanged();
            }
        } catch (err) {
            console.error("Failed to save zone:", err);
            toast.error("Failed to save zone configuration.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id, zoneNoStr) => {
        if (!window.confirm(`Are you sure you want to delete Zone ${zoneNoStr}?`)) {
            return;
        }

        try {
            setActionLoading(true);
            const res = await audit5sAPI.deleteZone(id);
            if (res.success) {
                toast.success("Zone deleted successfully.");
                loadData();
                if (onZonesChanged) onZonesChanged();
            }
        } catch (err) {
            console.error("Failed to delete zone:", err);
            toast.error("Failed to delete zone.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="audit-sheet-loader">
                <div className="db-spin" />
                <p>Loading Zones...</p>
            </div>
        );
    }

    return (
        <div className="audit5s-config-container">
            {/* Form Column */}
            <div className="config-form-card">
                <h3>{editingId ? "Edit Audit Zone" : "Create Audit Zone"}</h3>
                <form onSubmit={handleSubmit} className="audit5s-form">
                    <div className="form-group">
                        <label htmlFor="zone-no-input">Zone Number:</label>
                        <input
                            id="zone-no-input"
                            type="text"
                            className="audit5s-input"
                            value={zoneNo}
                            onChange={(e) => setZoneNo(e.target.value)}
                            placeholder="e.g. 01"
                            disabled={actionLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="zone-name-input">Zone Name:</label>
                        <input
                            id="zone-name-input"
                            type="text"
                            className="audit5s-input"
                            value={zoneName}
                            onChange={(e) => setZoneName(e.target.value)}
                            placeholder="e.g. MAIN OFFICE"
                            disabled={actionLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="responsible-user-select">Responsible Person:</label>
                        <SearchableSelect
                            value={respPersonId}
                            onChange={setRespPersonId}
                            options={users.map((u) => ({
                                value: u._id,
                                label: u.first_name ? `${u.first_name} ${u.last_name || ""} (${u.username})` : u.username
                            }))}
                            placeholder="Select Employee"
                            disabled={actionLoading}
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn-audit5s btn-primary"
                            disabled={actionLoading}
                        >
                            {actionLoading ? "Saving..." : editingId ? "Update Zone" : "Create Zone"}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                className="btn-audit5s btn-secondary"
                                onClick={resetForm}
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* List Table Column */}
            <div className="config-list-card">
                <h3>Active Audit Zones</h3>
                {zones.length === 0 ? (
                    <div className="config-empty-msg">No active zones configured yet.</div>
                ) : (
                    <table className="config-table">
                        <thead>
                            <tr>
                                <th>Zone No.</th>
                                <th>Zone Name</th>
                                <th>Responsible Person</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {zones.map((zone) => {
                                const resp = zone.responsiblePerson;
                                const respName = resp?.first_name 
                                    ? `${resp.first_name} ${resp.last_name || ""}`.trim() 
                                    : (resp?.username || "—");

                                return (
                                    <tr key={zone._id} className={editingId === zone._id ? "row-editing" : ""}>
                                        <td className="center"><strong>{zone.zoneNo}</strong></td>
                                        <td>{zone.zoneName}</td>
                                        <td>{respName}</td>
                                        <td>
                                            <div className="list-row-actions">
                                                <button
                                                    className="btn-list-action edit"
                                                    onClick={() => handleEdit(zone)}
                                                    disabled={actionLoading}
                                                    title="Edit Zone"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    className="btn-list-action delete"
                                                    onClick={() => handleDelete(zone._id, zone.zoneNo)}
                                                    disabled={actionLoading}
                                                    title="Delete Zone"
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const SearchableSelect = ({ value, onChange, options, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    const filteredOptions = options.filter(o => 
        o.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={dropdownRef} className="custom-searchable-select" style={{ position: "relative", width: "100%", minWidth: "180px" }}>
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "14px",
                    color: selectedOption ? "#1e293b" : "#64748b",
                    cursor: disabled ? "not-allowed" : "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
            >
                <span>{selectedOption ? selectedOption.label : placeholder}</span>
                <span style={{ fontSize: "10px", color: "#64748b" }}>▼</span>
            </div>
            {isOpen && (
                <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
                    zIndex: 1000,
                    marginTop: "4px",
                    maxHeight: "220px",
                    display: "flex",
                    flexDirection: "column"
                }}>
                    <input 
                        type="text"
                        placeholder="Search employee..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            border: "none",
                            borderBottom: "1px solid #e2e8f0",
                            padding: "8px 12px",
                            fontSize: "14px",
                            outline: "none",
                            width: "100%",
                            boxSizing: "border-box"
                        }}
                        autoFocus
                    />
                    <div style={{ overflowY: "auto", flex: 1, maxHeight: "160px" }}>
                        <div 
                            onClick={() => {
                                onChange("");
                                setIsOpen(false);
                                setSearch("");
                            }}
                            style={{
                                padding: "8px 12px",
                                cursor: "pointer",
                                fontSize: "14px",
                                color: "#64748b",
                                backgroundColor: value === "" ? "#f1f5f9" : "transparent"
                            }}
                        >
                            {placeholder}
                        </div>
                        {filteredOptions.map(o => (
                            <div 
                                key={o.value}
                                onClick={() => {
                                    onChange(o.value);
                                    setIsOpen(false);
                                    setSearch("");
                                }}
                                style={{
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    color: "#1e293b",
                                    backgroundColor: value === o.value ? "#f1f5f9" : "transparent"
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#f8fafc"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = value === o.value ? "#f1f5f9" : "transparent"}
                            >
                                {o.label}
                            </div>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div style={{ padding: "8px 12px", fontSize: "14px", color: "#64748b" }}>
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Audit5sZones;

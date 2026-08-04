import React, { useState, useEffect, useCallback } from "react";
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
                apiClient.get("/get-all-users")
            ]);

            if (zonesRes.success) {
                setZones(zonesRes.data);
            }
            if (Array.isArray(usersRes.data)) {
                const rabsUsers = usersRes.data.filter(u => 
                    (u.company && /RABS/i.test(u.company)) ||
                    (u.role && /admin|hr/i.test(u.role))
                );
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
                        <select
                            id="responsible-user-select"
                            className="audit5s-input"
                            value={respPersonId}
                            onChange={(e) => setRespPersonId(e.target.value)}
                            disabled={actionLoading}
                        >
                            <option value="">Select Employee</option>
                            {users.map((u) => (
                                <option key={u._id} value={u._id}>
                                    {u.first_name ? `${u.first_name} ${u.last_name || ""}` : u.username} ({u.username})
                                </option>
                            ))}
                        </select>
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

export default Audit5sZones;

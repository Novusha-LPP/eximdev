import React, { useState, useEffect, useContext, useCallback } from "react";
import { UserContext } from "../../contexts/UserContext";
import audit5sAPI from "../../api/audit5s.api";
import Audit5sSheet from "./Audit5sSheet";
import Audit5sZones from "./Audit5sZones";
import Audit5sTemplate from "./Audit5sTemplate";
import "./Audit5s.css";

const Audit5sDashboard = () => {
    const { user } = useContext(UserContext);
    
    // Normalize role for tab visibility checks
    const normalizeRole = (r) => String(r || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
    const role = normalizeRole(user?.role);
    const isAdminOrHR = true; // Enabled by default to allow visual checklist configuration during testing

    // Set default month to current month in YYYY-MM format
    const getTodayMonthStr = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}`;
    };

    const [activeTab, setActiveTab] = useState("sheet"); // "sheet", "zones", "template"
    const [selectedMonth, setSelectedMonth] = useState(getTodayMonthStr());
    const [zones, setZones] = useState([]);
    const [selectedZoneId, setSelectedZoneId] = useState("");
    const [loadingZones, setLoadingZones] = useState(true);

    const loadZones = useCallback(async () => {
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
            console.error("Failed to load zones:", err);
        } finally {
            setLoadingZones(false);
        }
    }, []);

    useEffect(() => {
        loadZones();
    }, [loadZones]);

    const activeZone = zones.find(z => z._id === selectedZoneId);

    return (
        <div className="audit5s-dashboard">
            {/* Header section */}
            <div className="audit5s-header">
                <div>
                    <h1 className="audit5s-title">Monthly 5S Audit Checklist</h1>
                    <p className="audit5s-subtitle">Ensure organizational standard and workplace efficiency</p>
                </div>

                {/* Tab buttons */}
                <div className="audit5s-tabs">
                    <button
                        className={`audit5s-tab-btn ${activeTab === "sheet" ? "active" : ""}`}
                        onClick={() => setActiveTab("sheet")}
                    >
                        Audit Check Sheet
                    </button>
                    {isAdminOrHR && (
                        <>
                            <button
                                className={`audit5s-tab-btn ${activeTab === "zones" ? "active" : ""}`}
                                onClick={() => setActiveTab("zones")}
                            >
                                Configure Zones
                            </button>
                            <button
                                className={`audit5s-tab-btn ${activeTab === "template" ? "active" : ""}`}
                                onClick={() => setActiveTab("template")}
                            >
                                Configure Template
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main content switches */}
            {activeTab === "sheet" && (
                <div className="audit5s-sheet-container">
                    {/* Controls Row */}
                    <div className="audit5s-controls">
                        <div className="control-group">
                            <label htmlFor="month-select">Select Month:</label>
                            <input
                                id="month-select"
                                type="month"
                                className="audit5s-input month-input"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            />
                        </div>

                        <div className="control-group">
                            <label htmlFor="zone-select">Select Audit Zone:</label>
                            {loadingZones ? (
                                <span className="loading-text">Loading zones...</span>
                            ) : zones.length === 0 ? (
                                <span className="error-text">No active zones configured.</span>
                            ) : (
                                <select
                                    id="zone-select"
                                    className="audit5s-input"
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

                        {zones.length === 0 && isAdminOrHR && (
                            <button
                                className="btn-audit5s btn-primary"
                                onClick={() => setActiveTab("zones")}
                                style={{ marginLeft: "auto", alignSelf: "flex-end" }}
                            >
                                Create First Zone
                            </button>
                        )}
                    </div>

                    {zones.length > 0 && selectedZoneId ? (
                        <Audit5sSheet
                            month={selectedMonth}
                            zoneId={selectedZoneId}
                            isAdminOrHR={isAdminOrHR}
                        />
                    ) : (
                        <div className="audit5s-empty-state">
                            <span className="empty-icon">📋</span>
                            <h3>No Active Zones Available</h3>
                            <p>
                                Please configure at least one active zone in the "Configure Zones" tab to begin auditing.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "zones" && isAdminOrHR && (
                <Audit5sZones onZonesChanged={loadZones} />
            )}

            {activeTab === "template" && isAdminOrHR && (
                <Audit5sTemplate />
            )}
        </div>
    );
};

export default Audit5sDashboard;

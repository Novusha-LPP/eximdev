import React, { useState, useEffect, useContext, useCallback } from "react";
import { UserContext } from "../../contexts/UserContext";
import audit5sAPI from "../../api/audit5s.api";
import Audit5sSheet from "./Audit5sSheet";
import Audit5sZones from "./Audit5sZones";
import Audit5sTemplate from "./Audit5sTemplate";
import "./Audit5s.css";

const Audit5sDashboard = () => {
    const { user } = useContext(UserContext);
    
    // Restrict access to RABS Admin and HOD users only
    const isRabs = user?.company && /RABS/i.test(user.company);
    const isAdminOrHod = user?.role === "Admin" || user?.role === "Head_of_Department" || user?.role === "HOD" || user?.isHOD;
    const hasAccess = isRabs && isAdminOrHod;
    const isAdminOrHR = hasAccess;

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

    const [checklists, setChecklists] = useState([]);
    const [loadingChecklists, setLoadingChecklists] = useState(false);
    const [showAllChecklists, setShowAllChecklists] = useState(false);

    const loadChecklists = useCallback(async () => {
        if (!hasAccess) return;
        try {
            setLoadingChecklists(true);
            const res = await audit5sAPI.getChecklists();
            if (res.success && Array.isArray(res.data)) {
                setChecklists(res.data);
            }
        } catch (err) {
            console.error("Failed to load audit checklists:", err);
        } finally {
            setLoadingChecklists(false);
        }
    }, [hasAccess]);

    const loadZones = useCallback(async () => {
        if (!hasAccess) return;
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
    }, [hasAccess]);

    useEffect(() => {
        loadZones();
        loadChecklists();
    }, [loadZones, loadChecklists]);

    if (!hasAccess) {
        return (
            <div className="audit5s-empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                <span className="empty-icon" style={{ fontSize: '48px' }}>🚫</span>
                <h3 style={{ marginTop: '20px', color: '#1e293b' }}>Access Denied</h3>
                <p style={{ color: '#64748b' }}>
                    The 5S Checks & Audit module is restricted to RABS Admin and HOD users only.
                </p>
            </div>
        );
    }

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
                    <div className="audit5s-controls" style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="control-group">
                            <label htmlFor="month-select">Select Month:</label>
                            <input
                                id="month-select"
                                type="month"
                                className="audit5s-input month-input"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                disabled={showAllChecklists}
                                style={showAllChecklists ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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
                                    disabled={showAllChecklists}
                                    style={showAllChecklists ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                >
                                    {zones.map((z) => (
                                        <option key={z._id} value={z._id}>
                                            Zone {z.zoneNo}: {z.zoneName}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="control-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', height: '38px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer', margin: 0 }}>
                                <input
                                    type="checkbox"
                                    checked={showAllChecklists}
                                    onChange={(e) => {
                                        setShowAllChecklists(e.target.checked);
                                        if (e.target.checked) {
                                            loadChecklists();
                                        }
                                    }}
                                />
                                Show All Past Audits
                            </label>
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

                    {showAllChecklists ? (
                        loadingChecklists ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                <span style={{ fontSize: '14px', color: '#64748b' }}>Loading historical audits...</span>
                            </div>
                        ) : checklists.length === 0 ? (
                            <div className="audit5s-empty-state">
                                <h3>No historical audits found.</h3>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
                                {checklists.map(c => (
                                    <div
                                        key={c._id}
                                        style={{
                                            background: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            borderLeft: '4px solid #0f172a',
                                            borderRadius: '8px',
                                            padding: '20px',
                                            cursor: 'pointer',
                                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
                                            transition: 'transform 0.15s ease'
                                        }}
                                        onClick={() => {
                                            setSelectedMonth(c.month);
                                            setSelectedZoneId(c.zoneId);
                                            setShowAllChecklists(false);
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{c.zoneName}</span>
                                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                                {c.month}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>
                                            Responsibility: <strong>{c.responsiblePerson?.first_name || c.responsiblePerson?.username || '-'}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                            <span style={{ fontSize: '11px', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                                Zone No: {c.zoneNo}
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                Audit Completed
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        zones.length > 0 && selectedZoneId ? (
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
                        )
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

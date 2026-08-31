import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
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
    const [loadingZones, setLoadingZones] = useState(true);

    const [checklists, setChecklists] = useState([]);
    const [loadingChecklists, setLoadingChecklists] = useState(false);
    const [showAllChecklists, setShowAllChecklists] = useState(false);

    // Filtering states for past audits
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMonth, setFilterMonth] = useState("");
    const [filterZone, setFilterZone] = useState("");

    // Simplified flow view states
    const [viewState, setViewState] = useState("dashboard"); // "dashboard", "zone-details", "checklist"
    const [selectedZoneIdForDetails, setSelectedZoneIdForDetails] = useState("");

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
            }
        } catch (err) {
            console.error("Failed to load zones:", err);
        } finally {
            setLoadingZones(false);
        }
    }, [hasAccess]);

    // Calculate score percentage for a zone checklist
    const calculateZonePercentage = useCallback((zone, chk) => {
        if (!zone || !chk) return 0;
        
        const scoresMap = new Map();
        if (chk.scores && Array.isArray(chk.scores)) {
            chk.scores.forEach(s => {
                scoresMap.set(s.itemId.toString(), s.dailyScores || {});
            });
        }

        let grandActual = 0;
        let grandMax = 0;

        const [year, m] = chk.month.split("-").map(Number);
        const daysInMonth = new Date(year, m, 0).getDate();

        (zone.categories || []).forEach(cat => {
            let catActual = 0;
            let catMax = 0;

            if (cat.items && cat.items.length > 0) {
                for (let d = 1; d <= daysInMonth; d++) {
                    let allFilled = true;
                    let daySum = 0;

                    for (let i = 0; i < cat.items.length; i++) {
                        const item = cat.items[i];
                        const itemScores = scoresMap.get(item._id.toString()) || {};
                        const val = itemScores[String(d)];

                        if (val === undefined || val === null || val === "") {
                            allFilled = false;
                            break;
                        }
                        daySum += Number(val);
                    }

                    if (allFilled) {
                        catActual += daySum;
                        catMax += cat.items.length * 2;
                    }
                }
            }
            
            grandActual += catActual;
            grandMax += cat.totalScore || catMax;
        });

        return grandMax > 0 ? Number(((grandActual / grandMax) * 100).toFixed(2)) : 0;
    }, []);

    const selectedMonthLabel = useMemo(() => {
        if (!selectedMonth) return "";
        const [year, m] = selectedMonth.split("-").map(Number);
        const d = new Date(year, m - 1, 2);
        if (isNaN(d.getTime())) return selectedMonth;
        return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }, [selectedMonth]);

    const filteredChecklists = useMemo(() => {
        return checklists.filter(c => {
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const zName = (c.zoneName || "").toLowerCase();
                const zNo = String(c.zoneNo || "");
                if (!zName.includes(term) && !zNo.includes(term)) {
                    return false;
                }
            }
            if (filterMonth && c.month !== filterMonth) {
                return false;
            }
            if (filterZone) {
                const zId = c.zoneId?._id || c.zoneId || "";
                if (zId.toString() !== filterZone.toString()) {
                    return false;
                }
            }
            return true;
        });
    }, [checklists, searchTerm, filterMonth, filterZone]);

    const uniqueMonths = useMemo(() => {
        const months = checklists.map(c => c.month);
        return [...new Set(months)].sort().reverse();
    }, [checklists]);

    const uniqueZones = useMemo(() => {
        const zoneMap = new Map();
        checklists.forEach(c => {
            const zId = c.zoneId?._id || c.zoneId || "";
            if (zId) {
                zoneMap.set(zId.toString(), {
                    id: zId.toString(),
                    name: c.zoneName || `Zone ${c.zoneNo}`,
                    no: c.zoneNo
                });
            }
        });
        return [...zoneMap.values()].sort((a, b) => a.no - b.no);
    }, [checklists]);

    const groupedChecklists = useMemo(() => {
        const groups = {};
        filteredChecklists.forEach(c => {
            if (!groups[c.month]) {
                groups[c.month] = [];
            }
            groups[c.month].push(c);
        });
        return Object.keys(groups)
            .sort()
            .reverse()
            .map(month => {
                const [year, m] = month.split("-").map(Number);
                const d = new Date(year, m - 1, 2);
                const monthLabel = isNaN(d.getTime())
                    ? month
                    : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                return {
                    month,
                    label: monthLabel,
                    list: groups[month].sort((a, b) => a.zoneNo - b.zoneNo)
                };
            });
    }, [filteredChecklists]);

    const getPrevMonthStr = useCallback((monthStr) => {
        if (!monthStr) return "";
        const [year, month] = monthStr.split("-").map(Number);
        const d = new Date(year, month - 2, 15);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}`;
    }, []);

    const leaderboard = useMemo(() => {
        if (zones.length === 0) return [];

        const currentMonthChecklists = checklists.filter(c => c.month === selectedMonth);
        const prevMonthStr = getPrevMonthStr(selectedMonth);
        const prevMonthChecklists = checklists.filter(c => c.month === prevMonthStr);

        const list = zones.map(zone => {
            const currentChecklist = currentMonthChecklists.find(c => {
                const zId = c.zoneId?._id || c.zoneId || "";
                return zId.toString() === zone._id.toString();
            });
            const prevChecklist = prevMonthChecklists.find(c => {
                const zId = c.zoneId?._id || c.zoneId || "";
                return zId.toString() === zone._id.toString();
            });

            const currPct = currentChecklist ? calculateZonePercentage(zone, currentChecklist) : 0;
            
            let prevPct = 0;
            if (prevChecklist) {
                prevPct = calculateZonePercentage(zone, prevChecklist);
            } else if (currentChecklist && currentChecklist.prevMonthData) {
                let actual = 0;
                let max = 0;
                const prevDataObj = typeof currentChecklist.prevMonthData.toJSON === "function" 
                    ? currentChecklist.prevMonthData.toJSON() 
                    : currentChecklist.prevMonthData;
                Object.values(prevDataObj || {}).forEach(v => {
                    actual += Number(v.actual || 0);
                    max += Number(v.max || 0);
                });
                prevPct = max > 0 ? Number(((actual / max) * 100).toFixed(2)) : 0;
            }

            const difference = currPct - prevPct;

            return {
                zoneId: zone._id,
                zoneNo: zone.zoneNo,
                zoneName: zone.zoneName,
                leaderName: zone.responsiblePerson?.first_name
                    ? `${zone.responsiblePerson.first_name} ${zone.responsiblePerson.last_name || ""}`.trim()
                    : (zone.responsiblePerson?.username || "—"),
                percentage: currPct,
                currPct,
                prevPct,
                difference,
                hasAudit: !!currentChecklist,
                checklistId: currentChecklist?._id || null
            };
        });

        // Sort: audited first by score descending, then non-audited
        list.sort((a, b) => {
            if (a.hasAudit && !b.hasAudit) return -1;
            if (!a.hasAudit && b.hasAudit) return 1;
            return b.currPct - a.currPct;
        });

        return list.map((r, idx) => ({
            ...r,
            rank: idx + 1
        }));
    }, [zones, checklists, selectedMonth, calculateZonePercentage, getPrevMonthStr]);






    const zoneScoreHistory = useMemo(() => {
        if (!selectedZoneIdForDetails) return [];
        const zone = zones.find(z => z._id === selectedZoneIdForDetails);
        if (!zone) return [];

        const zoneChecklists = checklists.filter(c => (c.zoneId?._id || c.zoneId || "").toString() === selectedZoneIdForDetails.toString());
        
        return zoneChecklists.map(c => {
            const pct = calculateZonePercentage(zone, c);
            return {
                month: c.month,
                percentage: pct
            };
        }).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6);
    }, [checklists, selectedZoneIdForDetails, zones, calculateZonePercentage]);

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
                        onClick={() => {
                            setActiveTab("sheet");
                            setViewState("dashboard");
                        }}
                    >
                        Audit Check Sheet
                    </button>
                    {isAdminOrHR && (
                        <>
                            <button
                                className={`audit5s-tab-btn ${activeTab === "zones" ? "active" : ""}`}
                                onClick={() => {
                                    setActiveTab("zones");
                                    setViewState("dashboard");
                                }}
                            >
                                Configure Zones
                            </button>
                            <button
                                className={`audit5s-tab-btn ${activeTab === "template" ? "active" : ""}`}
                                onClick={() => {
                                    setActiveTab("template");
                                    setViewState("dashboard");
                                }}
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

                    {/* ═══ VIEW: Dashboard ═══ */}
                    {viewState === "dashboard" && (
                        <>
                            {/* Controls */}
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
                                        style={showAllChecklists ? { opacity: 0.5 } : {}}
                                    />
                                </div>
                                <div className="control-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', height: '38px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                                        <input
                                            type="checkbox"
                                            checked={showAllChecklists}
                                            onChange={(e) => {
                                                setShowAllChecklists(e.target.checked);
                                                if (e.target.checked) loadChecklists();
                                            }}
                                        />
                                        Show All Past Audits
                                    </label>
                                </div>
                                {zones.length === 0 && isAdminOrHR && (
                                    <button className="btn-audit5s btn-primary" onClick={() => setActiveTab("zones")} style={{ marginLeft: 'auto' }}>
                                        Create First Zone
                                    </button>
                                )}
                            </div>

                            {/* Past Audits Mode */}
                            {showAllChecklists ? (
                                loadingChecklists ? (
                                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading historical audits...</div>
                                ) : checklists.length === 0 ? (
                                    <div className="audit5s-empty-state">
                                        <span className="empty-icon">📂</span>
                                        <h3>No Historical Audits Found</h3>
                                        <p>No past checklist logs have been generated yet.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Compact filter row */}
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
                                            <input
                                                type="text"
                                                placeholder="Search zone..."
                                                className="audit5s-input"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                style={{ width: '160px', padding: '6px 10px', fontSize: '13px', minWidth: 'auto' }}
                                            />
                                            <select className="audit5s-input" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={{ width: '150px', padding: '6px 10px', fontSize: '13px', minWidth: 'auto' }}>
                                                <option value="">All Months</option>
                                                {uniqueMonths.map(m => {
                                                    const [y, mo] = m.split("-").map(Number);
                                                    const d = new Date(y, mo - 1, 2);
                                                    return <option key={m} value={m}>{isNaN(d.getTime()) ? m : d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</option>;
                                                })}
                                            </select>
                                            <select className="audit5s-input" value={filterZone} onChange={(e) => setFilterZone(e.target.value)} style={{ width: '150px', padding: '6px 10px', fontSize: '13px', minWidth: 'auto' }}>
                                                <option value="">All Zones</option>
                                                {uniqueZones.map(z => <option key={z.id} value={z.id}>Zone {z.no}: {z.name}</option>)}
                                            </select>
                                            {(searchTerm || filterMonth || filterZone) && (
                                                <button className="btn-audit5s btn-secondary compact" onClick={() => { setSearchTerm(""); setFilterMonth(""); setFilterZone(""); }}>Reset</button>
                                            )}
                                        </div>

                                        {filteredChecklists.length === 0 ? (
                                            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No audits match your filter.</div>
                                        ) : (
                                            groupedChecklists.map(group => (
                                                <div key={group.month} className="history-month-group">
                                                    <div className="history-month-header">
                                                        <h3>{group.label}</h3>
                                                        <span className="badge">{group.list.length} {group.list.length === 1 ? 'Audit' : 'Audits'}</span>
                                                    </div>
                                                    <div className="zone-grid">
                                                        {group.list.map(c => {
                                                            const zone = zones.find(z => z._id.toString() === (c.zoneId?._id || c.zoneId || "").toString());
                                                            const pct = zone ? calculateZonePercentage(zone, c) : 0;
                                                            return (
                                                                <div key={c._id} className="zone-card" onClick={() => { setSelectedMonth(c.month); setSelectedZoneIdForDetails(c.zoneId?._id || c.zoneId); setViewState("checklist"); setShowAllChecklists(false); }}>
                                                                    <div>
                                                                        <span className="zone-label">Zone {c.zoneNo}</span>
                                                                        <h3 className="zone-name">{c.zoneName || `Zone ${c.zoneNo}`}</h3>
                                                                    </div>
                                                                    <div className="zone-score-row">
                                                                        <span className="zone-score">{pct}%</span>
                                                                    </div>
                                                                    <div className="score-bar"><div className="score-bar-fill" style={{ width: `${pct}%` }} /></div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </>
                                )

                            /* Current Month Rankings */
                            ) : zones.length === 0 ? (
                                <div className="audit5s-empty-state">
                                    <span className="empty-icon">📋</span>
                                    <h3>No Zones Configured</h3>
                                    <p>Create zones in the "Configure Zones" tab to begin.</p>
                                </div>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '16px' }}>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                            Zone Rankings — {selectedMonthLabel}
                                        </h3>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                            Click any zone to open audit check sheet
                                        </p>
                                    </div>

                                    <div className="zone-grid">
                                        {leaderboard.map((r) => {
                                            const rankClass = r.rank === 1 ? "gold" : r.rank === 2 ? "silver" : r.rank === 3 ? "bronze" : "";
                                            const trendClass = r.difference > 0 ? "up" : r.difference < 0 ? "down" : "flat";
                                            const trendText = r.difference > 0
                                                ? `▲ +${r.difference.toFixed(1)}%`
                                                : r.difference < 0
                                                ? `▼ ${Math.abs(r.difference).toFixed(1)}%`
                                                : "—";
                                            const medalEmoji = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`;

                                            return (
                                                <div key={r.zoneId} className="zone-card" onClick={() => { setSelectedZoneIdForDetails(r.zoneId); setViewState("checklist"); }}>
                                                    <span className={`zone-rank ${rankClass}`}>{medalEmoji}</span>
                                                    <div>
                                                        <span className="zone-label">Zone {r.zoneNo}</span>
                                                        <h3 className="zone-name">{r.zoneName}</h3>
                                                        <span className="zone-meta">Leader: {r.leaderName}</span>
                                                    </div>
                                                    <div className="zone-score-row">
                                                        {r.hasAudit ? (
                                                            <>
                                                                <span className="zone-score">{r.currPct}%</span>
                                                                {r.prevPct > 0 && <span className={`zone-trend ${trendClass}`}>{trendText}</span>}
                                                            </>
                                                        ) : (
                                                            <span className="zone-score no-audit">No audit yet</span>
                                                        )}
                                                    </div>
                                                    {r.hasAudit && (
                                                        <div className="score-bar"><div className="score-bar-fill" style={{ width: `${r.currPct}%` }} /></div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* ═══ VIEW: Checklist ═══ */}
                    {viewState === "checklist" && zones.length > 0 && selectedZoneIdForDetails && (
                        <Audit5sSheet
                            month={selectedMonth}
                            zoneId={selectedZoneIdForDetails}
                            isAdminOrHR={isAdminOrHR}
                            onBack={() => setViewState("dashboard")}
                        />
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
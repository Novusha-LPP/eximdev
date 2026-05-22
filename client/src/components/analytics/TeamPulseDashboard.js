import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useSpring, useTransform } from 'framer-motion';
import axios from 'axios';
import './ESanchitTV.css';
import './TeamPulse.css';

const AnimatedNumber = ({ value }) => {
    const numericValue = Number(value) || 0;
    const spring = useSpring(0, { mass: 1, stiffness: 50, damping: 15 });
    const display = useTransform(spring, (current) => Math.round(Number(current) || 0));
    useEffect(() => { spring.set(numericValue); }, [numericValue, spring]);
    return <motion.span>{display}</motion.span>;
};

const getStatusMessage = (value, severity) => {
    if (severity === 'green') {
        const msgs = ["All Clear!", "Great job!", "Zero pending!", "Mission Success!"];
        return msgs[value % msgs.length];
    }
    if (severity === 'amber') {
        const msgs = ["Pickup speed!", "Almost there!", "Keep moving!", "Final stretch!"];
        return msgs[value % msgs.length];
    }
    return "Action Required";
};

const getHeaders = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'username': user ? user.username : '',
            'userId': user ? user._id : ''
        }
    };
};

const TeamPulseDashboard = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAutoCycling, setIsAutoCycling] = useState(true);
    const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
    const [currentMemberPageIndex, setCurrentMemberPageIndex] = useState(0);

    // Fetch team pulse data
    const fetchTeamPulse = async () => {
        try {
            const apiBase = process.env.REACT_APP_API_STRING || '/api';
            const response = await axios.get(`${apiBase}/open-points/pulse/teams`, getHeaders());
            if (response.data && response.data.success) {
                setTeams(response.data.teams || []);
                setError(null);
            } else {
                setError("Failed to load pulse data.");
            }
        } catch (err) {
            console.error("Error fetching team pulse:", err);
            setError(err.response?.data?.message || err.message || "Failed to load team pulse data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamPulse();
        // Refresh every 30 seconds to keep live dashboard fresh
        const refreshInterval = setInterval(fetchTeamPulse, 30000);
        return () => clearInterval(refreshInterval);
    }, []);

    // Sync selected team data on updates
    useEffect(() => {
        if (selectedTeam && teams.length > 0) {
            const updated = teams.find(t => t._id === selectedTeam._id);
            if (updated) {
                setSelectedTeam(updated);
            }
        }
    }, [teams, selectedTeam]);

    // Auto-cycle through teams and their members every 3 seconds
    useEffect(() => {
        if (teams.length === 0) return;

        const interval = setInterval(() => {
            if (!selectedTeam) {
                if (isAutoCycling) {
                    setSelectedTeam(teams[0]);
                    setCurrentTeamIndex(0);
                    setCurrentMemberPageIndex(0);
                }
                return;
            }

            const pageSize = 8; // Updated to 8 cards per page to fully utilize blank space!
            const totalPages = Math.ceil((selectedTeam.members?.length || 0) / pageSize);

            if (currentMemberPageIndex + 1 < totalPages) {
                // Next page of members
                setCurrentMemberPageIndex(prev => prev + 1);
            } else {
                // Last page of members reached
                if (isAutoCycling) {
                    // Switch to the next team
                    const nextTeamIdx = (currentTeamIndex + 1) % teams.length;
                    const nextTeam = teams[nextTeamIdx];
                    setCurrentTeamIndex(nextTeamIdx);
                    setSelectedTeam(nextTeam);
                    setCurrentMemberPageIndex(0);
                } else {
                    // Team-level is paused: stay on same team and loop back to page 0!
                    setCurrentMemberPageIndex(0);
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [isAutoCycling, teams, selectedTeam, currentTeamIndex, currentMemberPageIndex]);

    // Initialize first team when starting auto-cycling
    useEffect(() => {
        if (teams.length > 0 && selectedTeam === null && isAutoCycling) {
            setSelectedTeam(teams[0]);
            setCurrentTeamIndex(0);
            setCurrentMemberPageIndex(0);
        }
    }, [teams, isAutoCycling, selectedTeam]);

    if (loading && teams.length === 0) {
        return (
            <div className="tv-dashboard-wrapper">
                <button className="tv-exit-btn" onClick={() => navigate('/')}>← Exit</button>
                <motion.div
                    className="tv-loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
                >
                    LOADING TEAM PULSE...
                </motion.div>
            </div>
        );
    }

    if (error && teams.length === 0) {
        return (
            <div className="tv-dashboard-wrapper">
                <button className="tv-exit-btn" onClick={() => navigate('/')}>← Exit</button>
                <div className="tv-empty-alert" style={{ zIndex: 10 }}>
                    <h3 style={{ color: '#ef4444' }}>System Error</h3>
                    <p style={{ color: '#94a3b8' }}>{error}</p>
                    <button className="tv-back-btn" style={{ margin: '3vh auto 0 auto' }} onClick={fetchTeamPulse}>Retry</button>
                </div>
            </div>
        );
    }

    const handleSelectTeam = (team, index) => {
        setSelectedTeam(team);
        setCurrentTeamIndex(index);
        setCurrentMemberPageIndex(0); // Reset page to 0 on manual selection
        setIsAutoCycling(false); // Pause auto-cycling when a team is clicked manually
    };

    const handleBackToTeams = () => {
        setSelectedTeam(null);
        setCurrentMemberPageIndex(0); // Reset page to 0
        setIsAutoCycling(false); // Pause auto-cycling when manually exiting back to grid
    };

    // Determine page context and overall severity
    const isDetailView = selectedTeam !== null;
    const severity = isDetailView ? selectedTeam.severity : 'green';

    // Pagination for members
    const pageSize = 8;
    const maxPageIndex = isDetailView ? Math.max(0, Math.ceil(selectedTeam.members.length / pageSize) - 1) : 0;
    const safePageIndex = Math.min(currentMemberPageIndex, maxPageIndex);
    const visibleMembers = isDetailView
        ? selectedTeam.members.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize)
        : [];

    return (
        <div className={`tv-dashboard-wrapper tv-severity-${severity} ${!isDetailView ? 'tv-combined-dashboard' : ''}`}>
            <button className="tv-exit-btn" onClick={() => navigate('/')}>← Exit</button>

            {/* Render gorgeous ambient animations for selected team detail views */}
            {isDetailView && severity === 'red' && (
                <div className="tv-ember-container">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="tv-ember" style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 4}s`,
                            animationDuration: `${4 + Math.random() * 4}s`,
                            backgroundColor: ['#ef4444', '#f87171', '#fb923c', '#fca5a5'][Math.floor(Math.random() * 4)],
                            width: `${3 + Math.random() * 5}px`,
                            height: `${3 + Math.random() * 5}px`,
                        }} />
                    ))}
                </div>
            )}

            {isDetailView && severity === 'amber' && (
                <>
                    <div className="tv-radar-ring" />
                    <div className="tv-radar-ping" />
                </>
            )}

            {isDetailView && severity === 'green' && (
                <div className="tv-confetti-container">
                    {[...Array(30)].map((_, i) => (
                        <div key={i} className="tv-confetti" style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2.5 + Math.random() * 3}s`,
                            backgroundColor: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c'][Math.floor(Math.random() * 8)],
                            width: `${6 + Math.random() * 8}px`,
                            height: `${6 + Math.random() * 8}px`,
                        }} />
                    ))}
                </div>
            )}

            <div className="tv-team-container">
                {/* Dashboard Header */}
                <div className="tv-team-header-wrapper">
                    <div className="tv-team-title-sec">
                        {isDetailView ? (
                            <>
                                <h1>{selectedTeam.name}</h1>
                                <p style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
                                    <span>Real-time pending tasks for each team member</span>
                                    {Math.ceil(selectedTeam.members.length / pageSize) > 1 && (
                                        <span className="tv-page-badge">
                                            Page {safePageIndex + 1} of {Math.ceil(selectedTeam.members.length / pageSize)}
                                        </span>
                                    )}
                                </p>
                            </>
                        ) : (
                            <>
                                <h1>Team Pulse</h1>
                                <p>Real-time OpenPoints tracking across all active teams</p>
                            </>
                        )}
                    </div>
                    
                    <div className="tv-header-actions" style={{ display: 'flex', gap: '1vw', alignItems: 'center' }}>
                        {teams.length > 0 && (
                            <motion.button 
                                className={`tv-cycle-btn ${isAutoCycling ? 'tv-cycle-active' : ''}`}
                                onClick={() => {
                                    setIsAutoCycling(!isAutoCycling);
                                    if (!isAutoCycling && teams.length > 0) {
                                        const idx = selectedTeam ? teams.findIndex(t => t._id === selectedTeam._id) : 0;
                                        const activeIdx = idx >= 0 ? idx : 0;
                                        setSelectedTeam(teams[activeIdx]);
                                        setCurrentTeamIndex(activeIdx);
                                        setCurrentMemberPageIndex(0);
                                    }
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isAutoCycling ? (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                        </svg>
                                        Pause Auto-Cycle
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                                            <path d="M8 5v14l11-7z"/>
                                        </svg>
                                        Play Auto-Cycle
                                    </>
                                )}
                            </motion.button>
                        )}

                        {isDetailView && (
                            <motion.button 
                                className="tv-back-btn"
                                onClick={handleBackToTeams}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span>←</span> Back to Teams
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* Dashboard Main Area */}
                <div className="tv-team-scroll-area">
                    {!isDetailView ? (
                        /* ================== ALL TEAMS GRID ================== */
                        <div className="tv-teams-grid">
                            {teams.map((team, idx) => {
                                const statusMsg = getStatusMessage(team.totalPendingCount, team.severity);
                                return (
                                    <motion.div
                                        key={team._id}
                                        className={`tv-pulse-card tv-severity-${team.severity}`}
                                        onClick={() => handleSelectTeam(team, idx)}
                                        whileHover={{ scale: 1.04, y: -4 }}
                                        whileTap={{ scale: 0.98 }}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: idx * 0.05 }}
                                    >
                                        <div className="tv-team-card-details">
                                            <div>
                                                <div className="tv-card-label">{team.name}</div>
                                                {team.department && (
                                                    <span className="tv-team-department-tag">{team.department}</span>
                                                )}
                                                <div className={`tv-card-number tv-number-${team.severity}`} style={{ marginTop: '2vh' }}>
                                                    <AnimatedNumber value={team.totalPendingCount} />
                                                </div>
                                            </div>

                                            <div className="tv-team-card-meta">
                                                <div className="tv-team-hod-info">
                                                    {team.hodDetails?.employee_photo ? (
                                                        <img 
                                                            src={team.hodDetails.employee_photo} 
                                                            alt={team.hodDetails.username} 
                                                            className="tv-hod-avatar"
                                                        />
                                                    ) : (
                                                        <div className="tv-hod-fallback-avatar">
                                                            {team.hodDetails?.first_name?.charAt(0) || team.hodDetails?.username?.charAt(0) || 'H'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="tv-hod-name-lbl">HOD</div>
                                                        <div className="tv-hod-name-val">
                                                            {team.hodDetails?.first_name 
                                                                ? `${team.hodDetails.first_name} ${team.hodDetails.last_name?.charAt(0) || ''}`
                                                                : team.hodDetails?.username || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="tv-team-members-count">
                                                    {team.members?.length || 0} Members
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            {teams.length === 0 && (
                                <div className="tv-empty-alert" style={{ gridColumn: '1 / -1' }}>
                                    <h3>No Active Teams</h3>
                                    <p>Please configure teams in the Team Dashboard first.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ================== TEAM DETAILS GRID ================== */
                        <div>
                            {/* Detailed Celebration message for zero pending team */}
                            {selectedTeam.totalPendingCount === 0 && (
                                <motion.div
                                    className="tv-celebration-msg"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    style={{ textAlign: 'center', marginBottom: '5vh' }}
                                >
                                    🏆 ALL CLEAR! GREAT JOB {selectedTeam.name.toUpperCase()}! 🎉
                                </motion.div>
                            )}

                            <div className="tv-members-grid">
                                {visibleMembers.map((member, idx) => {
                                    const memberSeverity = member.pendingCount === 0 ? 'green' : member.pendingCount <= 5 ? 'amber' : 'red';
                                    const initials = member.first_name ? member.first_name.charAt(0) : member.username?.charAt(0) || 'U';
                                    
                                    return (
                                        <motion.div
                                            key={`${selectedTeam._id}-${safePageIndex}-${member.username || idx}`}
                                            className={`tv-member-card tv-severity-${memberSeverity}`}
                                            onClick={() => navigate(`/open-points/user/${member.username}`)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.97 }}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.3, delay: idx * 0.04 }}
                                        >
                                            {/* Glowing border avatar */}
                                            <div className="tv-member-avatar-container">
                                                {member.employee_photo ? (
                                                    <img 
                                                        src={member.employee_photo} 
                                                        alt={member.username} 
                                                        className="tv-member-avatar"
                                                    />
                                                ) : (
                                                    <div className="tv-member-fallback-avatar">
                                                        {initials}
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="tv-member-name">
                                                {member.first_name 
                                                    ? `${member.first_name} ${member.last_name || ''}`
                                                    : member.username}
                                            </h3>
                                            <div className="tv-member-username">@{member.username}</div>

                                            <div className={`tv-member-pending-num tv-number-${memberSeverity}`}>
                                                <AnimatedNumber value={member.pendingCount} />
                                            </div>

                                            <div className="tv-member-status-lbl">
                                                {memberSeverity === 'green' && <span>🏆 Clear</span>}
                                                {memberSeverity === 'amber' && <span>⚡ Pending</span>}
                                                {memberSeverity === 'red' && <span>🚨 Action</span>}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {selectedTeam.members.length === 0 && (
                                <div className="tv-empty-alert">
                                    <h3>Empty Team</h3>
                                    <p>There are no members listed in this team.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamPulseDashboard;

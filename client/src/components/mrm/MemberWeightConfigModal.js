import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
    TextField, Chip, Checkbox, List, ListItem, ListItemText, Divider,
    CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel, Tabs, Tab,
    IconButton, Table, TableHead, TableRow, TableCell, TableBody, Tooltip, InputAdornment
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon from '@mui/icons-material/Search';
import { fetchMemberWeights, saveMemberWeights, manageSubTeams } from '../../services/mrmService';

/**
 * Pure calculation for an individual user's composite score:
 * Normalizes scores (0-100) and applies user's individual component weights.
 */
const computeUserComposite = (attScore, kpiScore, karmaNorm, attW, kpiW, karmaW) => {
    const totalW = (Number(attW) || 0) + (Number(kpiW) || 0) + (Number(karmaW) || 0);
    if (totalW <= 0) return 0;
    const aNorm = Math.min(100, Math.max(0, Number(attScore) || 0));
    const kNorm = Math.min(100, Math.max(0, Number(kpiScore) || 0));
    const kaNorm = Math.min(100, Math.max(0, Number(karmaNorm) || 0));
    const composite = (aNorm * (attW / totalW)) + (kNorm * (kpiW / totalW)) + (kaNorm * (karmaW / totalW));
    return Number(composite.toFixed(1));
};

const MemberWeightConfigModal = ({
    open,
    onClose,
    department,
    hodId,
    month,
    year,
    onSuccess
}) => {
    const [activeTab, setActiveTab] = useState(0);

    // Individual Members Data
    const [memberRows, setMemberRows] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingWeights, setLoadingWeights] = useState(false);
    const [savingWeights, setSavingWeights] = useState(false);
    const [weightError, setWeightError] = useState(null);
    const [weightSuccess, setWeightSuccess] = useState(null);

    // Sub-team state (Tab 1)
    const [subTeams, setSubTeams] = useState({});
    const [allUsers, setAllUsers] = useState([]);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [savingTeams, setSavingTeams] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [targetSubTeam, setTargetSubTeam] = useState('');
    const [newSubTeamName, setNewSubTeamName] = useState('');
    const [teamError, setTeamError] = useState('');
    const [teamSuccess, setTeamSuccess] = useState('');

    const loadWeightsData = async () => {
        if (!month || !year || !department) return;
        setLoadingWeights(true);
        setWeightError(null);
        try {
            const res = await fetchMemberWeights({ department, hodId, month, year });
            const defaultCw = res.component_weights || { attendance: 34, kpi: 33, karma: 33 };

            const count = (res.members || []).length;
            const equalTeamWeight = count > 0 ? Number((100 / count).toFixed(2)) : 0;

            const rows = (res.members || []).map((m) => {
                const cw = m.component_weights || defaultCw;
                const attW = cw.attendance != null ? Number(cw.attendance) : (defaultCw.attendance ?? 34);
                const kpiW = cw.kpi != null ? Number(cw.kpi) : (defaultCw.kpi ?? 33);
                const karmaW = cw.karma != null ? Number(cw.karma) : (defaultCw.karma ?? 33);
                const karmaNorm = m.karma_norm != null ? m.karma_norm : 100;
                const compScore = computeUserComposite(m.attendance_score, m.kpi_score, karmaNorm, attW, kpiW, karmaW);

                return {
                    userId: m.userId,
                    name: m.name || '',
                    sub_team: m.sub_team || 'General',
                    designation: m.designation || '',
                    att_weight: attW,
                    kpi_weight: kpiW,
                    karma_weight: karmaW,
                    weight_pct: m.weight_pct != null ? Number(m.weight_pct) : equalTeamWeight,
                    is_manual: Boolean(m.is_manual),
                    attendance_score: m.attendance_score || 0,
                    kpi_score: m.kpi_score || 0,
                    karma_points: m.karma_points || 0,
                    karma_norm: karmaNorm,
                    composite_score: compScore
                };
            });

            setMemberRows(rows);
        } catch (err) {
            setWeightError(err.response?.data?.error || err.message || 'Failed to load member weights');
        } finally {
            setLoadingWeights(false);
        }
    };

    const loadSubTeams = async () => {
        if (!department) return;
        setLoadingTeams(true);
        setTeamError('');
        try {
            const res = await manageSubTeams({ department, action: 'list' });
            setSubTeams(res.sub_teams || {});
            setAllUsers(res.users || []);
        } catch (err) {
            setTeamError('Failed to load sub-teams. ' + (err.response?.data?.error || err.message));
        } finally {
            setLoadingTeams(false);
        }
    };

    useEffect(() => {
        if (open) {
            loadWeightsData();
            loadSubTeams();
            setWeightSuccess(null);
            setTeamSuccess('');
            setSelectedUserIds([]);
            setTargetSubTeam('');
            setNewSubTeamName('');
            setSearchTerm('');
        }
    }, [open, department, hodId, month, year]);

    // Live Team Composite Score & Weight Calculations
    const liveCalculations = useMemo(() => {
        if (!memberRows || memberRows.length === 0) {
            return { teamScore: 100, totalTeamWeight: 100, invalidMembersCount: 0 };
        }

        let invalidMembers = 0;
        let totalTeamWeight = 0;

        memberRows.forEach(m => {
            const compSum = m.att_weight + m.kpi_weight + m.karma_weight;
            if (Math.abs(compSum - 100) > 0.5) invalidMembers++;
            totalTeamWeight += (Number(m.weight_pct) || 0);
        });

        let computedTeamScore = 100;
        if (Math.abs(totalTeamWeight - 100) < 1) {
            computedTeamScore = Number(
                memberRows.reduce((acc, m) => acc + (m.composite_score * ((Number(m.weight_pct) || 0) / 100)), 0).toFixed(1)
            );
        } else {
            computedTeamScore = Number(
                (memberRows.reduce((acc, m) => acc + m.composite_score, 0) / memberRows.length).toFixed(1)
            );
        }

        return {
            teamScore: computedTeamScore,
            totalTeamWeight: Number(totalTeamWeight.toFixed(1)),
            invalidMembersCount: invalidMembers
        };
    }, [memberRows]);

    // Handle updating individual user component weights or team weights
    const handleMemberFieldChange = (userId, field, rawVal) => {
        const val = Math.max(0, Math.min(100, parseInt(rawVal, 10) || 0));
        setMemberRows(prev => prev.map(m => {
            if (m.userId !== userId) return m;
            const updated = { ...m, [field]: val };
            if (field === 'weight_pct') {
                updated.is_manual = true;
            } else {
                // Recompute measured composite score immediately
                updated.composite_score = computeUserComposite(
                    updated.attendance_score,
                    updated.kpi_score,
                    updated.karma_norm,
                    updated.att_weight,
                    updated.kpi_weight,
                    updated.karma_weight
                );
            }
            return updated;
        }));
    };

    // Bulk action: Equalize team contribution weights across all members
    const handleEqualizeTeamWeights = () => {
        const count = memberRows.length;
        if (count === 0) return;
        const equalVal = Number((100 / count).toFixed(2));
        setMemberRows(prev => prev.map((m, idx) => ({
            ...m,
            weight_pct: idx === count - 1 ? Number((100 - (equalVal * (count - 1))).toFixed(2)) : equalVal,
            is_manual: false
        })));
    };

    // Save individual user weights
    const handleSaveWeights = async () => {
        if (liveCalculations.invalidMembersCount > 0) {
            setWeightError(`Cannot save: ${liveCalculations.invalidMembersCount} member(s) have component weights that do not sum to 100%. Please review highlighted rows.`);
            return;
        }

        setSavingWeights(true);
        setWeightError(null);
        try {
            const payload = {
                month,
                year,
                department,
                hodId,
                members: memberRows.map(m => ({
                    userId: m.userId,
                    name: m.name,
                    weight_pct: m.weight_pct,
                    is_manual: Boolean(m.is_manual),
                    component_weights: {
                        attendance: m.att_weight,
                        kpi: m.kpi_weight,
                        karma: m.karma_weight
                    }
                }))
            };

            const res = await saveMemberWeights(payload);
            setWeightSuccess('Individual member weights saved and scores recalculated successfully.');
            if (res.members) {
                setMemberRows(prev => prev.map(r => {
                    const serverM = (res.members || []).find(sm => sm.userId?.toString() === r.userId?.toString());
                    if (!serverM) return r;
                    return {
                        ...r,
                        composite_score: serverM.composite_score,
                        attendance_score: serverM.attendance_score,
                        kpi_score: serverM.kpi_score,
                        karma_points: serverM.karma_points
                    };
                }));
            }
            if (onSuccess) onSuccess();
            setTimeout(() => setWeightSuccess(null), 3500);
        } catch (err) {
            setWeightError(err.response?.data?.error || err.message || 'Failed to save member weights');
        } finally {
            setSavingWeights(false);
        }
    };

    // Sub-team actions (Tab 1)
    const handleToggleUser = (userId) => {
        setSelectedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleAssignSubTeam = async () => {
        const teamToAssign = targetSubTeam === 'NEW' ? newSubTeamName.trim() : targetSubTeam.trim();
        if (!teamToAssign) { setTeamError('Please specify a sub-team name'); return; }
        if (selectedUserIds.length === 0) { setTeamError('Select at least one member'); return; }

        setSavingTeams(true);
        setTeamError('');
        try {
            await manageSubTeams({ department, action: 'assign', userIds: selectedUserIds, sub_team: teamToAssign });
            setTeamSuccess(`Assigned ${selectedUserIds.length} member(s) to "${teamToAssign}".`);
            setSelectedUserIds([]);
            setTargetSubTeam('');
            setNewSubTeamName('');
            await loadSubTeams();
            await loadWeightsData();
        } catch (err) {
            setTeamError('Failed to assign: ' + (err.response?.data?.error || err.message));
        } finally {
            setSavingTeams(false);
        }
    };

    const existingTeamNames = Object.keys(subTeams);
    const monthName = new Date(0, parseInt(month, 10) - 1).toLocaleString('default', { month: 'long' });

    // Filtered members by search query
    const filteredRows = useMemo(() => {
        if (!searchTerm.trim()) return memberRows;
        const q = searchTerm.toLowerCase();
        return memberRows.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.sub_team.toLowerCase().includes(q) ||
            m.designation.toLowerCase().includes(q)
        );
    }, [memberRows, searchTerm]);

    const getScoreBadgeColor = (score) => {
        if (score >= 85) return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
        if (score >= 70) return { bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
        return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' };
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: '12px', minHeight: '80vh' } }}>
            <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
                <Box>
                    <Box display="flex" alignItems="center" gap={1.2}>
                        <Typography variant="h6" fontWeight={800} color="#0f172a" fontSize="16px">
                            MRM Settings & Member Measures
                        </Typography>
                        <Chip
                            label="Individual Weights Active"
                            size="small"
                            sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '11px', height: '22px', border: '1px solid #bfdbfe' }}
                        />
                    </Box>
                    <Typography variant="caption" color="#64748b" fontSize="12px">
                        {department} Department &middot; {monthName} {year} &middot; Configure individual measurement weights per user
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </DialogTitle>

            <Box sx={{ borderBottom: '1px solid #e2e8f0' }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ px: 2 }}>
                    <Tab
                        icon={<TuneIcon sx={{ fontSize: 16 }} />}
                        iconPosition="start"
                        label={`Member Weights & Measures (${memberRows.length})`}
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '13px', minHeight: 48 }}
                    />
                    <Tab
                        icon={<GroupsIcon sx={{ fontSize: 16 }} />}
                        iconPosition="start"
                        label="Sub-Teams Configuration"
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '13px', minHeight: 48 }}
                    />
                </Tabs>
            </Box>

            <DialogContent sx={{ p: 2.5 }}>
                {/* === TAB 0: Individual Member Weights & Measures === */}
                {activeTab === 0 && (
                    <Box>
                        {weightError && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{weightError}</Alert>}
                        {weightSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: '8px' }}>{weightSuccess}</Alert>}

                        {/* Top Summary: Live Team Composite Score & Team Controls */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 2,
                            p: 2,
                            bgcolor: '#f8fafc',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            mb: 2.5
                        }}>
                            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                                <Box sx={{
                                    px: 2,
                                    py: 1,
                                    bgcolor: '#ffffff',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: 0.8
                                }}>
                                    <Typography variant="caption" fontWeight={700} color="#64748b" fontSize="11px" sx={{ mr: 0.5 }}>
                                        TEAM COMPOSITE SCORE:
                                    </Typography>
                                    <Typography variant="h5" fontWeight={800} color="#0f172a" lineHeight={1}>
                                        {liveCalculations.teamScore}
                                    </Typography>
                                    <Typography variant="caption" color="#64748b" fontWeight={600}>
                                        / 100
                                    </Typography>
                                </Box>

                                <Box display="flex" alignItems="center" gap={1}>
                                    <Chip
                                        label={`Team Weight Total: ${liveCalculations.totalTeamWeight}%`}
                                        size="small"
                                        color={Math.abs(liveCalculations.totalTeamWeight - 100) < 1 ? 'default' : 'warning'}
                                        sx={{ fontWeight: 700, fontSize: '11px', height: '26px' }}
                                    />
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={handleEqualizeTeamWeights}
                                        disabled={savingWeights || memberRows.length === 0}
                                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '11.5px', borderRadius: '6px', color: '#0f172a', borderColor: '#cbd5e1', bgcolor: '#ffffff', '&:hover': { bgcolor: '#f1f5f9' } }}
                                    >
                                        Equalize Team Wts
                                    </Button>
                                </Box>
                            </Box>

                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="caption" color="#64748b" fontSize="12px">
                                    {memberRows.length} members &middot; Each user measured individually
                                </Typography>
                            </Box>
                        </Box>

                        {/* Search and Table Status Controls */}
                        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1.5}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="subtitle2" fontWeight={700} color="#0f172a" fontSize="13.5px">
                                    Individual User Measurement Rules ({filteredRows.length} of {memberRows.length})
                                </Typography>
                                {liveCalculations.invalidMembersCount > 0 ? (
                                    <Chip
                                        icon={<WarningAmberIcon style={{ fontSize: 13, color: '#dc2626' }} />}
                                        label={`${liveCalculations.invalidMembersCount} Member(s) Weights ≠ 100%`}
                                        size="small"
                                        sx={{ bgcolor: '#fef2f2', color: '#b91c1c', fontWeight: 700, fontSize: '10.5px', height: '22px', border: '1px solid #fecaca' }}
                                    />
                                ) : (
                                    <Chip
                                        icon={<CheckCircleIcon style={{ fontSize: 13, color: '#047857' }} />}
                                        label="All Member Weights Sum to 100%"
                                        size="small"
                                        sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: '10.5px', height: '22px', border: '1px solid #a7f3d0' }}
                                    />
                                )}
                            </Box>

                            <TextField
                                size="small"
                                placeholder="Search member or sub-team..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                                        </InputAdornment>
                                    ),
                                    style: { fontSize: '12px', height: '32px', width: '220px' }
                                }}
                            />
                        </Box>

                        {loadingWeights ? (
                            <Box textAlign="center" py={6}>
                                <CircularProgress size={32} />
                                <Typography variant="caption" display="block" color="#64748b" mt={1}>
                                    Loading member weights & metrics...
                                </Typography>
                            </Box>
                        ) : memberRows.length === 0 ? (
                            <Box textAlign="center" py={6} bgcolor="#f8fafc" borderRadius="8px" border="1px dashed #cbd5e1">
                                <Typography variant="body2" color="#64748b">
                                    No active members found for department "{department}".
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                <Table size="small" sx={{ minWidth: 780 }}>
                                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontSize: '11px', fontWeight: 700, color: '#64748b', py: 1, width: '40px' }} align="center">#</TableCell>
                                            <TableCell sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', py: 1, minWidth: '180px' }}>TEAM MEMBER</TableCell>
                                            <TableCell sx={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', py: 1, width: '120px' }} align="center">ATT WT (%)</TableCell>
                                            <TableCell sx={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', py: 1, width: '120px' }} align="center">KPI WT (%)</TableCell>
                                            <TableCell sx={{ fontSize: '11px', fontWeight: 700, color: '#059669', py: 1, width: '120px' }} align="center">KARMA WT (%)</TableCell>
                                            <TableCell sx={{ fontSize: '11px', fontWeight: 700, color: '#475569', py: 1, width: '90px' }} align="center">SUM</TableCell>
                                            <TableCell sx={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', py: 1, width: '115px' }} align="center">COMPOSITE</TableCell>
                                            <TableCell sx={{ fontSize: '11px', fontWeight: 700, color: '#334155', py: 1, width: '100px' }} align="center">TEAM WT (%)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredRows.map((m, idx) => {
                                            const totalCompW = m.att_weight + m.kpi_weight + m.karma_weight;
                                            const isUserValid = Math.abs(totalCompW - 100) < 0.5;
                                            const scoreBadge = getScoreBadgeColor(m.composite_score);

                                            return (
                                                <TableRow
                                                    key={m.userId}
                                                    hover
                                                    sx={{
                                                        bgcolor: !isUserValid ? '#fff1f2' : 'transparent',
                                                        borderBottom: '1px solid #f1f5f9'
                                                    }}
                                                >
                                                    {/* Index */}
                                                    <TableCell align="center" sx={{ py: 0.8, fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                                                        {idx + 1}
                                                    </TableCell>

                                                    {/* Member Info */}
                                                    <TableCell sx={{ py: 0.8 }}>
                                                        <Typography variant="body2" fontWeight={700} color="#0f172a" fontSize="12.5px" lineHeight={1.2}>
                                                            {m.name}
                                                        </Typography>
                                                        <Box display="flex" alignItems="center" gap={0.6} mt={0.3}>
                                                            <Chip
                                                                label={m.sub_team || 'General'}
                                                                size="small"
                                                                sx={{ height: '18px', fontSize: '9.5px', fontWeight: 600, bgcolor: '#f1f5f9', color: '#475569' }}
                                                            />
                                                            {m.designation && (
                                                                <Typography variant="caption" color="#64748b" fontSize="10px">
                                                                    {m.designation}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </TableCell>

                                                    {/* Attendance Weight */}
                                                    <TableCell align="center" sx={{ py: 0.8 }}>
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            value={m.att_weight}
                                                            onChange={(e) => handleMemberFieldChange(m.userId, 'att_weight', e.target.value)}
                                                            inputProps={{ min: 0, max: 100, style: { width: '42px', textAlign: 'center', fontSize: '12px', padding: '3px 4px', fontWeight: 700 } }}
                                                            disabled={savingWeights}
                                                        />
                                                        <Typography variant="caption" color="#2563eb" display="block" fontSize="9.5px" fontWeight={600} mt={0.2}>
                                                            Score: {m.attendance_score}%
                                                        </Typography>
                                                    </TableCell>

                                                    {/* KPI Weight */}
                                                    <TableCell align="center" sx={{ py: 0.8 }}>
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            value={m.kpi_weight}
                                                            onChange={(e) => handleMemberFieldChange(m.userId, 'kpi_weight', e.target.value)}
                                                            inputProps={{ min: 0, max: 100, style: { width: '42px', textAlign: 'center', fontSize: '12px', padding: '3px 4px', fontWeight: 700 } }}
                                                            disabled={savingWeights}
                                                        />
                                                        <Typography variant="caption" color="#7c3aed" display="block" fontSize="9.5px" fontWeight={600} mt={0.2}>
                                                            Score: {m.kpi_score}%
                                                        </Typography>
                                                    </TableCell>

                                                    {/* Karma Weight */}
                                                    <TableCell align="center" sx={{ py: 0.8 }}>
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            value={m.karma_weight}
                                                            onChange={(e) => handleMemberFieldChange(m.userId, 'karma_weight', e.target.value)}
                                                            inputProps={{ min: 0, max: 100, style: { width: '42px', textAlign: 'center', fontSize: '12px', padding: '3px 4px', fontWeight: 700 } }}
                                                            disabled={savingWeights}
                                                        />
                                                        <Typography variant="caption" color={m.karma_points >= 0 ? '#059669' : '#b91c1c'} display="block" fontSize="9.5px" fontWeight={600} mt={0.2}>
                                                            {m.karma_points > 0 ? `+${m.karma_points}` : m.karma_points} pts
                                                        </Typography>
                                                    </TableCell>

                                                    {/* Total Component Sum */}
                                                    <TableCell align="center" sx={{ py: 0.8 }}>
                                                        {isUserValid ? (
                                                            <Chip
                                                                icon={<CheckCircleIcon style={{ fontSize: 11, color: '#047857' }} />}
                                                                label="100%"
                                                                size="small"
                                                                sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: '10.5px', height: '22px' }}
                                                            />
                                                        ) : (
                                                            <Tooltip title="Component weights must sum to 100%" arrow>
                                                                <Chip
                                                                    icon={<WarningAmberIcon style={{ fontSize: 11, color: '#dc2626' }} />}
                                                                    label={`${totalCompW}%`}
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: '#fef2f2',
                                                                        color: '#b91c1c',
                                                                        fontWeight: 800,
                                                                        fontSize: '10.5px',
                                                                        height: '22px',
                                                                        border: '1px solid #fecaca'
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        )}
                                                    </TableCell>

                                                    {/* Measured Composite Score */}
                                                    <TableCell align="center" sx={{ py: 0.8 }}>
                                                        <Box sx={{
                                                            px: 1,
                                                            py: 0.4,
                                                            borderRadius: '6px',
                                                            bgcolor: scoreBadge.bg,
                                                            color: scoreBadge.text,
                                                            border: `1px solid ${scoreBadge.border}`,
                                                            display: 'inline-flex',
                                                            alignItems: 'baseline',
                                                            gap: 0.3
                                                        }}>
                                                            <Typography variant="body2" fontWeight={800} fontSize="12.5px" lineHeight={1}>
                                                                {m.composite_score}
                                                            </Typography>
                                                            <Typography variant="caption" fontSize="9px" fontWeight={600} sx={{ opacity: 0.75 }}>
                                                                /100
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>

                                                    {/* Team Contribution Weight % */}
                                                    <TableCell align="center" sx={{ py: 0.8 }}>
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            value={m.weight_pct}
                                                            onChange={(e) => handleMemberFieldChange(m.userId, 'weight_pct', e.target.value)}
                                                            inputProps={{ min: 0, max: 100, step: 0.5, style: { width: '46px', textAlign: 'center', fontSize: '12px', padding: '3px 4px', fontWeight: 700 } }}
                                                            disabled={savingWeights}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </Box>
                )}

                {/* === TAB 1: Sub-Teams Configuration === */}
                {activeTab === 1 && (
                    <Box>
                        {teamError && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{teamError}</Alert>}
                        {teamSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: '8px' }}>{teamSuccess}</Alert>}

                        {loadingTeams ? (
                            <Box textAlign="center" py={4}><CircularProgress size={28} /></Box>
                        ) : (
                            <>
                                <Typography variant="subtitle2" fontWeight={700} color="#1e293b" mb={1} fontSize="13px">
                                    Current Sub-Teams ({existingTeamNames.length}):
                                </Typography>
                                <Box display="flex" flexWrap="wrap" gap={1} mb={2.5}>
                                    {existingTeamNames.map((tName) => (
                                        <Chip
                                            key={tName}
                                            label={`${tName} (${(subTeams[tName] || []).length})`}
                                            color={tName === 'General' ? 'default' : 'primary'}
                                            variant="outlined"
                                            size="small"
                                            sx={{ fontWeight: 600, fontSize: '11px' }}
                                        />
                                    ))}
                                </Box>

                                <Divider sx={{ mb: 2 }} />

                                <Typography variant="subtitle2" fontWeight={700} color="#1e293b" mb={1.5} fontSize="13px">
                                    Assign Members to a Sub-Team:
                                </Typography>

                                <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
                                    <FormControl size="small" sx={{ minWidth: 180 }}>
                                        <InputLabel>Target Sub-Team</InputLabel>
                                        <Select value={targetSubTeam} label="Target Sub-Team" onChange={(e) => setTargetSubTeam(e.target.value)}>
                                            {existingTeamNames.map((t) => (
                                                <MenuItem key={t} value={t}>{t}</MenuItem>
                                            ))}
                                            <MenuItem value="NEW">+ Create New...</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {targetSubTeam === 'NEW' && (
                                        <TextField
                                            size="small"
                                            label="New Sub-Team Name"
                                            placeholder="e.g. DU, Ops"
                                            value={newSubTeamName}
                                            onChange={(e) => setNewSubTeamName(e.target.value)}
                                            sx={{ minWidth: 180 }}
                                        />
                                    )}

                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleAssignSubTeam}
                                        disabled={savingTeams || selectedUserIds.length === 0 || !targetSubTeam}
                                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '12px' }}
                                    >
                                        {savingTeams ? 'Assigning...' : `Assign (${selectedUserIds.length})`}
                                    </Button>
                                </Box>

                                <Box sx={{ maxHeight: 340, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <List dense disablePadding>
                                        {allUsers.map((user) => {
                                            const isSelected = selectedUserIds.includes(user._id);
                                            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
                                            const currentSubTeam = user.sub_team || 'General';
                                            return (
                                                <ListItem
                                                    key={user._id}
                                                    onClick={() => handleToggleUser(user._id)}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        bgcolor: isSelected ? '#eff6ff' : 'transparent',
                                                        borderBottom: '1px solid #f1f5f9',
                                                        '&:hover': { bgcolor: isSelected ? '#dbeafe' : '#f8fafc' }
                                                    }}
                                                >
                                                    <Checkbox edge="start" checked={isSelected} tabIndex={-1} disableRipple size="small" />
                                                    <ListItemText
                                                        primary={fullName}
                                                        secondary={user.designation || user.username}
                                                        primaryTypographyProps={{ fontSize: '12px', fontWeight: 600 }}
                                                        secondaryTypographyProps={{ fontSize: '10.5px' }}
                                                    />
                                                    <Chip label={currentSubTeam} size="small" sx={{ fontSize: '10px', height: '20px' }} />
                                                </ListItem>
                                            );
                                        })}
                                    </List>
                                </Box>
                            </>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
                <Box>
                    {activeTab === 0 && (
                        <Typography variant="caption" color={liveCalculations.invalidMembersCount > 0 ? '#dc2626' : '#64748b'} fontWeight={600} fontSize="11px">
                            {liveCalculations.invalidMembersCount > 0
                                ? `⚠️ Please fix ${liveCalculations.invalidMembersCount} member(s) whose weights do not sum to 100%`
                                : `✓ All ${memberRows.length} member weights valid. Team Weight Total: ${liveCalculations.totalTeamWeight}%`}
                        </Typography>
                    )}
                </Box>
                <Box display="flex" gap={1}>
                    <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>Close</Button>
                    {activeTab === 0 && (
                        <Button
                            onClick={handleSaveWeights}
                            variant="contained"
                            disabled={liveCalculations.invalidMembersCount > 0 || savingWeights || memberRows.length === 0}
                            startIcon={savingWeights ? <CircularProgress size={14} color="inherit" /> : null}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                bgcolor: '#059669',
                                '&:hover': { bgcolor: '#047857' },
                                borderRadius: '8px',
                                px: 2
                            }}
                        >
                            {savingWeights ? 'Saving & Measuring...' : 'Save Individual Weights & Recalculate'}
                        </Button>
                    )}
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default MemberWeightConfigModal;

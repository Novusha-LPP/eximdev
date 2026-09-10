import React, { useState } from 'react';
import { 
    Box, Typography, Chip, Button, IconButton, Collapse, Table, TableHead, 
    TableRow, TableCell, TableBody, TableFooter, Paper, Tooltip, Dialog, 
    DialogTitle, DialogContent, DialogActions, Avatar, Tabs, Tab, FormControlLabel,
    Checkbox, TextField, InputAdornment
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LockIcon from '@mui/icons-material/Lock';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SearchIcon from '@mui/icons-material/Search';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import RecurringBlockerBadge from './RecurringBlockerBadge';
import { approveSegmentsRollup } from '../../services/mrmService';

/**
 * Section 2: Sub-Team KPI Performance Segments
 * Displays clustered sub-team cards with automated 2-signal RAG,
 * structured executive member operational roster, and interactive task breakdown matrix.
 */
const SegmentRollupView = ({ 
    segments = [], 
    department, 
    month, 
    year, 
    isHodOrAdmin = false, 
    onApprovalComplete 
}) => {
    const [filter, setFilter] = useState('REDS_FIRST'); // 'ALL', 'REDS_FIRST', 'RED', 'AMBER', 'GREEN'
    const [expandedSegments, setExpandedSegments] = useState({});
    const [activeTabs, setActiveTabs] = useState({}); // segmentSubTeam -> 0 (Roster) or 1 (Tasks)
    const [hideZeroTasks, setHideZeroTasks] = useState(true);
    const [showTemplateMatrix, setShowTemplateMatrix] = useState({});
    const [taskSearch, setTaskSearch] = useState({});
    const [approving, setApproving] = useState(false);
    const [openApproveDialog, setOpenApproveDialog] = useState(false);
    const [approvalSuccess, setApprovalSuccess] = useState('');
    const [toastMessage, setToastMessage] = useState('');

    const toggleExpand = (subTeam) => {
        setExpandedSegments(prev => ({
            ...prev,
            [subTeam]: !prev[subTeam]
        }));
    };

    const handleTabChange = (subTeam, newTab) => {
        setActiveTabs(prev => ({
            ...prev,
            [subTeam]: newTab
        }));
    };

    const handlePingMember = (memberName) => {
        setToastMessage(`Reminder ping sent to ${memberName}.`);
        setTimeout(() => setToastMessage(''), 4000);
    };

    // Filter counts
    const redCount = segments.filter(s => s.final_rag === 'Red').length;
    const amberCount = segments.filter(s => s.final_rag === 'Amber').length;
    const greenCount = segments.filter(s => s.final_rag === 'Green').length;

    let displayedSegments = [...segments];
    if (filter === 'REDS_FIRST') {
        const ragPriority = { Red: 0, Amber: 1, Green: 2 };
        displayedSegments.sort((a, b) => ragPriority[a.final_rag] - ragPriority[b.final_rag]);
    } else if (filter === 'RED') {
        displayedSegments = displayedSegments.filter(s => s.final_rag === 'Red');
    } else if (filter === 'AMBER') {
        displayedSegments = displayedSegments.filter(s => s.final_rag === 'Amber');
    } else if (filter === 'GREEN') {
        displayedSegments = displayedSegments.filter(s => s.final_rag === 'Green');
    }

    const handleApproveAll = async () => {
        setApproving(true);
        try {
            const res = await approveSegmentsRollup({ department, month, year });
            setOpenApproveDialog(false);
            setApprovalSuccess('Department KPI segments approved and rolled into MRM successfully!');
            setTimeout(() => setApprovalSuccess(''), 4000);
            if (onApprovalComplete) onApprovalComplete(res);
        } catch (err) {
            console.error('Failed to approve segments:', err);
        } finally {
            setApproving(false);
        }
    };

    const getRagStyles = (rag) => {
        switch (rag) {
            case 'Red':
                return {
                    border: '#f87171',
                    bg: '#fff5f5',
                    badgeBg: '#fee2e2',
                    badgeText: '#991b1b',
                    dot: '#ef4444',
                    accent: '#b91c1c'
                };
            case 'Amber':
                return {
                    border: '#fde047',
                    bg: '#fefce8',
                    badgeBg: '#fef3c7',
                    badgeText: '#92400e',
                    dot: '#f59e0b',
                    accent: '#d97706'
                };
            case 'Green':
            default:
                return {
                    border: '#86efac',
                    bg: '#f0fdf4',
                    badgeBg: '#dcfce7',
                    badgeText: '#166534',
                    dot: '#10b981',
                    accent: '#059669'
                };
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .filter(Boolean)
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    /**
     * Formats a clean, readable RAG reason badge
     * Eliminates long ugly lists of member names
     */
    const getCleanReasonBadge = (segment) => {
        const flags = segment.flags || {};
        const unsubmitted = flags.unsubmitted_members || [];
        const total = (segment.contributing_members || []).length;

        if (flags.has_unsubmitted || unsubmitted.length > 0) {
            if (unsubmitted.length === total && total > 0) {
                return `⚠️ All ${total} Submissions Pending`;
            }
            if (unsubmitted.length > 2) {
                return `⚠️ ${unsubmitted.length} Submissions Pending`;
            }
            return `⚠️ Pending: ${unsubmitted.join(', ')}`;
        }

        // Check if raw reason_badge contains missed submissions from legacy data
        if (segment.reason_badge && segment.reason_badge.includes('Missed Submission')) {
            return `⚠️ Submissions Pending`;
        }

        if (segment.is_cold_start) {
            if (segment.flag_status === 'Red') {
                return `⚠️ Operational Flag (Cold Start)`;
            }
            return `🟢 Clean (Cold Start)`;
        }

        if (flags.has_business_loss && flags.business_loss_total > 0) {
            return `⚠️ Loss: ₹${flags.business_loss_total.toLocaleString('en-IN')}`;
        }

        if (flags.has_blockers && flags.blockers_count > 0) {
            return `⚠️ ${flags.blockers_count} Active Blocker${flags.blockers_count > 1 ? 's' : ''}`;
        }

        if (segment.trend_status === 'Amber') {
            return `⚠️ Trend Deviation (${segment.trend_deviation_pct}%)`;
        }

        if (segment.final_rag === 'Green') {
            return `🟢 On Trend & Clean`;
        }

        return segment.reason_badge || 'Automated RAG';
    };

    const sectionTitle = 'Section 2: Team KPI Performance';
    const segmentCountLabel = `${department || 'Department'} Team`;

    return (
        <Box sx={{ mt: 3, mb: 4 }}>
            {/* Section Header & Controls */}
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
                <Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6" fontWeight={800} color="#0f172a" lineHeight={1.2}>
                            {sectionTitle}
                        </Typography>
                        <Chip 
                            label={segmentCountLabel}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '11px', bgcolor: '#f1f5f9', color: '#475569' }}
                        />
                    </Box>
                    <Typography variant="caption" color="#64748b">
                        Weight: 70% of Monthly HOD Score | Automated 2-Signal RAG (Trend Deviation + Operational Flags)
                    </Typography>
                </Box>

                {/* Filter Controls (shown if multiple teams) & Approval Action */}
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    {segments.length > 1 && (
                        <>
                            <Button
                                size="small"
                                variant={filter === 'REDS_FIRST' ? 'contained' : 'outlined'}
                                onClick={() => setFilter('REDS_FIRST')}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    bgcolor: filter === 'REDS_FIRST' ? '#b91c1c' : 'transparent',
                                    color: filter === 'REDS_FIRST' ? '#ffffff' : '#b91c1c',
                                    borderColor: '#f87171',
                                    '&:hover': { bgcolor: filter === 'REDS_FIRST' ? '#991b1b' : '#fee2e2' }
                                }}
                            >
                                🔴 Reds First ({redCount})
                            </Button>

                            <Button
                                size="small"
                                variant={filter === 'ALL' ? 'contained' : 'outlined'}
                                onClick={() => setFilter('ALL')}
                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '12px' }}
                            >
                                All Teams ({segments.length})
                            </Button>

                            <Button
                                size="small"
                                variant={filter === 'AMBER' ? 'contained' : 'outlined'}
                                onClick={() => setFilter('AMBER')}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    color: filter === 'AMBER' ? '#ffffff' : '#b45309',
                                    bgcolor: filter === 'AMBER' ? '#b45309' : 'transparent',
                                    borderColor: '#fde68a',
                                    '&:hover': { bgcolor: filter === 'AMBER' ? '#92400e' : '#fef3c7' }
                                }}
                            >
                                ⚠️ Ambers ({amberCount})
                            </Button>

                            <Button
                                size="small"
                                variant={filter === 'GREEN' ? 'contained' : 'outlined'}
                                onClick={() => setFilter('GREEN')}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    color: filter === 'GREEN' ? '#ffffff' : '#047857',
                                    bgcolor: filter === 'GREEN' ? '#047857' : 'transparent',
                                    borderColor: '#a7f3d0',
                                    '&:hover': { bgcolor: filter === 'GREEN' ? '#065f46' : '#dcfce7' }
                                }}
                            >
                                🟢 Greens ({greenCount})
                            </Button>
                        </>
                    )}

                    {isHodOrAdmin && (
                        <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<LockIcon sx={{ fontSize: 14 }} />}
                            onClick={() => setOpenApproveDialog(true)}
                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '12px', ml: 1 }}
                        >
                            Approve & Roll Up to MRM
                        </Button>
                    )}
                </Box>
            </Box>

            {approvalSuccess && (
                <Box sx={{ p: 1.5, mb: 2, bgcolor: '#ecfdf5', color: '#065f46', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '13px', fontWeight: 600 }}>
                    {approvalSuccess}
                </Box>
            )}

            {toastMessage && (
                <Box sx={{ p: 1.2, mb: 2, bgcolor: '#eff6ff', color: '#1e40af', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '12px', fontWeight: 600 }}>
                    {toastMessage}
                </Box>
            )}

            {/* List of Segment Cards */}
            {displayedSegments.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                    <Typography variant="body2" color="#64748b" fontWeight={500}>
                        No team records match the selected filter.
                    </Typography>
                </Paper>
            ) : (
                <Box display="flex" flexDirection="column" gap={2.5}>
                    {displayedSegments.map((segment) => {
                        const ragTheme = getRagStyles(segment.final_rag);
                        const isExpanded = Boolean(expandedSegments[segment.sub_team]);
                        const activeTab = activeTabs[segment.sub_team] || 0;
                        const members = segment.contributing_members || [];
                        const memberNamesList = members.map(m => m.name).join(', ');
                        const submittedMembers = members.filter(m => m.submitted);
                        const cleanReason = getCleanReasonBadge(segment);
                        const isGeneralTeam = segment.sub_team === 'General';
                        const teamDisplayName = isGeneralTeam ? `${department || 'Department'} Team` : `${segment.sub_team} Sub-Team`;

                        // Max tasks among members for relative bar
                        const maxMemberTasks = Math.max(...members.map(m => m.task_count || 0), 1);

                        // Task Breakdown Filter & Search
                        const currentSearch = (taskSearch[segment.sub_team] || '').toLowerCase();
                        let filteredTasks = segment.task_breakdown || [];
                        if (hideZeroTasks && !showTemplateMatrix[segment.sub_team]) {
                            filteredTasks = filteredTasks.filter(t => (t.total_count || 0) > 0);
                        }
                        if (currentSearch) {
                            filteredTasks = filteredTasks.filter(t => t.task_name.toLowerCase().includes(currentSearch));
                        }

                        const allTasksZero = (segment.task_breakdown || []).every(t => (t.total_count || 0) === 0);

                        return (
                            <Paper
                                key={segment.sub_team}
                                elevation={0}
                                sx={{
                                    border: `1.5px solid ${ragTheme.border}`,
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                                    transition: 'all 0.2s ease',
                                    '&:hover': { boxShadow: '0 6px 16px rgba(0,0,0,0.06)' }
                                }}
                            >
                                {/* ═══ SEGMENT HEADER BANNER ═══ */}
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: ragTheme.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: 1.5,
                                        cursor: 'pointer',
                                        userSelect: 'none'
                                    }}
                                    onClick={() => toggleExpand(segment.sub_team)}
                                >
                                    {/* Left: Status Dot, Sub-Team Title, Member Pill, Reason Pill */}
                                    <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                                        {/* Status Dot with Glow */}
                                        <Box sx={{
                                            width: 13,
                                            height: 13,
                                            borderRadius: '50%',
                                            bgcolor: ragTheme.dot,
                                            boxShadow: `0 0 0 3px ${ragTheme.badgeBg}`
                                        }} />

                                        {/* Clean Sub-Team Title */}
                                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ letterSpacing: '-0.2px' }}>
                                            {teamDisplayName}
                                        </Typography>

                                        {/* Member Count Chip with Hover Tooltip */}
                                        <Tooltip 
                                            title={
                                                <Box sx={{ p: 0.5 }}>
                                                    <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
                                                        Team Roster ({members.length}):
                                                    </Typography>
                                                    {members.map(m => (
                                                        <Typography key={m.userId} variant="caption" display="block" fontSize="11px">
                                                            • {m.name} {m.submitted ? '✓' : '(Pending)'}
                                                        </Typography>
                                                    ))}
                                                </Box>
                                            }
                                            arrow 
                                            placement="top"
                                        >
                                            <Chip
                                                icon={<PeopleOutlineIcon sx={{ fontSize: 14 }} />}
                                                label={`${members.length} Member${members.length !== 1 ? 's' : ''}`}
                                                size="small"
                                                sx={{
                                                    bgcolor: '#ffffff',
                                                    color: '#475569',
                                                    fontWeight: 600,
                                                    fontSize: '11px',
                                                    height: '22px',
                                                    border: '1px solid #cbd5e1',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </Tooltip>

                                        {/* Clean Scannable Reason Badge */}
                                        <Chip
                                            label={cleanReason}
                                            size="small"
                                            sx={{
                                                bgcolor: ragTheme.badgeBg,
                                                color: ragTheme.badgeText,
                                                fontWeight: 700,
                                                fontSize: '11px',
                                                border: `1px solid ${ragTheme.border}`,
                                                height: '22px'
                                            }}
                                        />
                                    </Box>

                                    {/* Right: Score Pill & Collapse Chevron */}
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            gap: 0.5,
                                            px: 1.5,
                                            py: 0.4,
                                            bgcolor: '#ffffff',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1'
                                        }}>
                                            <Typography variant="body2" fontWeight={800} color="#0f172a" fontSize="13px">
                                                {segment.segment_score || 0}
                                            </Typography>
                                            <Typography variant="caption" color="#64748b" fontSize="10px" fontWeight={600}>
                                                / 100 pts
                                            </Typography>
                                        </Box>

                                        <IconButton size="small" sx={{ color: '#475569' }}>
                                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </Box>
                                </Box>

                                {/* ═══ OPERATIONAL METRIC STRIP (5 CLEAN TILES) ═══ */}
                                <Box sx={{
                                    p: 1.5,
                                    bgcolor: '#ffffff',
                                    borderTop: '1px solid #f1f5f9',
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: 'repeat(2, 1fr)',
                                        sm: 'repeat(3, 1fr)',
                                        md: 'repeat(5, 1fr)'
                                    },
                                    gap: 1.5
                                }}>
                                    {/* Tile 1: Monthly Tasks */}
                                    <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <Box display="flex" alignItems="center" gap={0.8} mb={0.4}>
                                            <TaskAltIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                                            <Typography variant="caption" fontWeight={600} color="#64748b">
                                                Monthly Output
                                            </Typography>
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" fontSize="13px">
                                            {segment.total_tasks || 0} tasks
                                        </Typography>
                                        {segment.total_tasks === 0 && segment.flags?.has_unsubmitted && (
                                            <Typography variant="caption" color="#94a3b8" fontSize="10px">
                                                Submissions in progress
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Tile 2: 3M Benchmark & Trend */}
                                    <Box sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <Box display="flex" alignItems="center" gap={0.8} mb={0.4}>
                                            <TrendingUpIcon sx={{ fontSize: 16, color: '#6366f1' }} />
                                            <Typography variant="caption" fontWeight={600} color="#64748b">
                                                3M Benchmark
                                            </Typography>
                                        </Box>
                                        {segment.is_cold_start ? (
                                            <Chip label="Cold Start (M 1-3)" size="small" sx={{ fontSize: '10px', height: '18px' }} />
                                        ) : (
                                            <>
                                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" fontSize="13px">
                                                    {segment.trailing_3m_avg ? `${segment.trailing_3m_avg} avg` : '—'}
                                                </Typography>
                                                {/* If tasks are 0 because of pending submissions, avoid screaming -100% false alarm */}
                                                {segment.total_tasks === 0 && segment.flags?.has_unsubmitted ? (
                                                    <Typography variant="caption" color="#b45309" fontSize="10px" fontWeight={600}>
                                                        ⏳ Submissions Pending
                                                    </Typography>
                                                ) : (
                                                    <Typography 
                                                        variant="caption" 
                                                        fontSize="10px" 
                                                        fontWeight={700}
                                                        color={segment.trend_status === 'Red' ? '#b91c1c' : (segment.trend_status === 'Amber' ? '#b45309' : '#047857')}
                                                    >
                                                        {segment.trend_deviation_pct > 0 ? `+${segment.trend_deviation_pct}` : segment.trend_deviation_pct}% trend
                                                    </Typography>
                                                )}
                                            </>
                                        )}
                                    </Box>

                                    {/* Tile 3: Business Loss */}
                                    <Box sx={{ 
                                        p: 1.2, 
                                        bgcolor: segment.flags?.has_business_loss ? '#fef2f2' : '#f8fafc', 
                                        borderRadius: '8px', 
                                        border: `1px solid ${segment.flags?.has_business_loss ? '#fecaca' : '#e2e8f0'}` 
                                    }}>
                                        <Box display="flex" alignItems="center" gap={0.8} mb={0.4}>
                                            <CurrencyRupeeIcon sx={{ fontSize: 16, color: segment.flags?.has_business_loss ? '#b91c1c' : '#10b981' }} />
                                            <Typography variant="caption" fontWeight={600} color={segment.flags?.has_business_loss ? '#991b1b' : '#64748b'}>
                                                Business Loss
                                            </Typography>
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color={segment.flags?.has_business_loss ? '#b91c1c' : '#047857'} fontSize="13px">
                                            {segment.flags?.has_business_loss 
                                                ? `₹ ${segment.flags?.business_loss_total?.toLocaleString('en-IN')}` 
                                                : '₹ 0 (Clean)'}
                                        </Typography>
                                        {segment.flags?.has_business_loss && (
                                            <Typography variant="caption" color="#b91c1c" fontSize="10px">
                                                Flagged for MRM
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Tile 4: Operational Blockers */}
                                    <Box sx={{ 
                                        p: 1.2, 
                                        bgcolor: segment.flags?.has_blockers ? '#fffbeb' : '#f8fafc', 
                                        borderRadius: '8px', 
                                        border: `1px solid ${segment.flags?.has_blockers ? '#fde68a' : '#e2e8f0'}` 
                                    }}>
                                        <Box display="flex" alignItems="center" gap={0.8} mb={0.4}>
                                            <ReportProblemOutlinedIcon sx={{ fontSize: 16, color: segment.flags?.has_blockers ? '#b45309' : '#64748b' }} />
                                            <Typography variant="caption" fontWeight={600} color={segment.flags?.has_blockers ? '#92400e' : '#64748b'}>
                                                Blockers
                                            </Typography>
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color={segment.flags?.has_blockers ? '#b45309' : '#0f172a'} fontSize="13px">
                                            {segment.flags?.has_blockers ? `${segment.flags?.blockers_count} reported` : 'None (Clean)'}
                                        </Typography>
                                    </Box>

                                    {/* Tile 5: Submissions */}
                                    <Box sx={{ 
                                        p: 1.2, 
                                        bgcolor: submittedMembers.length === members.length && members.length > 0 ? '#f0fdf4' : '#fff5f5', 
                                        borderRadius: '8px', 
                                        border: `1px solid ${submittedMembers.length === members.length && members.length > 0 ? '#bbf7d0' : '#fed7d7'}` 
                                    }}>
                                        <Box display="flex" alignItems="center" gap={0.8} mb={0.4}>
                                            <CheckCircleIcon sx={{ fontSize: 16, color: submittedMembers.length === members.length && members.length > 0 ? '#047857' : '#b91c1c' }} />
                                            <Typography variant="caption" fontWeight={600} color={submittedMembers.length === members.length && members.length > 0 ? '#065f46' : '#991b1b'}>
                                                Submissions
                                            </Typography>
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} color={submittedMembers.length === members.length && members.length > 0 ? '#047857' : '#b91c1c'} fontSize="13px">
                                            {submittedMembers.length} / {members.length} Complete
                                        </Typography>
                                        {members.length - submittedMembers.length > 0 && (
                                            <Typography variant="caption" color="#b91c1c" fontSize="10px" fontWeight={600}>
                                                {members.length - submittedMembers.length} Pending
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>

                                {/* ═══ COLLAPSIBLE DRILLDOWN SECTION WITH TABS ═══ */}
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                    <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderTop: '1px dashed #cbd5e1' }}>
                                        {/* Sub-Tabs: Member Roster vs Task Breakdown */}
                                        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                                            <Tabs 
                                                value={activeTab} 
                                                onChange={(e, val) => handleTabChange(segment.sub_team, val)}
                                                sx={{
                                                    minHeight: 38,
                                                    '& .MuiTab-root': {
                                                        minHeight: 38,
                                                        py: 0.5,
                                                        textTransform: 'none',
                                                        fontWeight: 700,
                                                        fontSize: '13px'
                                                    }
                                                }}
                                            >
                                                <Tab label={`👥 Member Operational Roster (${members.length})`} />
                                                <Tab label={`📊 Task Breakdown Matrix (${segment.task_breakdown?.length || 0})`} />
                                            </Tabs>
                                        </Box>

                                        {/* ─── TAB 1: EXECUTIVE MEMBER OPERATIONAL ROSTER TABLE ─── */}
                                        {activeTab === 0 && (
                                            <Box>
                                                <Table size="small" sx={{ bgcolor: '#ffffff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                                        <TableRow>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569' }}>MEMBER</TableCell>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569' }} align="center">SUBMISSION STATUS</TableCell>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569' }} align="center">TASKS LOGGED</TableCell>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569' }} align="center">BUSINESS LOSS</TableCell>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569' }}>BLOCKERS</TableCell>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569' }} align="center">OPEN POINTS</TableCell>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569' }} align="center">ACTION</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {members.map((m) => (
                                                            <TableRow key={m.userId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                                {/* Member Info */}
                                                                <TableCell sx={{ py: 1.2 }}>
                                                                    <Box display="flex" alignItems="center" gap={1.2}>
                                                                        <Avatar 
                                                                            sx={{ 
                                                                                width: 26, 
                                                                                height: 26, 
                                                                                fontSize: '10px', 
                                                                                fontWeight: 700,
                                                                                bgcolor: m.submitted ? '#dcfce7' : '#fee2e2',
                                                                                color: m.submitted ? '#166534' : '#991b1b',
                                                                                border: `1px solid ${m.submitted ? '#86efac' : '#fca5a5'}`
                                                                            }}
                                                                        >
                                                                            {getInitials(m.name)}
                                                                        </Avatar>
                                                                        <Box>
                                                                            <Typography variant="body2" fontWeight={700} color="#0f172a" fontSize="12px" lineHeight={1.2}>
                                                                                {m.name}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="#64748b" fontSize="10px">
                                                                                {teamDisplayName}
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>
                                                                </TableCell>

                                                                {/* Submission Status */}
                                                                <TableCell align="center" sx={{ py: 1.2 }}>
                                                                    {m.submitted ? (
                                                                        <Chip 
                                                                            label="Submitted" 
                                                                            size="small" 
                                                                            icon={<CheckCircleIcon sx={{ fontSize: 13, color: '#166534' }} />}
                                                                            sx={{ 
                                                                                bgcolor: '#dcfce7', 
                                                                                color: '#166534', 
                                                                                border: '1px solid #86efac', 
                                                                                fontSize: '10px', 
                                                                                fontWeight: 700, 
                                                                                height: '20px' 
                                                                            }} 
                                                                        />
                                                                    ) : (
                                                                        <Chip 
                                                                            label="Pending" 
                                                                            size="small" 
                                                                            sx={{ 
                                                                                bgcolor: '#fee2e2', 
                                                                                color: '#991b1b', 
                                                                                border: '1px solid #fca5a5', 
                                                                                fontSize: '10px', 
                                                                                fontWeight: 700, 
                                                                                height: '20px' 
                                                                            }} 
                                                                        />
                                                                    )}
                                                                </TableCell>

                                                                {/* Tasks Logged */}
                                                                <TableCell align="center" sx={{ py: 1.2 }}>
                                                                    <Typography variant="body2" fontWeight={700} color="#0f172a" fontSize="12px">
                                                                        {m.task_count || 0}
                                                                    </Typography>
                                                                </TableCell>

                                                                {/* Business Loss */}
                                                                <TableCell align="center" sx={{ py: 1.2 }}>
                                                                    {m.business_loss > 0 ? (
                                                                        <Tooltip title={m.business_loss_remarks || 'Business loss reported'} arrow>
                                                                            <Chip 
                                                                                label={`₹ ${m.business_loss.toLocaleString('en-IN')}`}
                                                                                size="small"
                                                                                sx={{
                                                                                    bgcolor: '#fee2e2',
                                                                                    color: '#991b1b',
                                                                                    fontWeight: 700,
                                                                                    fontSize: '11px',
                                                                                    height: '20px',
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            />
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <Typography variant="caption" color="#047857" fontWeight={600}>
                                                                            ₹ 0 (Clean)
                                                                        </Typography>
                                                                    )}
                                                                </TableCell>

                                                                {/* Blockers */}
                                                                <TableCell sx={{ py: 1.2, maxWidth: 220 }}>
                                                                    {m.has_blockers ? (
                                                                        <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                                                                            <Typography variant="caption" color="#b91c1c" fontWeight={600} fontSize="11px">
                                                                                {m.blockers_summary}
                                                                            </Typography>
                                                                            {m.blockers_recurrence_key && (
                                                                                <RecurringBlockerBadge blocker={m.blockers_summary} consecutiveCount={2} />
                                                                            )}
                                                                        </Box>
                                                                    ) : (
                                                                        <Typography variant="caption" color="#64748b">
                                                                            — None
                                                                        </Typography>
                                                                    )}
                                                                </TableCell>

                                                                {/* Open Points */}
                                                                <TableCell align="center" sx={{ py: 1.2 }}>
                                                                    <Typography variant="caption" color={m.open_points_count > 0 ? '#1e293b' : '#94a3b8'} fontWeight={600}>
                                                                        {m.open_points_count || 0} items
                                                                    </Typography>
                                                                </TableCell>

                                                                {/* Action */}
                                                                <TableCell align="center" sx={{ py: 1.2 }}>
                                                                    {!m.submitted && (
                                                                        <Button
                                                                            size="small"
                                                                            variant="outlined"
                                                                            startIcon={<NotificationsActiveIcon sx={{ fontSize: 11 }} />}
                                                                            onClick={() => handlePingMember(m.name)}
                                                                            sx={{
                                                                                fontSize: '10px',
                                                                                py: '1px',
                                                                                px: '6px',
                                                                                minWidth: 'unset',
                                                                                textTransform: 'none',
                                                                                fontWeight: 600,
                                                                                color: '#b91c1c',
                                                                                borderColor: '#fca5a5',
                                                                                '&:hover': { bgcolor: '#fee2e2' }
                                                                            }}
                                                                        >
                                                                            Ping
                                                                        </Button>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                    {/* Summary Footer */}
                                                    <TableFooter sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                                        <TableRow>
                                                            <TableCell sx={{ fontWeight: 800, fontSize: '11px', color: '#0f172a' }}>
                                                                TEAM TOTAL
                                                            </TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '11px', color: '#0f172a' }}>
                                                                {submittedMembers.length} / {members.length} Submitted
                                                            </TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>
                                                                {segment.total_tasks || 0}
                                                            </TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 800, fontSize: '12px', color: segment.flags?.has_business_loss ? '#b91c1c' : '#047857' }}>
                                                                {segment.flags?.has_business_loss ? `₹ ${segment.flags?.business_loss_total?.toLocaleString('en-IN')}` : '₹ 0'}
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: segment.flags?.has_blockers ? '#b91c1c' : '#64748b' }}>
                                                                {segment.flags?.has_blockers ? `${segment.flags?.blockers_count} reported` : '0 blockers'}
                                                            </TableCell>
                                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '11px', color: '#0f172a' }}>
                                                                {members.reduce((acc, m) => acc + (m.open_points_count || 0), 0)} items
                                                            </TableCell>
                                                            <TableCell align="center" />
                                                        </TableRow>
                                                    </TableFooter>
                                                </Table>
                                            </Box>
                                        )}

                                        {/* ─── TAB 2: TASK BREAKDOWN MATRIX ─── */}
                                        {activeTab === 1 && (
                                            <Box>
                                                {/* Empty State Banner if all tasks are 0 and template not explicitly toggled */}
                                                {allTasksZero && !showTemplateMatrix[segment.sub_team] ? (
                                                    <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                                                        <AssessmentOutlinedIcon sx={{ fontSize: 36, color: '#94a3b8', mb: 1 }} />
                                                        <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={0.5}>
                                                            No task submissions logged yet for {teamDisplayName}
                                                        </Typography>
                                                        <Typography variant="caption" color="#64748b" display="block" mb={2}>
                                                            Submissions are currently pending for this month. Once team members submit their KPI sheets, their daily tasks will be automatically aggregated here.
                                                        </Typography>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => setShowTemplateMatrix(prev => ({ ...prev, [segment.sub_team]: true }))}
                                                            sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 600 }}
                                                        >
                                                            Preview Template Task Categories ({segment.task_breakdown?.length || 0})
                                                        </Button>
                                                    </Paper>
                                                ) : (
                                                    <Box>
                                                        {/* Controls: Search and Hide Zero-Rows Toggle */}
                                                        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} mb={1.5}>
                                                            <TextField
                                                                size="small"
                                                                placeholder="Filter task categories..."
                                                                value={taskSearch[segment.sub_team] || ''}
                                                                onChange={(e) => setTaskSearch(prev => ({ ...prev, [segment.sub_team]: e.target.value }))}
                                                                InputProps={{
                                                                    startAdornment: (
                                                                        <InputAdornment position="start">
                                                                            <SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                                                                        </InputAdornment>
                                                                    ),
                                                                    sx: { height: 32, fontSize: '12px' }
                                                                }}
                                                                sx={{ width: 220 }}
                                                            />

                                                            <Box display="flex" alignItems="center" gap={2}>
                                                                {!allTasksZero && (
                                                                    <FormControlLabel
                                                                        control={
                                                                            <Checkbox
                                                                                size="small"
                                                                                checked={hideZeroTasks}
                                                                                onChange={(e) => setHideZeroTasks(e.target.checked)}
                                                                            />
                                                                        }
                                                                        label={<Typography variant="caption" fontWeight={600} color="#475569">Hide inactive categories (0 tasks)</Typography>}
                                                                    />
                                                                )}

                                                                {showTemplateMatrix[segment.sub_team] && allTasksZero && (
                                                                    <Button
                                                                        size="small"
                                                                        variant="text"
                                                                        onClick={() => setShowTemplateMatrix(prev => ({ ...prev, [segment.sub_team]: false }))}
                                                                        sx={{ textTransform: 'none', fontSize: '11px', color: '#64748b' }}
                                                                    >
                                                                        Hide Template Preview
                                                                    </Button>
                                                                )}
                                                            </Box>
                                                        </Box>

                                                        {/* Task Breakdown Matrix Table */}
                                                        <Box sx={{ overflowX: 'auto' }}>
                                                            <Table size="small" sx={{ bgcolor: '#ffffff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                                                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                                                    <TableRow>
                                                                        <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569', minWidth: 200 }}>
                                                                            TASK CATEGORY
                                                                        </TableCell>
                                                                        <TableCell align="center" sx={{ fontWeight: 800, fontSize: '11px', color: '#0f172a', bgcolor: '#e2e8f0', minWidth: 90 }}>
                                                                            TOTAL
                                                                        </TableCell>
                                                                        {members.map(m => (
                                                                            <TableCell key={m.userId} align="center" sx={{ fontWeight: 700, fontSize: '11px', color: '#475569', minWidth: 100 }}>
                                                                                {m.name}
                                                                            </TableCell>
                                                                        ))}
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {filteredTasks.length === 0 ? (
                                                                        <TableRow>
                                                                            <TableCell colSpan={members.length + 2} align="center" sx={{ py: 3, color: '#64748b' }}>
                                                                                No tasks match your filter.
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ) : (
                                                                        filteredTasks.map((t, idx) => {
                                                                            const isTotalActive = (t.total_count || 0) > 0;
                                                                            return (
                                                                                <TableRow key={idx} hover sx={{ bgcolor: isTotalActive ? '#ffffff' : '#fafafa' }}>
                                                                                    <TableCell sx={{ fontSize: '12px', fontWeight: isTotalActive ? 700 : 500, color: isTotalActive ? '#0f172a' : '#64748b' }}>
                                                                                        {t.task_name}
                                                                                    </TableCell>
                                                                                    <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 800, bgcolor: isTotalActive ? '#f0fdf4' : '#f8fafc', color: isTotalActive ? '#166534' : '#94a3b8' }}>
                                                                                        {t.total_count}
                                                                                    </TableCell>
                                                                                    {members.map(m => {
                                                                                        const mEntry = (t.member_counts || []).find(mc => mc.userId?.toString() === m.userId?.toString());
                                                                                        const count = mEntry ? mEntry.count : 0;
                                                                                        const isActive = count > 0;
                                                                                        return (
                                                                                            <TableCell 
                                                                                                key={m.userId} 
                                                                                                align="center" 
                                                                                                sx={{ 
                                                                                                    fontSize: '12px', 
                                                                                                    fontWeight: isActive ? 700 : 400,
                                                                                                    color: isActive ? '#0f172a' : '#94a3b8',
                                                                                                    bgcolor: isActive ? '#eff6ff' : 'transparent'
                                                                                                }}
                                                                                            >
                                                                                                {count}
                                                                                            </TableCell>
                                                                                        );
                                                                                    })}
                                                                                </TableRow>
                                                                            );
                                                                        })
                                                                    )}
                                                                </TableBody>
                                                                {/* Summary Total Row */}
                                                                <TableFooter sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                                                                    <TableRow>
                                                                        <TableCell sx={{ fontWeight: 800, fontSize: '11px', color: '#0f172a' }}>
                                                                            TOTAL TASKS
                                                                        </TableCell>
                                                                        <TableCell align="center" sx={{ fontWeight: 900, fontSize: '13px', color: '#0f172a', bgcolor: '#e2e8f0' }}>
                                                                            {segment.total_tasks || 0}
                                                                        </TableCell>
                                                                        {members.map(m => (
                                                                            <TableCell key={m.userId} align="center" sx={{ fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>
                                                                                {m.task_count || 0}
                                                                            </TableCell>
                                                                        ))}
                                                                    </TableRow>
                                                                </TableFooter>
                                                            </Table>
                                                        </Box>
                                                    </Box>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                </Collapse>
                            </Paper>
                        );
                    })}
                </Box>
            )}

            {/* Confirmation Dialog for HOD Approval */}
            <Dialog open={openApproveDialog} onClose={() => setOpenApproveDialog(false)}>
                <DialogTitle sx={{ fontWeight: 800 }}>Approve Team KPI Performance?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="#475569">
                        Approving will lock the KPI data for <strong>{department}</strong> ({month}/{year}) and compute the final 70/30 blended monthly HOD score for Suraj Rajan's review.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenApproveDialog(false)} disabled={approving} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleApproveAll} 
                        variant="contained" 
                        color="success" 
                        disabled={approving}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        {approving ? 'Approving...' : 'Confirm & Roll Up'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SegmentRollupView;

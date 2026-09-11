import React, { useState } from 'react';
import { 
    Box, Typography, Chip, Button, IconButton, Collapse, Table, TableHead, 
    TableRow, TableCell, TableBody, TableFooter, Paper, Tooltip, Dialog, 
    DialogTitle, DialogContent, DialogActions, Avatar, Drawer, FormControlLabel,
    Checkbox, TextField, InputAdornment
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SearchIcon from '@mui/icons-material/Search';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import CloseIcon from '@mui/icons-material/Close';
import RecurringBlockerBadge from './RecurringBlockerBadge';
import { approveSegmentsRollup } from '../../services/mrmService';

/**
 * Section 2: Sub-Team KPI Performance Segments
 * Executive-First UI: Scannable 3-Pillar story cards (Volume, Blockers, Loss/Deadlines),
 * collapsible member roster, and on-demand slide-over task matrix drawer.
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
    const [taskDrawerSegment, setTaskDrawerSegment] = useState(null);
    const [hideZeroTasks, setHideZeroTasks] = useState(true);
    const [showTemplateMatrix, setShowTemplateMatrix] = useState({});
    const [taskSearch, setTaskSearch] = useState('');
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
                    bg: '#fff8f8',
                    badgeBg: '#fee2e2',
                    badgeText: '#991b1b',
                    dot: '#ef4444',
                    accent: '#b91c1c'
                };
            case 'Amber':
                return {
                    border: '#fde047',
                    bg: '#fffdf5',
                    badgeBg: '#fef3c7',
                    badgeText: '#92400e',
                    dot: '#f59e0b',
                    accent: '#d97706'
                };
            case 'Green':
            default:
                return {
                    border: '#86efac',
                    bg: '#f8fdf9',
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

        if (segment.reason_badge && segment.reason_badge.includes('Missed Submission')) {
            return `⚠️ Submissions Pending`;
        }

        if (segment.is_cold_start) {
            if (segment.flag_status === 'Red') {
                return `⚠️ Operational Flag (Cold Start)`;
            }
            return `🟢 Clean (Cold Start)`;
        }

        if (flags.has_business_loss && flags.business_loss_total > 0 && flags.has_blockers) {
            return `⚠️ Loss: ₹${flags.business_loss_total.toLocaleString('en-IN')} & Blockers`;
        }

        if (flags.has_business_loss && flags.business_loss_total > 0) {
            return `⚠️ Loss: ₹${flags.business_loss_total.toLocaleString('en-IN')}`;
        }

        if (flags.has_blockers && flags.blockers_count > 0) {
            return `⚠️ ${flags.blockers_count} Active Blocker${flags.blockers_count > 1 ? 's' : ''}`;
        }

        if (segment.trend_status === 'Red') {
            return `⚠️ Trend Drop (${segment.trend_deviation_pct}%)`;
        }

        if (segment.trend_status === 'Amber') {
            return `⚠️ Trend Drop (${segment.trend_deviation_pct}%)`;
        }

        if (segment.final_rag === 'Green') {
            return `🟢 On Trend & Clean`;
        }

        return segment.reason_badge || 'Automated RAG';
    };

    const sectionTitle = 'Sub-Team KPI Performance Segments';
    const segmentCountLabel = `${department || 'Department'} (${segments.length} Sub-Teams)`;

    return (
        <Box sx={{ mt: 1.5, mb: 4 }}>
            {/* Section Header & View Controls */}
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} mb={2}>
                <Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6" fontWeight={800} color="#0f172a" fontSize="17px" lineHeight={1.2}>
                            {sectionTitle}
                        </Typography>
                        <Chip 
                            label={segmentCountLabel}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '11px', bgcolor: '#f1f5f9', color: '#475569' }}
                        />
                    </Box>
                    <Typography variant="caption" color="#64748b">
                        Weight: 70% of Monthly HOD Score • Derived 2-Signal RAG (Trend Deviation + Operational Flags)
                    </Typography>
                </Box>

                {/* Filter Controls & Approval Action */}
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
                                    height: '30px',
                                    '&:hover': { bgcolor: filter === 'REDS_FIRST' ? '#991b1b' : '#fee2e2' }
                                }}
                            >
                                🔴 Reds First ({redCount})
                            </Button>

                            <Button
                                size="small"
                                variant={filter === 'ALL' ? 'contained' : 'outlined'}
                                onClick={() => setFilter('ALL')}
                                sx={{ 
                                    textTransform: 'none', 
                                    fontWeight: 600, 
                                    fontSize: '12px',
                                    height: '30px',
                                    color: filter === 'ALL' ? '#ffffff' : '#475569',
                                    bgcolor: filter === 'ALL' ? '#334155' : 'transparent',
                                    borderColor: '#cbd5e1'
                                }}
                            >
                                All ({segments.length})
                            </Button>

                            <Button
                                size="small"
                                variant={filter === 'AMBER' ? 'contained' : 'outlined'}
                                onClick={() => setFilter('AMBER')}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    height: '30px',
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
                                    height: '30px',
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
                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '12px', height: '30px', ml: 0.5 }}
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
                <Box display="flex" flexDirection="column" gap={2}>
                    {displayedSegments.map((segment) => {
                        const ragTheme = getRagStyles(segment.final_rag);
                        const isExpanded = Boolean(expandedSegments[segment.sub_team]);
                        const members = segment.contributing_members || [];
                        const memberNamesList = members.map(m => m.name).join(', ');
                        const submittedMembers = members.filter(m => m.submitted);
                        const cleanReason = getCleanReasonBadge(segment);
                        const isGeneralTeam = segment.sub_team === 'General';
                        const teamDisplayName = isGeneralTeam ? `${department || 'Department'} Team` : `${segment.sub_team} Sub-Team`;
                        const activeBlockerMembers = members.filter(m => m.has_blockers);
                        const primaryBlocker = activeBlockerMembers[0];

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
                                    '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }
                                }}
                            >
                                {/* ═══ 1. SEGMENT HEADER: Status Dot, Sub-Team + Bracketed Members, Reason, Score ═══ */}
                                <Box
                                    sx={{
                                        px: 2,
                                        py: 1.5,
                                        bgcolor: ragTheme.bg,
                                        borderBottom: `1px solid ${ragTheme.border}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: 1.5
                                    }}
                                >
                                    {/* Left: Dot + Title + Bracketed Attribution + Reason */}
                                    <Box display="flex" alignItems="center" gap={1.2} flexWrap="wrap">
                                        <Box sx={{
                                            width: 13,
                                            height: 13,
                                            borderRadius: '50%',
                                            bgcolor: ragTheme.dot,
                                            boxShadow: `0 0 0 3px ${ragTheme.badgeBg}`
                                        }} />

                                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" fontSize="15px" sx={{ letterSpacing: '-0.2px' }}>
                                            {teamDisplayName} <span style={{ fontWeight: 600, color: '#475569', fontSize: '13px' }}>[{memberNamesList}]</span>
                                        </Typography>

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

                                    {/* Right: Score Pill */}
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
                                </Box>

                                {/* ═══ 2. THE 3 EXECUTIVE STORY PILLARS (SCANNABLE IN 3 SECONDS) ═══ */}
                                <Box sx={{
                                    p: 1.8,
                                    bgcolor: '#ffffff',
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', md: '1fr 1.3fr 1fr' },
                                    gap: 1.5
                                }}>
                                    {/* Pillar 1: Volume & Historical Trend */}
                                    <Box sx={{ p: 1.4, bgcolor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <Typography variant="caption" fontWeight={700} color="#475569" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.6 }}>
                                            <TrendingUpIcon sx={{ fontSize: 16, color: '#2563eb' }} /> Volume & Trend Benchmark
                                        </Typography>
                                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" fontSize="15px">
                                            {segment.total_tasks || 0} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>tasks completed</span>
                                        </Typography>
                                        <Box display="flex" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
                                            <Typography variant="caption" color="#64748b">
                                                3M Avg: {segment.trailing_3m_avg ? `${segment.trailing_3m_avg} tasks` : (segment.is_cold_start ? 'Cold Start (M 1-3)' : '—')}
                                            </Typography>
                                            {!segment.is_cold_start && segment.trend_deviation_pct !== null && (
                                                <Chip 
                                                    label={`${segment.trend_deviation_pct > 0 ? '+' : ''}${segment.trend_deviation_pct}%`}
                                                    size="small"
                                                    sx={{
                                                        height: '18px',
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        bgcolor: segment.trend_status === 'Red' ? '#fee2e2' : (segment.trend_status === 'Amber' ? '#fef3c7' : '#dcfce7'),
                                                        color: segment.trend_status === 'Red' ? '#991b1b' : (segment.trend_status === 'Amber' ? '#92400e' : '#166534')
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* Pillar 2: Operational Blockers & Recurrence */}
                                    <Box sx={{ 
                                        p: 1.4, 
                                        bgcolor: segment.flags?.has_blockers ? '#fffbeb' : '#f8fafc', 
                                        borderRadius: '8px', 
                                        border: `1px solid ${segment.flags?.has_blockers ? '#fde68a' : '#e2e8f0'}` 
                                    }}>
                                        <Typography variant="caption" fontWeight={700} color={segment.flags?.has_blockers ? '#92400e' : '#475569'} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.6 }}>
                                            <ReportProblemOutlinedIcon sx={{ fontSize: 16, color: segment.flags?.has_blockers ? '#b45309' : '#64748b' }} /> Operational Roadblocks
                                        </Typography>
                                        {segment.flags?.has_blockers ? (
                                            <Box>
                                                <Typography variant="body2" fontWeight={700} color="#92400e" fontSize="12px" lineHeight={1.3}>
                                                    "{primaryBlocker?.blockers_summary || 'Active blocker reported'}"
                                                </Typography>
                                                <Box display="flex" alignItems="center" gap={1} mt={0.8} flexWrap="wrap">
                                                    {primaryBlocker?.blockers_recurrence_key && (
                                                        <RecurringBlockerBadge blocker={primaryBlocker.blockers_summary} consecutiveCount={2} />
                                                    )}
                                                    <Typography variant="caption" color="#78350f" fontSize="11px">
                                                        By: {activeBlockerMembers.map(m => m.name).join(', ')}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        ) : (
                                            <Box display="flex" alignItems="center" gap={0.8} mt={0.5}>
                                                <CheckCircleIcon sx={{ fontSize: 16, color: '#16a34a' }} />
                                                <Typography variant="body2" color="#166534" fontWeight={600} fontSize="12.5px">
                                                    No active blockers (Clean operations)
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>

                                    {/* Pillar 3: Loss, Open Points & Deadlines */}
                                    <Box sx={{ 
                                        p: 1.4, 
                                        bgcolor: (segment.flags?.has_business_loss || segment.flags?.has_unsubmitted) ? '#fff5f5' : '#f8fafc', 
                                        borderRadius: '8px', 
                                        border: `1px solid ${(segment.flags?.has_business_loss || segment.flags?.has_unsubmitted) ? '#fecaca' : '#e2e8f0'}` 
                                    }}>
                                        <Typography variant="caption" fontWeight={700} color={(segment.flags?.has_business_loss || segment.flags?.has_unsubmitted) ? '#991b1b' : '#475569'} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.6 }}>
                                            <CurrencyRupeeIcon sx={{ fontSize: 16, color: segment.flags?.has_business_loss ? '#b91c1c' : '#64748b' }} /> Loss & Deadlines
                                        </Typography>
                                        <Box display="flex" alignItems="baseline" gap={1}>
                                            <Typography variant="subtitle2" fontWeight={800} color={segment.flags?.has_business_loss ? '#b91c1c' : '#166534'} fontSize="14px">
                                                {segment.flags?.has_business_loss ? `₹ ${segment.flags?.business_loss_total?.toLocaleString('en-IN')}` : '₹ 0 Loss'}
                                            </Typography>
                                            <Typography variant="caption" color="#64748b">
                                                • {members.reduce((acc, m) => acc + (m.open_points_count || 0), 0)} Open Points
                                            </Typography>
                                        </Box>
                                        <Box mt={0.5}>
                                            {segment.flags?.has_unsubmitted ? (
                                                <Typography variant="caption" color="#b91c1c" fontWeight={700} fontSize="11px">
                                                    ⚠️ {segment.flags?.unsubmitted_members?.length} Pending: {segment.flags?.unsubmitted_members?.join(', ')}
                                                </Typography>
                                            ) : (
                                                <Typography variant="caption" color="#166534" fontWeight={600} fontSize="11px">
                                                    ✓ All {members.length} submissions complete
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </Box>

                                {/* ═══ 3. ACTION BAR: View Roster & Inspect Task Matrix Drawer ═══ */}
                                <Box sx={{
                                    px: 2,
                                    py: 0.8,
                                    bgcolor: '#fafafa',
                                    borderTop: '1px solid #f1f5f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 1
                                }}>
                                    <Button
                                        size="small"
                                        onClick={() => toggleExpand(segment.sub_team)}
                                        startIcon={<PeopleOutlineIcon sx={{ fontSize: 15 }} />}
                                        endIcon={isExpanded ? <ExpandLessIcon sx={{ fontSize: 15 }} /> : <ExpandMoreIcon sx={{ fontSize: 15 }} />}
                                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '12px', color: '#334155' }}
                                    >
                                        {isExpanded ? 'Hide Member Roster' : `View Contributing Roster (${members.length} Members)`}
                                    </Button>

                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<AssessmentOutlinedIcon sx={{ fontSize: 15 }} />}
                                        onClick={() => {
                                            setTaskDrawerSegment(segment);
                                            setTaskSearch('');
                                        }}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: '11.5px',
                                            color: '#2563eb',
                                            borderColor: '#bfdbfe',
                                            py: 0.4,
                                            '&:hover': { bgcolor: '#eff6ff', borderColor: '#3b82f6' }
                                        }}
                                    >
                                        Inspect Task Breakdown Matrix ({segment.task_breakdown?.length || 0} Categories) ↗
                                    </Button>
                                </Box>

                                {/* ═══ 4. COLLAPSIBLE CONTRIBUTING MEMBER ROSTER TABLE ═══ */}
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px dashed #cbd5e1' }}>
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
                                </Collapse>
                            </Paper>
                        );
                    })}
                </Box>
            )}

            {/* ═══ SLIDE-OVER DRAWER FOR DETAILED TASK BREAKDOWN MATRIX ═══ */}
            <Drawer
                anchor="right"
                open={Boolean(taskDrawerSegment)}
                onClose={() => setTaskDrawerSegment(null)}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 680, md: 840 },
                        p: 0,
                        bgcolor: '#ffffff'
                    }
                }}
            >
                {taskDrawerSegment && (() => {
                    const seg = taskDrawerSegment;
                    const members = seg.contributing_members || [];
                    const allTasksZero = (seg.task_breakdown || []).every(t => (t.total_count || 0) === 0);

                    let filteredTasks = seg.task_breakdown || [];
                    if (hideZeroTasks && !showTemplateMatrix[seg.sub_team]) {
                        filteredTasks = filteredTasks.filter(t => (t.total_count || 0) > 0);
                    }
                    if (taskSearch.trim()) {
                        const q = taskSearch.toLowerCase();
                        filteredTasks = filteredTasks.filter(t => t.task_name.toLowerCase().includes(q));
                    }

                    return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Drawer Header */}
                            <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={800} color="#0f172a" fontSize="16px">
                                        Task Breakdown Matrix — {seg.sub_team} Sub-Team
                                    </Typography>
                                    <Typography variant="caption" color="#64748b">
                                        {department} Department • Total {seg.total_tasks || 0} tasks logged across {members.length} team members
                                    </Typography>
                                </Box>
                                <IconButton onClick={() => setTaskDrawerSegment(null)} size="small">
                                    <CloseIcon />
                                </IconButton>
                            </Box>

                            {/* Controls inside Drawer */}
                            <Box sx={{ p: 2, borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                                <TextField
                                    size="small"
                                    placeholder="Filter task categories..."
                                    value={taskSearch}
                                    onChange={(e) => setTaskSearch(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                                            </InputAdornment>
                                        ),
                                        sx: { height: 32, fontSize: '12px' }
                                    }}
                                    sx={{ width: 240 }}
                                />

                                <Box display="flex" alignItems="center" gap={2}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={hideZeroTasks}
                                                onChange={(e) => setHideZeroTasks(e.target.checked)}
                                                sx={{ p: 0.5 }}
                                            />
                                        }
                                        label={<Typography variant="caption" color="#475569" fontWeight={600}>Hide zero-count tasks</Typography>}
                                        sx={{ m: 0 }}
                                    />
                                    {allTasksZero && (
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={Boolean(showTemplateMatrix[seg.sub_team])}
                                                    onChange={(e) => setShowTemplateMatrix(prev => ({ ...prev, [seg.sub_team]: e.target.checked }))}
                                                    sx={{ p: 0.5 }}
                                                />
                                            }
                                            label={<Typography variant="caption" color="#475569" fontWeight={600}>Show full template categories</Typography>}
                                            sx={{ m: 0 }}
                                        />
                                    )}
                                </Box>
                            </Box>

                            {/* Drawer Table Content */}
                            <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
                                {allTasksZero && !showTemplateMatrix[seg.sub_team] ? (
                                    <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                                        <AssessmentOutlinedIcon sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
                                        <Typography variant="subtitle2" fontWeight={700} color="#334155" mb={0.5}>
                                            No tasks logged yet for this month
                                        </Typography>
                                        <Typography variant="caption" color="#64748b" display="block" mb={2}>
                                            Submissions are currently pending. Check the box above or click below to preview all department task templates.
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => setShowTemplateMatrix(prev => ({ ...prev, [seg.sub_team]: true }))}
                                            sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 600 }}
                                        >
                                            Preview Template Categories ({seg.task_breakdown?.length || 0})
                                        </Button>
                                    </Paper>
                                ) : (
                                    <Table size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                        <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569', minWidth: 200 }}>
                                                    TASK ITEM / CATEGORY
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569' }} align="center">
                                                    SEGMENT TOTAL
                                                </TableCell>
                                                {members.map(m => (
                                                    <TableCell key={m.userId} sx={{ fontWeight: 700, fontSize: '11px', color: '#475569' }} align="center">
                                                        {m.name.split(' ')[0]}
                                                    </TableCell>
                                                ))}
                                                <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569' }} align="center">
                                                    HISTORICAL 3M TREND
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredTasks.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={members.length + 3} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                                                        No task categories match the search filter.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredTasks.map((task, tIdx) => {
                                                    const memberCountsMap = new Map();
                                                    (task.member_counts || []).forEach(mc => {
                                                        memberCountsMap.set(mc.userId?.toString() || mc.name, mc.count);
                                                    });

                                                    return (
                                                        <TableRow key={tIdx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                            <TableCell sx={{ py: 1, fontWeight: 600, fontSize: '12px', color: '#1e293b' }}>
                                                                {task.task_name}
                                                            </TableCell>
                                                            <TableCell align="center" sx={{ py: 1, fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>
                                                                {task.total_count || 0}
                                                            </TableCell>
                                                            {members.map(m => {
                                                                const count = memberCountsMap.get(m.userId.toString()) || 0;
                                                                return (
                                                                    <TableCell key={m.userId} align="center" sx={{ py: 1, fontSize: '12px', color: count > 0 ? '#0f172a' : '#94a3b8' }}>
                                                                        {count > 0 ? count : '—'}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                            <TableCell align="center" sx={{ py: 1, fontSize: '11px', color: '#64748b' }}>
                                                                {task.historical_3m_trend ? `${task.historical_3m_trend} avg` : '—'}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </Box>
                        </Box>
                    );
                })()}
            </Drawer>

            {/* Approval Confirmation Dialog */}
            <Dialog open={openApproveDialog} onClose={() => setOpenApproveDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LockIcon sx={{ color: '#16a34a' }} />
                    Approve Department Segments
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="#334155" mb={1}>
                        This action will <strong>certify and lock</strong> all KPI sub-team segment totals for <strong>{department} ({month}/{year})</strong>.
                    </Typography>
                    <Typography variant="caption" color="#64748b" display="block">
                        The 70% Team KPI score will be frozen and officially blended into the HOD monthly scorecard for Suraj Rajan's executive review.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenApproveDialog(false)} disabled={approving} sx={{ textTransform: 'none', color: '#64748b' }}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleApproveAll} 
                        variant="contained" 
                        color="success" 
                        disabled={approving}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        {approving ? 'Approving...' : 'Confirm & Roll Up to MRM'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SegmentRollupView;

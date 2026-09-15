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
    onApprovalComplete,
    title,
    weightChip,
    actionExtra,
    hideHeader = false
}) => {
    const [filter, setFilter] = useState('REDS_FIRST'); // 'ALL', 'REDS_FIRST', 'RED', 'AMBER', 'GREEN'
    const [expandedSegments, setExpandedSegments] = useState({});
    const [taskDrawerSegment, setTaskDrawerSegment] = useState(null);
    const [selectedMemberId, setSelectedMemberId] = useState('ALL');
    const [hideZeroTasks, setHideZeroTasks] = useState(true);
    const [showTemplateMatrix, setShowTemplateMatrix] = useState({});
    const [taskSearch, setTaskSearch] = useState('');
    const [drawerTargetToggle, setDrawerTargetToggle] = useState(null); // null = auto, true = force ON, false = force OFF
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
                    border: '#fecaca',
                    accentBorder: '#ef4444',
                    bg: '#ffffff',
                    headerBg: '#fffbfb',
                    badgeBg: '#fee2e2',
                    badgeText: '#991b1b',
                    dot: '#ef4444',
                    accent: '#b91c1c'
                };
            case 'Amber':
                return {
                    border: '#fde68a',
                    accentBorder: '#f59e0b',
                    bg: '#ffffff',
                    headerBg: '#fffdf5',
                    badgeBg: '#fef3c7',
                    badgeText: '#92400e',
                    dot: '#f59e0b',
                    accent: '#d97706'
                };
            case 'Green':
            default:
                return {
                    border: '#bbf7d0',
                    accentBorder: '#10b981',
                    bg: '#ffffff',
                    headerBg: '#f8fdf9',
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

    const sectionTitle = title || 'Sub-Team KPI Performance Segments';
    const segmentCountLabel = `${department || 'Department'} (${segments.length} Sub-Team${segments.length === 1 ? '' : 's'})`;

    return (
        <Box sx={{ mt: 0, mb: 0, width: '100%', boxSizing: 'border-box' }}>
            {/* Section Header & View Controls */}
            {!hideHeader && (
                <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} mb={1.5}>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="h6" fontWeight={800} color="#0f172a" fontSize="16px" lineHeight={1.2}>
                                {sectionTitle}
                            </Typography>
                            {weightChip ? weightChip : (
                                <Chip 
                                    label="Weight: 70%" 
                                    size="small" 
                                    sx={{ fontWeight: 700, fontSize: '10.5px', bgcolor: '#fee2e2', color: '#991b1b', height: '22px' }} 
                                />
                            )}
                            <Chip 
                                label={segmentCountLabel}
                                size="small"
                                sx={{ fontWeight: 600, fontSize: '11px', bgcolor: '#f1f5f9', color: '#475569', height: '22px' }}
                            />
                        </Box>
                        <Typography variant="caption" color="#64748b" sx={{ display: 'block', mt: 0.3 }}>
                            Weight: 70% of Monthly HOD Score • Derived 2-Signal RAG (Trend Deviation + Operational Flags)
                        </Typography>
                    </Box>

                    {/* Filter Controls & Approval Action */}
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        {actionExtra}
                    {segments.length > 1 && (
                        <Box sx={{ display: 'inline-flex', bgcolor: '#f1f5f9', p: '3px', borderRadius: '9px', border: '1px solid #e2e8f0', gap: '3px' }}>
                            <Button
                                size="small"
                                onClick={() => setFilter('REDS_FIRST')}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: filter === 'REDS_FIRST' ? 600 : 500,
                                    fontSize: '11.5px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    bgcolor: filter === 'REDS_FIRST' ? '#ffffff' : 'transparent',
                                    color: filter === 'REDS_FIRST' ? '#991b1b' : '#64748b',
                                    boxShadow: filter === 'REDS_FIRST' ? '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)' : 'none',
                                    px: 1.2,
                                    transition: 'all 0.15s ease',
                                    '&:hover': { bgcolor: filter === 'REDS_FIRST' ? '#ffffff' : 'rgba(255,255,255,0.7)', color: '#0f172a' }
                                }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', marginRight: 5 }} />
                                Reds First ({redCount})
                            </Button>

                            <Button
                                size="small"
                                onClick={() => setFilter('ALL')}
                                sx={{ 
                                    textTransform: 'none', 
                                    fontWeight: filter === 'ALL' ? 600 : 500, 
                                    fontSize: '11.5px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    bgcolor: filter === 'ALL' ? '#ffffff' : 'transparent',
                                    color: filter === 'ALL' ? '#0f172a' : '#64748b',
                                    boxShadow: filter === 'ALL' ? '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)' : 'none',
                                    px: 1.2,
                                    transition: 'all 0.15s ease',
                                    '&:hover': { bgcolor: filter === 'ALL' ? '#ffffff' : 'rgba(255,255,255,0.7)', color: '#0f172a' }
                                }}
                            >
                                All ({segments.length})
                            </Button>

                            <Button
                                size="small"
                                onClick={() => setFilter('AMBER')}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: filter === 'AMBER' ? 600 : 500,
                                    fontSize: '11.5px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    bgcolor: filter === 'AMBER' ? '#ffffff' : 'transparent',
                                    color: filter === 'AMBER' ? '#b45309' : '#64748b',
                                    boxShadow: filter === 'AMBER' ? '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)' : 'none',
                                    px: 1.2,
                                    transition: 'all 0.15s ease',
                                    '&:hover': { bgcolor: filter === 'AMBER' ? '#ffffff' : 'rgba(255,255,255,0.7)', color: '#0f172a' }
                                }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', marginRight: 5 }} />
                                Ambers ({amberCount})
                            </Button>

                            <Button
                                size="small"
                                onClick={() => setFilter('GREEN')}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: filter === 'GREEN' ? 600 : 500,
                                    fontSize: '11.5px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    bgcolor: filter === 'GREEN' ? '#ffffff' : 'transparent',
                                    color: filter === 'GREEN' ? '#047857' : '#64748b',
                                    boxShadow: filter === 'GREEN' ? '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)' : 'none',
                                    px: 1.2,
                                    transition: 'all 0.15s ease',
                                    '&:hover': { bgcolor: filter === 'GREEN' ? '#ffffff' : 'rgba(255,255,255,0.7)', color: '#0f172a' }
                                }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', marginRight: 5 }} />
                                Greens ({greenCount})
                            </Button>
                        </Box>
                    )}

                    {isHodOrAdmin && (
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<LockIcon sx={{ fontSize: 14 }} />}
                            onClick={() => setOpenApproveDialog(true)}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '12px',
                                height: '34px',
                                px: 2,
                                borderRadius: '8px',
                                background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                                border: '1px solid #047857',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 2px 5px rgba(5,150,105,0.25), inset 0 1px 0 rgba(255,255,255,0.25)',
                                color: '#ffffff',
                                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                    background: 'linear-gradient(180deg, #34d399 0%, #059669 100%)',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(5,150,105,0.35), inset 0 1px 0 rgba(255,255,255,0.35)',
                                    transform: 'translateY(-1px)'
                                },
                                '&:active': {
                                    background: 'linear-gradient(180deg, #059669 0%, #047857 100%)',
                                    transform: 'translateY(1px)',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                },
                                ml: 0.5
                            }}
                        >
                            Approve & Roll Up to MRM
                        </Button>
                    )}
                </Box>
            </Box>
            )}

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
                                    border: '1px solid #e2e8f0',
                                    borderLeft: `4px solid ${ragTheme.accentBorder}`,
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    transition: 'all 0.15s ease',
                                    '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderColor: '#cbd5e1' }
                                }}
                            >
                                {/* ═══ 1. SEGMENT HEADER: Status Dot, Sub-Team, Clean Member Chip, Reason, Score ═══ */}
                                <Box
                                    sx={{
                                        px: 2,
                                        py: 1.2,
                                        bgcolor: ragTheme.headerBg,
                                        borderBottom: '1px solid #f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: 1.2
                                    }}
                                >
                                    {/* Left: Dot + Title + Members Tooltip + Reason */}
                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                        <Box sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            bgcolor: ragTheme.dot
                                        }} />

                                        <Typography variant="subtitle1" fontWeight={700} color="#0f172a" fontSize="14.5px" sx={{ letterSpacing: '-0.2px' }}>
                                            {teamDisplayName}
                                        </Typography>

                                        <Tooltip title={`Contributing Members: ${memberNamesList}`} arrow>
                                            <Chip
                                                label={`${members.length} Members`}
                                                size="small"
                                                sx={{
                                                    bgcolor: '#f1f5f9',
                                                    color: '#475569',
                                                    fontWeight: 600,
                                                    fontSize: '10.5px',
                                                    height: '20px',
                                                    border: '1px solid #e2e8f0',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </Tooltip>

                                        <Chip
                                            label={cleanReason}
                                            size="small"
                                            sx={{
                                                bgcolor: ragTheme.badgeBg,
                                                color: ragTheme.badgeText,
                                                fontWeight: 600,
                                                fontSize: '11px',
                                                border: `1px solid ${ragTheme.border}`,
                                                height: '20px'
                                            }}
                                        />
                                    </Box>

                                    {/* Right: Score Pill */}
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        gap: 0.5,
                                        px: 1.2,
                                        py: 0.3,
                                        bgcolor: '#ffffff',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <Typography variant="body2" fontWeight={700} color="#0f172a" fontSize="12.5px" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                            {segment.segment_score || 0}
                                        </Typography>
                                        <Typography variant="caption" color="#64748b" fontSize="9.5px" fontWeight={600}>
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
                                            setSelectedMemberId('ALL');
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
                                                            <Box display="flex" alignItems="center" justifyContent="center" gap={0.8}>
                                                                <Button
                                                                    size="small"
                                                                    variant="text"
                                                                    onClick={() => {
                                                                        setTaskDrawerSegment(segment);
                                                                        setSelectedMemberId(m.userId);
                                                                        setTaskSearch('');
                                                                    }}
                                                                    sx={{
                                                                        fontSize: '10.5px',
                                                                        py: '2px',
                                                                        px: '7px',
                                                                        minWidth: 'unset',
                                                                        textTransform: 'none',
                                                                        fontWeight: 600,
                                                                        color: '#2563eb',
                                                                        bgcolor: '#eff6ff',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #dbeafe',
                                                                        '&:hover': { bgcolor: '#dbeafe' }
                                                                    }}
                                                                    title={`Inspect ${m.name}'s task breakdown`}
                                                                >
                                                                    Tasks ↗
                                                                </Button>
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
                                                                            borderRadius: '6px',
                                                                            '&:hover': { bgcolor: '#fee2e2' }
                                                                        }}
                                                                    >
                                                                        Ping
                                                                    </Button>
                                                                )}
                                                            </Box>
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
                onClose={() => {
                    setTaskDrawerSegment(null);
                    setDrawerTargetToggle(null);
                }}
                PaperProps={{
                    sx: {
                        width: { xs: '100%', sm: 720, md: 880, lg: 960 },
                        p: 0,
                        bgcolor: '#ffffff'
                    }
                }}
            >
                {taskDrawerSegment && (() => {
                    const seg = taskDrawerSegment;
                    const members = seg.contributing_members || [];
                    const allTasksZero = (seg.task_breakdown || []).every(t => (t.total_count || 0) === 0);

                    // Helper to get detailed task metrics for a specific member
                    const getMemberTaskData = (task, member) => {
                        if (!task?.member_counts || !member) {
                            return { count: 0, actual: 0, target: null, has_target: false };
                        }
                        const match = task.member_counts.find(mc =>
                            (mc.userId && member.userId && mc.userId.toString() === member.userId.toString()) ||
                            (mc.name && member.name && mc.name.trim().toLowerCase() === member.name.trim().toLowerCase())
                        );
                        if (!match) return { count: 0, actual: 0, target: null, has_target: false };
                        const count = Number(match.count) || 0;
                        const actual = Number(match.actual !== undefined && match.actual !== null ? match.actual : count) || 0;
                        const hasTarget = Boolean(
                            match.has_target || 
                            (match.target !== null && match.target !== undefined && match.target !== '' && !isNaN(Number(match.target)))
                        );
                        const target = hasTarget ? Number(match.target) : null;
                        return { count, actual, target, has_target: hasTarget };
                    };

                    const isAll = selectedMemberId === 'ALL';
                    const currentMemberIndex = members.findIndex(m => m.userId?.toString() === selectedMemberId?.toString());
                    const activeMember = currentMemberIndex >= 0 ? members[currentMemberIndex] : null;

                    // Determine if targets are enabled for this segment / member
                    const segmentHasTargets = Boolean(
                        seg.has_targets ||
                        (seg.contributing_members || []).some(m => m.has_targets) ||
                        (seg.task_breakdown || []).some(t => t.has_target)
                    );

                    const activeMemberHasTargets = Boolean(
                        activeMember && (
                            activeMember.has_targets ||
                            (seg.task_breakdown || []).some(t => getMemberTaskData(t, activeMember).has_target)
                        )
                    );

                    // When target is ON: either explicitly toggled by user or auto-detected from data
                    const isTargetOn = drawerTargetToggle !== null
                        ? drawerTargetToggle
                        : (activeMember ? activeMemberHasTargets : segmentHasTargets);

                    // Compute totals for active member
                    const memberTotalTasks = activeMember 
                        ? (seg.task_breakdown || []).reduce((acc, t) => acc + getMemberTaskData(t, activeMember).count, 0) || activeMember.task_count || 0
                        : 0;

                    const memberTargetSum = activeMember
                        ? (seg.task_breakdown || []).reduce((acc, t) => {
                            const d = getMemberTaskData(t, activeMember);
                            return acc + (d.has_target && d.target !== null ? d.target : 0);
                        }, 0)
                        : 0;

                    const memberActualSum = activeMember
                        ? (seg.task_breakdown || []).reduce((acc, t) => {
                            const d = getMemberTaskData(t, activeMember);
                            return acc + (d.has_target ? d.actual : 0);
                        }, 0)
                        : 0;

                    const memberActiveCategories = activeMember
                        ? (seg.task_breakdown || []).filter(t => {
                            const d = getMemberTaskData(t, activeMember);
                            return d.count > 0 || (isTargetOn && d.has_target);
                        }).length
                        : 0;

                    let filteredTasks = seg.task_breakdown || [];
                    if (hideZeroTasks && !showTemplateMatrix[seg.sub_team]) {
                        if (!isAll && activeMember) {
                            filteredTasks = filteredTasks.filter(t => {
                                const d = getMemberTaskData(t, activeMember);
                                return d.count > 0 || (isTargetOn && d.has_target);
                            });
                        } else {
                            filteredTasks = filteredTasks.filter(t => (t.total_count || 0) > 0 || (isTargetOn && t.has_target));
                        }
                    }
                    if (taskSearch.trim()) {
                        const q = taskSearch.toLowerCase();
                        filteredTasks = filteredTasks.filter(t => t.task_name.toLowerCase().includes(q));
                    }

                    // Sort individual member tasks with highest count / target first
                    if (!isAll && activeMember) {
                        filteredTasks = [...filteredTasks].sort((a, b) => {
                            const da = getMemberTaskData(a, activeMember);
                            const db = getMemberTaskData(b, activeMember);
                            const scoreB = db.count + (db.target || 0);
                            const scoreA = da.count + (da.target || 0);
                            return scoreB - scoreA;
                        });
                    }

                    return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#ffffff' }}>
                            {/* 1. Sleek Minimalist Drawer Header */}
                            <Box sx={{
                                px: 3,
                                py: 2.2,
                                bgcolor: '#ffffff',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: 2
                            }}>
                                <Box>
                                    <Box display="flex" alignItems="center" gap={1} mb={0.4} flexWrap="wrap">
                                        <Typography variant="h6" fontWeight={800} color="#0f172a" fontSize="16px" letterSpacing="-0.01em">
                                            Task Breakdown Matrix
                                        </Typography>
                                        <Chip 
                                            label={`${seg.sub_team} Sub-Team`} 
                                            size="small" 
                                            sx={{ 
                                                bgcolor: '#ecfdf5', 
                                                color: '#047857', 
                                                border: '1px solid #a7f3d0', 
                                                fontWeight: 700, 
                                                fontSize: '11px', 
                                                height: '22px' 
                                            }} 
                                        />
                                        {isTargetOn && (
                                            <Chip 
                                                label="🎯 Targets Active" 
                                                size="small" 
                                                sx={{ 
                                                    bgcolor: '#eff6ff', 
                                                    color: '#1d4ed8', 
                                                    border: '1px solid #bfdbfe', 
                                                    fontWeight: 700, 
                                                    fontSize: '11px', 
                                                    height: '22px' 
                                                }} 
                                            />
                                        )}
                                    </Box>
                                    <Typography variant="caption" color="#64748b" fontSize="12px">
                                        {department} Department • Total {seg.total_tasks?.toLocaleString() || 0} tasks logged across {members.length} team members
                                    </Typography>
                                </Box>
                                <IconButton 
                                    onClick={() => {
                                        setTaskDrawerSegment(null);
                                        setDrawerTargetToggle(null);
                                    }} 
                                    size="small"
                                    sx={{ 
                                        color: '#64748b', 
                                        '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' } 
                                    }}
                                >
                                    <CloseIcon sx={{ fontSize: 20 }} />
                                </IconButton>
                            </Box>

                            {/* 2. Member Selector Navigation Bar */}
                            <Box sx={{
                                px: 3,
                                py: 1.2,
                                bgcolor: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1
                            }}>
                                {/* Member Pill Tabs */}
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.8,
                                    overflowX: 'auto',
                                    py: 0.4,
                                    '::-webkit-scrollbar': { height: '4px' },
                                    '::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: '4px' }
                                }}>
                                    <Button
                                        size="small"
                                        onClick={() => setSelectedMemberId('ALL')}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: isAll ? 700 : 500,
                                            fontSize: '11.5px',
                                            height: '28px',
                                            px: 1.3,
                                            borderRadius: '6px',
                                            whiteSpace: 'nowrap',
                                            bgcolor: isAll ? '#0f172a' : '#ffffff',
                                            color: isAll ? '#ffffff' : '#475569',
                                            border: `1px solid ${isAll ? '#0f172a' : '#cbd5e1'}`,
                                            boxShadow: isAll ? '0 1px 3px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                                            '&:hover': {
                                                bgcolor: isAll ? '#1e293b' : '#f1f5f9'
                                            }
                                        }}
                                    >
                                        All Members ({members.length})
                                    </Button>
                                    {members.map(m => {
                                        const isSel = selectedMemberId?.toString() === m.userId?.toString();
                                        return (
                                            <Button
                                                key={m.userId}
                                                size="small"
                                                onClick={() => setSelectedMemberId(m.userId)}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: isSel ? 700 : 500,
                                                    fontSize: '11.5px',
                                                    height: '28px',
                                                    px: 1.2,
                                                    borderRadius: '6px',
                                                    whiteSpace: 'nowrap',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 0.6,
                                                    bgcolor: isSel ? '#059669' : '#ffffff',
                                                    color: isSel ? '#ffffff' : '#334155',
                                                    border: `1px solid ${isSel ? '#047857' : '#cbd5e1'}`,
                                                    boxShadow: isSel ? '0 1px 3px rgba(5,150,105,0.25)' : '0 1px 2px rgba(0,0,0,0.03)',
                                                    '&:hover': {
                                                        bgcolor: isSel ? '#047857' : '#f1f5f9'
                                                    }
                                                }}
                                            >
                                                <span style={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    background: m.submitted ? (isSel ? '#86efac' : '#10b981') : (isSel ? '#fca5a5' : '#ef4444'),
                                                    display: 'inline-block'
                                                }} />
                                                <span>{m.name.split(' ')[0]}</span>
                                                {m.has_targets && (
                                                    <span title="Target tracking enabled" style={{ fontSize: '10px' }}>🎯</span>
                                                )}
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    opacity: isSel ? 1 : 0.8,
                                                    background: isSel ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                                                    color: isSel ? '#ffffff' : '#475569',
                                                    padding: '1px 5px',
                                                    borderRadius: '4px'
                                                }}>
                                                    {m.task_count || 0}
                                                </span>
                                            </Button>
                                        );
                                    })}
                                </Box>

                                {activeMember && (
                                    <Box display="flex" alignItems="center" gap={0.5} sx={{ flexShrink: 0, pl: 1 }}>
                                        <Button
                                            size="small"
                                            disabled={currentMemberIndex <= 0}
                                            onClick={() => setSelectedMemberId(members[currentMemberIndex - 1].userId)}
                                            sx={{
                                                minWidth: '48px',
                                                height: '28px',
                                                textTransform: 'none',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: '#475569',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '6px',
                                                bgcolor: '#ffffff',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                                '&:disabled': { opacity: 0.4 }
                                            }}
                                        >
                                            ‹ Prev
                                        </Button>
                                        <Typography variant="caption" color="#64748b" fontWeight={700} sx={{ px: 0.5, fontSize: '11px', whiteSpace: 'nowrap' }}>
                                            {currentMemberIndex + 1}/{members.length}
                                        </Typography>
                                        <Button
                                            size="small"
                                            disabled={currentMemberIndex >= members.length - 1}
                                            onClick={() => setSelectedMemberId(members[currentMemberIndex + 1].userId)}
                                            sx={{
                                                minWidth: '48px',
                                                height: '28px',
                                                textTransform: 'none',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: '#475569',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '6px',
                                                bgcolor: '#ffffff',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                                '&:disabled': { opacity: 0.4 }
                                            }}
                                        >
                                            Next ›
                                        </Button>
                                    </Box>
                                )}
                            </Box>

                            {/* 3. Member Profile Summary Strip (Only when individual member selected) */}
                            {activeMember && (
                                <Box sx={{
                                    mx: 3,
                                    mt: 2,
                                    p: 1.8,
                                    bgcolor: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 1.5,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}>
                                    <Box display="flex" alignItems="center" gap={1.4}>
                                        <Avatar sx={{
                                            width: 38,
                                            height: 38,
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            bgcolor: activeMember.submitted ? '#dcfce7' : '#fee2e2',
                                            color: activeMember.submitted ? '#166534' : '#991b1b',
                                            border: `1px solid ${activeMember.submitted ? '#86efac' : '#fca5a5'}`
                                        }}>
                                            {getInitials(activeMember.name)}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" fontSize="13.5px" lineHeight={1.2}>
                                                {activeMember.name}
                                            </Typography>
                                            <Typography variant="caption" color="#64748b" fontSize="11px" display="flex" alignItems="center" gap={0.5} mt={0.3}>
                                                {activeMember.submitted ? (
                                                    <span style={{ color: '#166534', fontWeight: 700 }}>✓ Submitted</span>
                                                ) : (
                                                    <span style={{ color: '#b91c1c', fontWeight: 700 }}>⚠️ Pending Submission</span>
                                                )}
                                                <span>•</span>
                                                <span>Sub-Team: {seg.sub_team}</span>
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                                        {isTargetOn && memberTargetSum > 0 && (
                                            <>
                                                <Box sx={{ textAlign: 'center', px: 1 }}>
                                                    <Typography variant="caption" color="#2563eb" fontSize="10px" fontWeight={700} display="block" sx={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                        Target Total
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={800} color="#1d4ed8" fontSize="14px">
                                                        {memberTargetSum.toLocaleString()}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ width: '1px', minWidth: '1px', height: '24px', bgcolor: '#e2e8f0', flexShrink: 0 }} />
                                                <Box sx={{ textAlign: 'center', px: 1 }}>
                                                    <Typography variant="caption" color="#047857" fontSize="10px" fontWeight={700} display="block" sx={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                        Target Actual
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={800} color="#047857" fontSize="14px">
                                                        {memberActualSum.toLocaleString()}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ width: '1px', minWidth: '1px', height: '24px', bgcolor: '#e2e8f0', flexShrink: 0 }} />
                                            </>
                                        )}
                                        <Box sx={{ textAlign: 'center', px: 1 }}>
                                            <Typography variant="caption" color="#64748b" fontSize="10px" fontWeight={600} display="block" sx={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                {isTargetOn ? 'Grand Total' : 'Tasks Logged'}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={800} color="#0f172a" fontSize="14px">
                                                {memberTotalTasks.toLocaleString()}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ width: '1px', minWidth: '1px', height: '24px', bgcolor: '#e2e8f0', flexShrink: 0 }} />
                                        <Box sx={{ textAlign: 'center', px: 1 }}>
                                            <Typography variant="caption" color="#64748b" fontSize="10px" fontWeight={600} display="block" sx={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                Active Categories
                                            </Typography>
                                            <Typography variant="body2" fontWeight={800} color="#2563eb" fontSize="14px">
                                                {memberActiveCategories}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {/* 4. Controls inside Drawer */}
                            <Box sx={{
                                px: 3,
                                py: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 1.5
                            }}>
                                <TextField
                                    size="small"
                                    placeholder={activeMember ? `Filter ${activeMember.name.split(' ')[0]}'s tasks...` : "Filter task categories..."}
                                    value={taskSearch}
                                    onChange={(e) => setTaskSearch(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                                            </InputAdornment>
                                        ),
                                        sx: { height: 32, fontSize: '12px', borderRadius: '7px' }
                                    }}
                                    sx={{ width: 220 }}
                                />

                                <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                                    <Button
                                        size="small"
                                        variant={isTargetOn ? "contained" : "outlined"}
                                        onClick={() => setDrawerTargetToggle(prev => prev !== null ? !prev : !isTargetOn)}
                                        sx={{
                                            textTransform: 'none',
                                            fontSize: '11.5px',
                                            fontWeight: 700,
                                            height: '30px',
                                            borderRadius: '7px',
                                            px: 1.4,
                                            bgcolor: isTargetOn ? '#2563eb' : '#ffffff',
                                            color: isTargetOn ? '#ffffff' : '#475569',
                                            borderColor: isTargetOn ? '#1d4ed8' : '#cbd5e1',
                                            boxShadow: isTargetOn ? '0 1px 3px rgba(37,99,235,0.3)' : '0 1px 2px rgba(0,0,0,0.04)',
                                            '&:hover': {
                                                bgcolor: isTargetOn ? '#1d4ed8' : '#f8fafc',
                                                borderColor: isTargetOn ? '#1e40af' : '#94a3b8'
                                            }
                                        }}
                                    >
                                        {isTargetOn ? '🎯 Target: ON' : '🎯 Target: OFF'}
                                    </Button>

                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={hideZeroTasks}
                                                onChange={(e) => setHideZeroTasks(e.target.checked)}
                                                sx={{ p: 0.5 }}
                                            />
                                        }
                                        label={
                                            <Typography variant="caption" color="#475569" fontWeight={600}>
                                                {activeMember ? `Hide zero-count tasks` : 'Hide zero-count tasks'}
                                            </Typography>
                                        }
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

                            {/* 5. Drawer Table Content */}
                            <Box sx={{ px: 3, pb: 3, flex: 1, overflowY: 'auto' }}>
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
                                            sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 600, borderRadius: '7px' }}
                                        >
                                            Preview Template Categories ({seg.task_breakdown?.length || 0})
                                        </Button>
                                    </Paper>
                                ) : activeMember ? (
                                    /* ═══ INDIVIDUAL MEMBER FOCUSED VIEW ═══ */
                                    <Table size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569' }}>
                                                    TASK CATEGORY
                                                </TableCell>
                                                {isTargetOn && (
                                                    <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#2563eb', textAlign: 'right', width: 120 }}>
                                                        TARGET
                                                    </TableCell>
                                                )}
                                                <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#047857', textAlign: 'right', width: isTargetOn ? 140 : 150, pr: 3 }}>
                                                    {isTargetOn ? 'ACTUAL / TOTAL' : `${activeMember.name.split(' ')[0].toUpperCase()}'S COUNT`}
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredTasks.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={isTargetOn ? 3 : 2} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                                                        No task categories match the criteria for {activeMember.name}.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredTasks.map((task, tIdx) => {
                                                    const tData = getMemberTaskData(task, activeMember);
                                                    const hasRowTarget = tData.has_target && tData.target !== null && tData.target !== undefined;

                                                    return (
                                                        <TableRow key={tIdx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                            <TableCell sx={{ py: 1.2, fontWeight: 600, fontSize: '12.5px', color: '#1e293b' }}>
                                                                <Box display="flex" alignItems="center" gap={1}>
                                                                    <span>{task.task_name}</span>
                                                                    {isTargetOn && (
                                                                        hasRowTarget ? (
                                                                            <Chip 
                                                                                label="Target Set" 
                                                                                size="small" 
                                                                                sx={{ 
                                                                                    height: '18px', 
                                                                                    fontSize: '9.5px', 
                                                                                    fontWeight: 700, 
                                                                                    bgcolor: '#eff6ff', 
                                                                                    color: '#2563eb', 
                                                                                    border: '1px solid #bfdbfe' 
                                                                                }} 
                                                                            />
                                                                        ) : (
                                                                            <Chip 
                                                                                label="No Target" 
                                                                                size="small" 
                                                                                sx={{ 
                                                                                    height: '18px', 
                                                                                    fontSize: '9.5px', 
                                                                                    fontWeight: 500, 
                                                                                    bgcolor: '#f1f5f9', 
                                                                                    color: '#64748b' 
                                                                                }} 
                                                                            />
                                                                        )
                                                                    )}
                                                                </Box>
                                                            </TableCell>

                                                            {isTargetOn && (
                                                                <TableCell align="right" sx={{ py: 1.2 }}>
                                                                    {hasRowTarget ? (
                                                                        <Typography variant="body2" fontWeight={800} color="#2563eb" fontSize="13px">
                                                                            {tData.target.toLocaleString()}
                                                                        </Typography>
                                                                    ) : (
                                                                        <Typography variant="body2" color="#94a3b8" fontSize="13px">
                                                                            —
                                                                        </Typography>
                                                                    )}
                                                                </TableCell>
                                                            )}

                                                            <TableCell align="right" sx={{ py: 1.2, pr: 3 }}>
                                                                {isTargetOn ? (
                                                                    hasRowTarget ? (
                                                                        <Box display="flex" flexDirection="column" alignItems="flex-end">
                                                                            <Typography variant="body2" fontWeight={800} color={tData.actual > 0 ? '#047857' : '#94a3b8'} fontSize="13px">
                                                                                {tData.actual > 0 ? tData.actual.toLocaleString() : '0'}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="#059669" fontSize="9.5px" fontWeight={600}>
                                                                                Actual
                                                                            </Typography>
                                                                        </Box>
                                                                    ) : (
                                                                        <Box display="flex" flexDirection="column" alignItems="flex-end">
                                                                            <Typography variant="body2" fontWeight={800} color={tData.count > 0 ? '#047857' : '#94a3b8'} fontSize="13px">
                                                                                {tData.count > 0 ? tData.count.toLocaleString() : '—'}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="#64748b" fontSize="9.5px" fontWeight={500}>
                                                                                Total
                                                                            </Typography>
                                                                        </Box>
                                                                    )
                                                                ) : (
                                                                    <Typography variant="body2" fontWeight={800} color={tData.count > 0 ? '#047857' : '#94a3b8'} fontSize="13px">
                                                                        {tData.count > 0 ? tData.count.toLocaleString() : '—'}
                                                                    </Typography>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                        <TableFooter sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0', position: 'sticky', bottom: 0, zIndex: 2 }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>
                                                    Total for {activeMember.name}
                                                </TableCell>
                                                {isTargetOn && (
                                                    <TableCell align="right" sx={{ fontWeight: 800, fontSize: '13px', color: '#2563eb' }}>
                                                        {memberTargetSum > 0 ? memberTargetSum.toLocaleString() : '—'}
                                                    </TableCell>
                                                )}
                                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '14px', color: '#047857', pr: 3 }}>
                                                    {isTargetOn ? (
                                                        <Box display="flex" flexDirection="column" alignItems="flex-end">
                                                            <Typography variant="body2" fontWeight={800} color="#0f172a" fontSize="14px">
                                                                {memberTotalTasks.toLocaleString()}
                                                            </Typography>
                                                            {memberActualSum > 0 && (
                                                                <Typography variant="caption" color="#047857" fontWeight={700} fontSize="10px">
                                                                    Actual: {memberActualSum.toLocaleString()}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    ) : (
                                                        memberTotalTasks.toLocaleString()
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                ) : (
                                    /* ═══ ALL MEMBERS FULL MATRIX VIEW ═══ */
                                    <Table size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#475569', minWidth: 200 }}>
                                                    TASK ITEM / CATEGORY
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700, fontSize: '11px', color: '#0f172a', bgcolor: '#f1f5f9' }} align="center">
                                                    SEGMENT TOTAL
                                                </TableCell>
                                                {members.map(m => (
                                                    <TableCell 
                                                        key={m.userId} 
                                                        onClick={() => setSelectedMemberId(m.userId)}
                                                        sx={{ 
                                                            fontWeight: 700, 
                                                            fontSize: '11px', 
                                                            color: '#475569', 
                                                            cursor: 'pointer',
                                                            '&:hover': { bgcolor: '#e2e8f0', color: '#0f172a' } 
                                                        }} 
                                                        align="center"
                                                        title={`Click to focus on ${m.name}`}
                                                    >
                                                        <Box display="flex" flexDirection="column" alignItems="center" gap={0.2}>
                                                            <span>{m.name.split(' ')[0]}</span>
                                                            {m.has_targets && (
                                                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#2563eb' }}>🎯 Target</span>
                                                            )}
                                                            <span style={{ fontSize: '9px', fontWeight: 500, color: '#2563eb' }}>🔍 focus</span>
                                                        </Box>
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredTasks.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={members.length + 2} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                                                        No task categories match the search filter.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredTasks.map((task, tIdx) => {
                                                    const hasTaskTarget = Boolean(task.has_target && task.total_target !== null);

                                                    return (
                                                        <TableRow key={tIdx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                            <TableCell sx={{ py: 1, fontWeight: 600, fontSize: '12px', color: '#1e293b' }}>
                                                                <Box display="flex" alignItems="center" gap={1}>
                                                                    <span>{task.task_name}</span>
                                                                    {isTargetOn && (
                                                                        hasTaskTarget ? (
                                                                            <Chip 
                                                                                label="Target Set" 
                                                                                size="small" 
                                                                                sx={{ height: '17px', fontSize: '9px', fontWeight: 700, bgcolor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }} 
                                                                            />
                                                                        ) : (
                                                                            <Chip 
                                                                                label="No Target" 
                                                                                size="small" 
                                                                                sx={{ height: '17px', fontSize: '9px', fontWeight: 500, bgcolor: '#f1f5f9', color: '#64748b' }} 
                                                                            />
                                                                        )
                                                                    )}
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell align="center" sx={{ py: 1, bgcolor: '#f8fafc' }}>
                                                                {isTargetOn && hasTaskTarget ? (
                                                                    <Box display="flex" flexDirection="column" alignItems="center">
                                                                        <Typography variant="body2" fontWeight={800} color="#047857" fontSize="12px">
                                                                            {(task.total_actual ?? task.total_count ?? 0).toLocaleString()}
                                                                        </Typography>
                                                                        <Typography variant="caption" color="#2563eb" fontWeight={700} fontSize="9.5px">
                                                                            Target: {task.total_target.toLocaleString()}
                                                                        </Typography>
                                                                    </Box>
                                                                ) : (
                                                                    <Box display="flex" flexDirection="column" alignItems="center">
                                                                        <Typography variant="body2" fontWeight={800} color="#0f172a" fontSize="12px">
                                                                            {(task.total_count || 0).toLocaleString()}
                                                                        </Typography>
                                                                        {isTargetOn && (
                                                                            <Typography variant="caption" color="#64748b" fontWeight={500} fontSize="9.5px">
                                                                                Total
                                                                            </Typography>
                                                                        )}
                                                                    </Box>
                                                                )}
                                                            </TableCell>
                                                            {members.map(m => {
                                                                const mData = getMemberTaskData(task, m);
                                                                const hasMTarget = mData.has_target && mData.target !== null;

                                                                return (
                                                                    <TableCell 
                                                                        key={m.userId} 
                                                                        align="center" 
                                                                        onClick={() => setSelectedMemberId(m.userId)}
                                                                        sx={{ 
                                                                            py: 1, 
                                                                            fontSize: '12px', 
                                                                            cursor: 'pointer',
                                                                            '&:hover': { bgcolor: '#f0fdf4' }
                                                                        }} 
                                                                        title={`Click to inspect ${m.name}`}
                                                                    >
                                                                        {isTargetOn && hasMTarget ? (
                                                                            <Box display="flex" flexDirection="column" alignItems="center">
                                                                                <Typography variant="body2" fontWeight={800} color={mData.actual > 0 ? '#047857' : '#94a3b8'} fontSize="11.5px">
                                                                                    {mData.actual > 0 ? mData.actual : '0'}
                                                                                </Typography>
                                                                                <Typography variant="caption" color="#2563eb" fontWeight={600} fontSize="9px">
                                                                                    T: {mData.target}
                                                                                </Typography>
                                                                            </Box>
                                                                        ) : (
                                                                            <Typography variant="body2" fontWeight={mData.count > 0 ? 600 : 400} color={mData.count > 0 ? '#0f172a' : '#94a3b8'} fontSize="12px">
                                                                                {mData.count > 0 ? mData.count : '—'}
                                                                            </Typography>
                                                                        )}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                        <TableFooter sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0', position: 'sticky', bottom: 0, zIndex: 2 }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 800, fontSize: '11px', color: '#0f172a' }}>
                                                    SEGMENT TOTALS
                                                </TableCell>
                                                <TableCell align="center" sx={{ py: 1, bgcolor: '#f1f5f9' }}>
                                                    <Typography variant="body2" fontWeight={800} color="#0f172a" fontSize="12.5px">
                                                        {(seg.total_tasks || 0).toLocaleString()}
                                                    </Typography>
                                                </TableCell>
                                                {members.map(m => (
                                                    <TableCell key={m.userId} align="center" sx={{ py: 1 }}>
                                                        <Typography variant="body2" fontWeight={800} color="#047857" fontSize="12px">
                                                            {(m.task_count || 0).toLocaleString()}
                                                        </Typography>
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableFooter>
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

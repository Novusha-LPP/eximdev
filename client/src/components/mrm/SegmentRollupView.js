import React, { useState } from 'react';
import { 
    Box, Typography, Chip, Button, IconButton, Collapse, Table, TableHead, 
    TableRow, TableCell, TableBody, Paper, Tooltip, Dialog, DialogTitle, 
    DialogContent, DialogActions 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LockIcon from '@mui/icons-material/Lock';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import RecurringBlockerBadge from './RecurringBlockerBadge';
import { approveSegmentsRollup } from '../../services/mrmService';

/**
 * Section 2: Sub-Team KPI Performance Segments
 * Displays clustered sub-team cards with derived 2-signal RAG, explicit reason badges,
 * and individual member attribution.
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
    const [approving, setApproving] = useState(false);
    const [openApproveDialog, setOpenApproveDialog] = useState(false);
    const [approvalSuccess, setApprovalSuccess] = useState('');

    const toggleExpand = (subTeam) => {
        setExpandedSegments(prev => ({
            ...prev,
            [subTeam]: !prev[subTeam]
        }));
    };

    // Filter logic
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
                    dot: '#ef4444'
                };
            case 'Amber':
                return {
                    border: '#fde047',
                    bg: '#fefce8',
                    badgeBg: '#fef3c7',
                    badgeText: '#92400e',
                    dot: '#f59e0b'
                };
            case 'Green':
            default:
                return {
                    border: '#86efac',
                    bg: '#f0fdf4',
                    badgeBg: '#dcfce7',
                    badgeText: '#166534',
                    dot: '#10b981'
                };
        }
    };

    return (
        <Box sx={{ mt: 3, mb: 4 }}>
            {/* Section Header & Controls */}
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
                <Box>
                    <Typography variant="h6" fontWeight={800} color="#0f172a">
                        Section 2: Sub-Team KPI Performance Segments
                    </Typography>
                    <Typography variant="caption" color="#64748b">
                        Weight: 70% of Monthly HOD Score | Automated 2-Signal RAG (Trend Deviation + Operational Flags)
                    </Typography>
                </Box>

                {/* Filter Controls: All | Reds First | Red | Amber | Green */}
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
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
                        All Segments ({segments.length})
                    </Button>

                    <Button
                        size="small"
                        variant={filter === 'AMBER' ? 'contained' : 'outlined'}
                        onClick={() => setFilter('AMBER')}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '12px',
                            color: '#b45309',
                            borderColor: '#fde68a'
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
                            color: '#047857',
                            borderColor: '#a7f3d0'
                        }}
                    >
                        🟢 Greens ({greenCount})
                    </Button>

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
                <Box sx={{ p: 1.5, mb: 2, bgcolor: '#ecfdf5', color: '#065f46', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    {approvalSuccess}
                </Box>
            )}

            {/* List of Segment Cards */}
            {displayedSegments.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                    <Typography variant="body2" color="#64748b">
                        No segments match the selected filter.
                    </Typography>
                </Paper>
            ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                    {displayedSegments.map((segment) => {
                        const ragTheme = getRagStyles(segment.final_rag);
                        const isExpanded = Boolean(expandedSegments[segment.sub_team]);
                        const memberNames = (segment.contributing_members || []).map(m => m.name).join(', ');

                        return (
                            <Paper
                                key={segment.sub_team}
                                elevation={0}
                                sx={{
                                    border: `1.5px solid ${ragTheme.border}`,
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    transition: 'box-shadow 0.2s ease',
                                    '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }
                                }}
                            >
                                {/* Segment Header Banner */}
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: ragTheme.bg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: 1.5,
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => toggleExpand(segment.sub_team)}
                                >
                                    <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                                        {/* Status Dot */}
                                        <Box sx={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            bgcolor: ragTheme.dot,
                                            boxShadow: `0 0 0 3px ${ragTheme.badgeBg}`
                                        }} />

                                        {/* Title with bracketed members */}
                                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                            {segment.sub_team} Sub-Team <span style={{ fontWeight: 500, fontSize: '13px', color: '#475569' }}>[{memberNames || 'No members assigned'}]</span>
                                        </Typography>

                                        {/* Explicit Reason Badge */}
                                        {segment.reason_badge && (
                                            <Chip
                                                label={segment.reason_badge}
                                                size="small"
                                                sx={{
                                                    bgcolor: ragTheme.badgeBg,
                                                    color: ragTheme.badgeText,
                                                    fontWeight: 700,
                                                    fontSize: '11px',
                                                    border: `1px solid ${ragTheme.border}`
                                                }}
                                            />
                                        )}
                                    </Box>

                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Chip
                                            label={`${segment.segment_score || 0} pts`}
                                            size="small"
                                            sx={{
                                                bgcolor: '#ffffff',
                                                fontWeight: 800,
                                                fontSize: '12px',
                                                border: '1px solid #cbd5e1'
                                            }}
                                        />

                                        <IconButton size="small">
                                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </Box>
                                </Box>

                                {/* Key Operational Summary Metrics Strip */}
                                <Box sx={{
                                    px: 2.5,
                                    py: 1.2,
                                    bgcolor: '#ffffff',
                                    borderTop: '1px solid #f1f5f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 2,
                                    fontSize: '12px'
                                }}>
                                    {/* Tasks & Trend */}
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Typography variant="body2" fontSize="12px" color="#334155">
                                            <strong>Monthly Output:</strong> {segment.total_tasks || 0} tasks
                                        </Typography>

                                        {segment.is_cold_start ? (
                                            <Chip label="Trend: Cold Start (M 1-3)" size="small" sx={{ fontSize: '10px', height: '20px' }} />
                                        ) : (
                                            <Typography variant="body2" fontSize="12px" color={segment.trend_status === 'Red' ? '#b91c1c' : (segment.trend_status === 'Amber' ? '#b45309' : '#047857')}>
                                                <strong>3M Trend:</strong> {segment.trailing_3m_avg} avg ({segment.trend_deviation_pct > 0 ? `+${segment.trend_deviation_pct}` : segment.trend_deviation_pct}%)
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Business Loss */}
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <CurrencyRupeeIcon sx={{ fontSize: 14, color: segment.flags?.has_business_loss ? '#b91c1c' : '#64748b' }} />
                                        <Typography variant="body2" fontSize="12px" color={segment.flags?.has_business_loss ? '#b91c1c' : '#64748b'}>
                                            <strong>Loss:</strong> {segment.flags?.has_business_loss ? `₹ ${segment.flags?.business_loss_total.toLocaleString('en-IN')}` : '₹ 0 [Clean]'}
                                        </Typography>
                                    </Box>

                                    {/* Blockers */}
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <Typography variant="body2" fontSize="12px" color={segment.flags?.has_blockers ? '#b91c1c' : '#64748b'}>
                                            <strong>Blockers:</strong> {segment.flags?.has_blockers ? `${segment.flags?.blockers_count} reported` : 'None [Clean]'}
                                        </Typography>
                                    </Box>

                                    {/* Missed Submissions Alert */}
                                    {segment.flags?.has_unsubmitted && (
                                        <Chip
                                            label={`⚠️ Missed Submission: ${segment.flags?.unsubmitted_members?.join(', ')}`}
                                            size="small"
                                            sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 700, fontSize: '10px' }}
                                        />
                                    )}
                                </Box>

                                {/* Collapsible Drilldown Section: Tasks & Individual Member Attribution */}
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                    <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderTop: '1px dashed #cbd5e1' }}>
                                        {/* Task Breakdown Table */}
                                        <Typography variant="subtitle2" fontWeight={700} color="#1e293b" mb={1}>
                                            Task Breakdown & Member Attribution
                                        </Typography>

                                        {segment.task_breakdown?.length > 0 ? (
                                            <Table size="small" sx={{ bgcolor: '#ffffff', borderRadius: '8px', overflow: 'hidden', mb: 2 }}>
                                                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: '11px' }}>Task Type</TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: '11px' }}>Segment Total</TableCell>
                                                        {(segment.contributing_members || []).map(m => (
                                                            <TableCell key={m.userId} align="center" sx={{ fontWeight: 700, fontSize: '11px' }}>
                                                                {m.name}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {segment.task_breakdown.map((t, idx) => (
                                                        <TableRow key={idx} hover>
                                                            <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>{t.task_name}</TableCell>
                                                            <TableCell align="center" sx={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                                                                {t.total_count}
                                                            </TableCell>
                                                            {(segment.contributing_members || []).map(m => {
                                                                const mEntry = (t.member_counts || []).find(mc => mc.userId?.toString() === m.userId?.toString());
                                                                return (
                                                                    <TableCell key={m.userId} align="center" sx={{ fontSize: '12px', color: '#475569' }}>
                                                                        {mEntry ? mEntry.count : 0}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <Typography variant="caption" color="#64748b" sx={{ display: 'block', mb: 2 }}>
                                                No task entries logged for this segment yet.
                                            </Typography>
                                        )}

                                        {/* Contributing Member Detail Cards */}
                                        <Typography variant="subtitle2" fontWeight={700} color="#1e293b" mb={1}>
                                            Individual Member Operational Details
                                        </Typography>
                                        <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={1.5}>
                                            {(segment.contributing_members || []).map((m) => (
                                                <Box
                                                    key={m.userId}
                                                    sx={{
                                                        p: 1.5,
                                                        bgcolor: '#ffffff',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                                    }}
                                                >
                                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                                                        <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                            {m.name}
                                                        </Typography>
                                                        {m.submitted ? (
                                                            <Chip label="Submitted" size="small" color="success" sx={{ height: '18px', fontSize: '9px', fontWeight: 700 }} />
                                                        ) : (
                                                            <Chip label="Pending" size="small" color="error" sx={{ height: '18px', fontSize: '9px', fontWeight: 700 }} />
                                                        )}
                                                    </Box>

                                                    <Typography variant="caption" color="#475569" display="block">
                                                        <strong>Total Tasks:</strong> {m.task_count || 0}
                                                    </Typography>

                                                    <Typography variant="caption" color={m.business_loss > 0 ? '#b91c1c' : '#475569'} display="block">
                                                        <strong>Business Loss:</strong> {m.business_loss > 0 ? `₹ ${m.business_loss.toLocaleString('en-IN')}` : '₹ 0 (Clean)'}
                                                    </Typography>
                                                    {m.business_loss_remarks && (
                                                        <Typography variant="caption" fontStyle="italic" color="#64748b" display="block" sx={{ pl: 1 }}>
                                                            "{m.business_loss_remarks}"
                                                        </Typography>
                                                    )}

                                                    <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                                        <Typography variant="caption" color={m.has_blockers ? '#b91c1c' : '#475569'}>
                                                            <strong>Blocker:</strong> {m.has_blockers ? m.blockers_summary : 'None'}
                                                        </Typography>
                                                        {m.has_blockers && m.blockers_recurrence_key && (
                                                            <RecurringBlockerBadge blocker={m.blockers_summary} consecutiveCount={2} />
                                                        )}
                                                    </Box>

                                                    <Typography variant="caption" color="#475569" display="block" mt={0.5}>
                                                        <strong>Open Points:</strong> {m.open_points_count || 0} items
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                </Collapse>
                            </Paper>
                        );
                    })}
                </Box>
            )}

            {/* Confirmation Dialog for HOD Approval */}
            <Dialog open={openApproveDialog} onClose={() => setOpenApproveDialog(false)}>
                <DialogTitle sx={{ fontWeight: 800 }}>Approve Sub-Team KPI Segments?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="#475569">
                        Approving will lock the sub-team KPI data for <strong>{department}</strong> ({month}/{year}) and compute the final 70/30 blended monthly HOD score for Suraj Rajan's review.
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

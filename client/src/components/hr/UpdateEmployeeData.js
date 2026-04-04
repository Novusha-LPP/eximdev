import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
    Box, 
    Typography, 
    TextField, 
    Card, 
    Avatar, 
    IconButton, 
    Button, 
    Grid, 
    Divider,
    Dialog,
    DialogContent,
    CircularProgress,
    Chip,
    alpha,
    useTheme,
    Fade,
    Badge,
    Stack,
    Paper,
} from '@mui/material';
import { 
    Search as SearchIcon, 
    PhotoCamera as PhotoIcon, 
    Email as EmailIcon, 
    Delete as DeleteIcon,
    Person as PersonIcon,
    History as HistoryIcon,
    Link as LinkIcon,
    Close as CloseIcon,
    Download as DownloadIcon,
    Verified as VerifiedIcon,
    Image as ImageIcon,
    Description as FileIcon,
    KeyboardArrowRight as ArrowIcon,
    Layers as LayersIcon,
    People as PeopleIcon,
    Public as GlobalIcon,
    AddPhotoAlternate as AddPhotoIcon,
    Draw as DrawIcon,
    AttachFile as AttachFileIcon,
    CheckCircleOutline as ApproveIcon,
    CancelOutlined as RejectIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { UserContext } from '../../contexts/UserContext';
import { message } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
    ink:      '#0F172A',
    ink2:     '#334155',
    muted:    '#64748B',
    subtle:   '#94A3B8',
    border:   '#E2E8F0',
    borderHv: '#CBD5E1',
    bg:       '#F8FAFC',
    bgHv:     '#F1F5F9',
    white:    '#FFFFFF',
    blue:     '#3B82F6',
    blueDk:   '#1D4ED8',
    green:    '#22C55E',
    greenDk:  '#15803D',
    amber:    '#F59E0B',
    red:      '#EF4444',
    redDk:    '#B91C1C',
    accent:   '#6366F1',
};

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '10px', fontSize: '0.82rem', bgcolor: T.white,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '& fieldset': { borderColor: T.border, transition: 'border-color 0.2s' },
        '&:hover fieldset': { borderColor: T.borderHv },
        '&.Mui-focused': { bgcolor: T.white, boxShadow: `0 0 0 4px ${alpha(T.blue, 0.1)}` },
        '&.Mui-focused fieldset': { borderColor: T.blue, borderWidth: '1.5px' },
    },
};

const searchSx = {
    ...inputSx,
    '& .MuiOutlinedInput-root': {
        ...inputSx['& .MuiOutlinedInput-root'],
        bgcolor: alpha(T.subtle, 0.08),
        '& fieldset': { border: 'none' },
        '&:hover': { bgcolor: alpha(T.subtle, 0.12) },
        '&.Mui-focused': { bgcolor: T.white, border: `1px solid ${T.blue}`, boxShadow: `0 8px 20px -12px ${alpha(T.ink, 0.15)}` },
    },
};

const btnPrimary = {
    borderRadius: '8px', fontWeight: 700, textTransform: 'none', fontSize: '0.78rem', px: 2,
    bgcolor: `${T.ink} !important`, color: `${T.white} !important`,
    '&:hover': { bgcolor: `${T.ink2} !important` },
    '&.Mui-disabled': { bgcolor: `${T.border} !important`, color: `${T.muted} !important` },
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, title, value, color }) => (
    <Paper elevation={0} sx={{
        p: '16px 20px', borderRadius: '12px', border: `1px solid ${T.border}`, bgcolor: T.white,
        display: 'flex', alignItems: 'center', gap: 2,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: `0 4px 16px ${alpha(color, 0.1)}` },
    }}>
        <Box sx={{ width: 42, height: 42, borderRadius: '10px', border: `1px solid ${alpha(color, 0.18)}`, bgcolor: alpha(color, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon sx={{ fontSize: 19, color }} />
        </Box>
        <Box>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1, mb: 0.4 }}>
                {title}
            </Typography>
            <Typography sx={{ fontSize: '1.55rem', fontWeight: 800, color: T.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {value}
            </Typography>
        </Box>
    </Paper>
);

const GlobalAssetCard = ({ asset, onDelete }) => (
    <Paper elevation={0} sx={{
        p: '14px', borderRadius: '10px', border: `1px solid ${T.border}`, bgcolor: T.white,
        transition: 'all 0.15s',
        '&:hover': { borderColor: T.blue, boxShadow: `0 0 0 3px ${alpha(T.blue, 0.07)}` },
    }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.25 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: alpha(T.blue, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileIcon sx={{ color: T.blue, fontSize: 15 }} />
            </Box>
            <Stack direction="row" spacing={0.25}>
                <IconButton component="a" href={asset.link} target="_blank" size="small" sx={{ p: '4px', color: T.subtle, '&:hover': { color: T.blue } }}>
                    <DownloadIcon sx={{ fontSize: 15 }} />
                </IconButton>
                <IconButton onClick={() => onDelete(asset._id)} size="small" sx={{ p: '4px', color: T.subtle, '&:hover': { color: T.red } }}>
                    <DeleteIcon sx={{ fontSize: 15 }} />
                </IconButton>
            </Stack>
        </Box>
        <Typography sx={{ fontWeight: 700, color: T.ink, fontSize: '0.8rem', lineHeight: 1.3, mb: 0.5 }} noWrap>{asset.name}</Typography>
        <Typography sx={{ fontSize: '0.67rem', color: T.muted, display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <PersonIcon sx={{ fontSize: 10 }} /> {asset.updatedBy}
        </Typography>
    </Paper>
);

const EmployeeCard = ({ emp, onClick }) => (
    <Paper elevation={0} onClick={() => onClick(emp)} sx={{
        p: '12px 14px', cursor: 'pointer', borderRadius: '12px',
        border: `1px solid ${T.border}`, bgcolor: T.white, transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative', overflow: 'hidden',
        '&:hover': { 
            borderColor: T.blue, 
            transform: 'translateY(-2px)',
            boxShadow: `0 12px 24px -10px ${alpha(T.ink, 0.12)}`,
            '& .hover-arrow': { transform: 'translateX(4px)', color: T.blue }
        },
    }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={emp.is_verified ? <VerifiedIcon sx={{ color: '#1d9bf0 !important', fontSize: 15, bgcolor: T.white, borderRadius: '50%', p: '1px' }} /> : null}
            >
                <Avatar src={emp.employee_photo} sx={{ width: 44, height: 44, fontSize: '0.9rem', bgcolor: alpha(T.accent, 0.12), color: T.accent, fontWeight: 800, border: `1.5px solid ${alpha(T.accent, 0.2)}` }}>
                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                </Avatar>
            </Badge>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: T.ink, lineHeight: 1.2, mb: 0.3 }} noWrap>
                    {emp.first_name} {emp.last_name}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: T.muted, fontWeight: 500 }} noWrap>
                    {emp.designation || 'Specialist'}
                </Typography>
            </Box>
            <ArrowIcon className="hover-arrow" sx={{ color: alpha(T.subtle, 0.3), fontSize: 18, flexShrink: 0, transition: 'all 0.2s' }} />
        </Box>
    </Paper>
);

const PanelHeader = ({ icon: Icon, label, badge }) => (
    <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon sx={{ fontSize: 15, color: T.blue }} />
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: T.ink, textTransform: 'uppercase', letterSpacing: '0.09em', flex: 1 }}>
            {label}
        </Typography>
        {badge != null && badge > 0 && (
            <Box sx={{ px: '7px', py: '2px', borderRadius: '5px', bgcolor: alpha(T.blue, 0.08) }}>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: T.blue }}>{badge}</Typography>
            </Box>
        )}
    </Box>
);

const AssetVerificationCard = ({ type, proof, onAction }) => {
    const isApproved = proof?.status === 'Approved';
    const isRejected = proof?.status === 'Rejected';
    const isPending  = !proof?.status || proof?.status === 'Pending';
    const statusColor = isApproved ? T.greenDk : isRejected ? T.redDk : T.amber;
    const statusBg    = isApproved ? alpha(T.green, 0.08) : isRejected ? alpha(T.red, 0.08) : alpha(T.amber, 0.08);

    return (
        <Box sx={{ p: 2, borderRadius: '10px', border: `1px solid ${T.border}`, bgcolor: T.bg }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 26, height: 26, borderRadius: '6px', bgcolor: alpha(T.blue, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {type === 'profile_photo' ? <PhotoIcon sx={{ fontSize: 13, color: T.blue }} /> : <EmailIcon sx={{ fontSize: 13, color: T.blue }} />}
                    </Box>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: T.ink }}>
                        {type === 'profile_photo' ? 'Profile Photo' : 'Email Signature'}
                    </Typography>
                </Box>
                <Box sx={{ px: '8px', py: '3px', borderRadius: '6px', bgcolor: statusBg, border: `1px solid ${alpha(statusColor, 0.2)}` }}>
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: statusColor, letterSpacing: '0.04em' }}>
                        {proof?.status || 'Pending'}
                    </Typography>
                </Box>
            </Stack>
            <Button component="a" href={proof?.url} target="_blank" fullWidth variant="outlined" size="small"
                startIcon={<ImageIcon sx={{ fontSize: 14 }} />}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', borderColor: T.border, color: T.ink2, mb: (isApproved || isPending) ? 1.5 : 0, '&:hover': { borderColor: T.blue, color: T.blue, bgcolor: alpha(T.blue, 0.04) } }}
            >
                Preview File
            </Button>
            {isApproved && (
                <Box sx={{ bgcolor: alpha(T.green, 0.07), px: 1.25, py: 1, borderRadius: '8px', border: `1px solid ${alpha(T.green, 0.15)}`, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <ApproveIcon sx={{ fontSize: 14, color: T.greenDk }} />
                    <Typography sx={{ fontSize: '0.72rem', color: T.greenDk, fontWeight: 700 }}>Approved by {proof.approvedBy}</Typography>
                </Box>
            )}
            {isPending && (
                <Stack direction="row" spacing={1}>
                    <Button fullWidth variant="contained" size="small" onClick={() => onAction(type, 'Approved')} disableElevation
                        startIcon={<ApproveIcon sx={{ fontSize: 14 }} />}
                        sx={{ borderRadius: '8px', bgcolor: `${T.greenDk} !important`, color: 'white !important', fontWeight: 700, textTransform: 'none', fontSize: '0.75rem' }}>
                        Approve
                    </Button>
                    <Button fullWidth variant="outlined" size="small" onClick={() => onAction(type, 'Rejected')}
                        startIcon={<RejectIcon sx={{ fontSize: 14 }} />}
                        sx={{ borderRadius: '8px', borderColor: alpha(T.red, 0.35), color: T.red, fontWeight: 700, textTransform: 'none', fontSize: '0.75rem', '&:hover': { bgcolor: alpha(T.red, 0.05), borderColor: T.red } }}>
                        Reject
                    </Button>
                </Stack>
            )}
        </Box>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const UpdateEmployeeData = () => {
    const theme = useTheme();
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const [employeesByCompany, setEmployeesByCompany] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [globalAssets, setGlobalAssets] = useState([]);
    const [activeTab, setActiveTab] = useState('employees');
    const [additionalAsset, setAdditionalAsset] = useState({ name: '', file: null, value: '' });

    useEffect(() => { fetchEmployees(); fetchGlobalAssets(); }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/hr/active-by-company`, { withCredentials: true });
            setEmployeesByCompany(res.data);
        } catch (err) { console.error(err); message.error("Failed to load employees"); }
        finally { setLoading(false); }
    };

    const fetchGlobalAssets = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/hr/global-assets`, { withCredentials: true });
            setGlobalAssets(res.data);
        } catch (err) { console.error(err); }
    };

    const handleEmployeeClick = (emp) => { setSelectedEmployee(emp); setDialogOpen(true); };

    const handleUpload = async (assetType, file, assetName = '') => {
        if (!file && assetType !== 'variable') return;
        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('userId', selectedEmployee._id);
            formData.append('assetType', assetType);
            if (file) formData.append('file', file);
            if (assetName) formData.append('assetName', assetName);
            if (assetType === 'variable' && !file) formData.append('value', additionalAsset.value);
            const endpoint = assetType === 'global' ? '/hr/global-asset/upload' : '/hr/asset/upload';
            const res = await axios.post(`${process.env.REACT_APP_API_STRING}${endpoint}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }, withCredentials: true,
            });
            message.success(`${assetType} updated successfully`);
            if (assetType === 'global') { fetchGlobalAssets(); setAdditionalAsset({ name: '', file: null, value: '' }); }
            else { setSelectedEmployee(res.data.user); fetchEmployees(); }
        } catch (err) { console.error(err); message.error("Upload failed"); }
        finally { setUploading(false); }
    };

    const handleDelete = async (assetType, assetId = '') => {
        try {
            setUploading(true);
            const endpoint = assetType === 'global'
                ? `/hr/global-asset/${assetId}`
                : `/hr/asset/${selectedEmployee._id}/${assetId}?assetType=${assetType}`;
            const res = await axios.delete(`${process.env.REACT_APP_API_STRING}${endpoint}`, { withCredentials: true });
            message.success(`${assetType} deleted successfully`);
            if (assetType === 'global') { fetchGlobalAssets(); }
            else { setSelectedEmployee(res.data.user); fetchEmployees(); }
        } catch (err) { console.error(err); message.error("Deletion failed"); }
        finally { setUploading(false); }
    };

    const handleVerificationAction = async (assetType, action) => {
        try {
            setUploading(true);
            const res = await axios.post(`${process.env.REACT_APP_API_STRING}/hr/marketing-proof-action`, {
                userId: selectedEmployee._id, assetType, action,
            }, { withCredentials: true });
            message.success(`${assetType.replace('_', ' ')} verification ${action.toLowerCase()}`);
            setSelectedEmployee(res.data.user);
            fetchEmployees();
        } catch (err) { console.error(err); message.error("Action failed"); }
        finally { setUploading(false); }
    };

    const filteredCompanies = useMemo(() => {
        return Object.keys(employeesByCompany).reduce((acc, company) => {
            const filtered = employeesByCompany[company].filter(emp =>
                `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (emp.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (emp.designation || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (filtered.length > 0) acc[company] = filtered;
            return acc;
        }, {});
    }, [employeesByCompany, searchQuery]);

    const stats = useMemo(() => {
        let total = 0, verified = 0;
        Object.values(employeesByCompany).forEach(list => { total += list.length; verified += list.filter(e => e.is_verified).length; });
        return { total, verified, pending: total - verified };
    }, [employeesByCompany]);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: T.bg, display: 'flex', flexDirection: 'column' }}>

            {/* ── Sticky Header ─────────────────────────────────────────── */}
            <Box sx={{ bgcolor: alpha(T.white, 0.8), borderBottom: `1px solid ${T.border}`, position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
                <Box sx={{ px: 3, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    
                    {/* Left: Brand */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: T.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${alpha(T.ink, 0.2)}` }}>
                                <LayersIcon sx={{ color: T.white, fontSize: 18 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 900, color: T.ink, fontSize: '0.95rem', lineHeight: 1, mb: 0.5, letterSpacing: '-0.02em' }}>Data Hub</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: T.blue }} />
                                    <Typography sx={{ fontSize: '0.62rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Marketing Module</Typography>
                                </Box>
                            </Box>
                        </Box>
                        
                        <Divider orientation="vertical" flexItem sx={{ height: 28, my: 'auto', borderColor: T.border }} />

                        {/* Tabs as Segmented Control */}
                        <Box sx={{ display: 'flex', bgcolor: alpha(T.subtle, 0.08), borderRadius: '10px', p: '4px', gap: 0.5, border: `1px solid ${alpha(T.border, 0.5)}` }}>
                            {[
                                { key: 'employees', label: 'Employees', icon: PeopleIcon },
                                { key: 'global',    label: 'Global Assets', icon: GlobalIcon },
                            ].map(({ key, label, icon: Icon }) => (
                                <Button key={key} size="small" onClick={() => setActiveTab(key)} disableElevation
                                    startIcon={<Icon sx={{ fontSize: '15px !important' }} />}
                                    sx={{
                                        borderRadius: '7px', px: 2, py: 0.6, fontSize: '0.75rem', fontWeight: 700,
                                        textTransform: 'none', minWidth: 0,
                                        bgcolor: activeTab === key ? `${T.white} !important` : 'transparent !important',
                                        color:  activeTab === key ? `${T.blue} !important`  : `${T.muted} !important`,
                                        boxShadow: activeTab === key ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                                        border: activeTab === key ? `1px solid ${alpha(T.border, 0.8)}` : '1px solid transparent',
                                        '&:hover': { bgcolor: activeTab === key ? T.white : alpha(T.subtle, 0.12) }
                                    }}
                                >
                                    {label}
                                </Button>
                            ))}
                        </Box>
                    </Box>

                    {/* Right: Search */}
                    <TextField placeholder="Search by name, role or username…" size="small" value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ ...searchSx, width: 320 }}
                        InputProps={{ 
                            startAdornment: <SearchIcon sx={{ color: T.subtle, mr: 1, fontSize: 18 }} />,
                            sx: { height: 40 }
                        }}
                    />
                </Box>

                {/* Stats sub-bar */}
                {activeTab === 'employees' && (
                    <Box sx={{ px: 3, py: 1.5, bgcolor: T.bg, borderTop: `1px solid ${T.border}` }}>
                        <Grid container spacing={1.5}>
                            <Grid item xs={4}><StatCard icon={PeopleIcon}  title="Total Employees" value={stats.total}    color={T.blue}    /></Grid>
                            <Grid item xs={4}><StatCard icon={VerifiedIcon} title="Verified"         value={stats.verified} color={T.greenDk} /></Grid>
                            <Grid item xs={4}><StatCard icon={HistoryIcon}  title="Pending Review"   value={stats.pending}  color={T.amber}   /></Grid>
                        </Grid>
                    </Box>
                )}
            </Box>

            {/* ── Page Content ─────────────────────────────────────────── */}
            <Box sx={{ flex: 1, px: 3, pt: 3, pb: 5 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress size={24} sx={{ color: T.blue }} />
                    </Box>
                ) : activeTab === 'global' ? (
                    <>
                        <Paper elevation={0} sx={{ p: 1.75, mb: 3, borderRadius: '10px', border: `1px solid ${T.border}`, bgcolor: T.white, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <GlobalIcon sx={{ color: T.subtle, fontSize: 18, flexShrink: 0 }} />
                            <TextField fullWidth placeholder="New global asset name…" size="small" value={additionalAsset.name}
                                onChange={(e) => setAdditionalAsset({ ...additionalAsset, name: e.target.value })}
                                sx={inputSx}
                            />
                            <Button component="label" variant="contained" disabled={!additionalAsset.name} size="small" disableElevation sx={{ ...btnPrimary, flexShrink: 0, px: 2.5 }}>
                                Upload File
                                <input type="file" hidden onChange={(e) => handleUpload('global', e.target.files[0], additionalAsset.name)} />
                            </Button>
                        </Paper>
                        <Grid container spacing={1.75}>
                            {globalAssets.map(asset => (
                                <Grid item xs={6} sm={4} md={3} lg={2} key={asset._id}>
                                    <GlobalAssetCard asset={asset} onDelete={(id) => handleDelete('global', id)} />
                                </Grid>
                            ))}
                        </Grid>
                    </>
                ) : (
                    Object.keys(filteredCompanies).map(company => (
                        <Box key={company} sx={{ mb: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5, pb: 1.25, borderBottom: `1px solid ${T.border}` }}>
                                <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: alpha(T.accent, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <PersonIcon sx={{ fontSize: 14, color: T.accent }} />
                                </Box>
                                <Typography sx={{ fontWeight: 800, color: T.ink, fontSize: '0.9rem' }}>{company}</Typography>
                                <Box sx={{ px: '8px', py: '2px', borderRadius: '6px', bgcolor: alpha(T.blue, 0.08) }}>
                                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: T.blue }}>
                                        {filteredCompanies[company].length} employees
                                    </Typography>
                                </Box>
                            </Box>
                            <Grid container spacing={1.5}>
                                {filteredCompanies[company].map(emp => (
                                    <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={emp._id}>
                                        <EmployeeCard emp={emp} onClick={handleEmployeeClick} />
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    ))
                )}
            </Box>

            {/* ── Employee Dialog ──────────────────────────────────────── */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}
                maxWidth="md" fullWidth
                PaperProps={{ elevation: 0, sx: { borderRadius: '14px', border: `1px solid ${T.border}`, overflow: 'hidden', m: 2 } }}
            >
                {selectedEmployee && (
                    <Box sx={{ bgcolor: T.white, position: 'relative' }}>

                        {/* Dialog header */}
                        <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    badgeContent={selectedEmployee.is_verified
                                        ? <VerifiedIcon sx={{ color: '#1d9bf0 !important', fontSize: 16, bgcolor: T.white, borderRadius: '50%' }} />
                                        : null}
                                >
                                    <Avatar src={selectedEmployee.employee_photo}
                                        sx={{ width: 54, height: 54, fontSize: '1.1rem', bgcolor: alpha(T.accent, 0.12), color: T.accent, fontWeight: 800, border: `2px solid ${T.border}` }}>
                                        {selectedEmployee.first_name[0]}
                                    </Avatar>
                                </Badge>
                                <Box>
                                    <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: T.ink, lineHeight: 1.2 }}>
                                        {selectedEmployee.first_name} {selectedEmployee.last_name}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.78rem', color: T.muted, mt: 0.3 }}>
                                        {selectedEmployee.designation || 'No designation'}
                                    </Typography>
                                </Box>
                            </Box>
                            <IconButton onClick={() => setDialogOpen(false)} size="small"
                                sx={{ color: T.muted, bgcolor: T.bg, borderRadius: '8px', border: `1px solid ${T.border}`, '&:hover': { bgcolor: T.bgHv } }}>
                                <CloseIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                        </Box>

                        {/* Dialog body */}
                        <DialogContent sx={{ p: 2.5, bgcolor: T.bg }}>
                            <Grid container spacing={2.5}>

                                {/* ── Left: Assets ── */}
                                <Grid item xs={12} md={7}>
                                    <Stack spacing={2}>

                                        {/* Photo */}
                                        <Paper elevation={0} sx={{ borderRadius: '12px', border: `1px solid ${T.border}`, bgcolor: T.white, overflow: 'hidden' }}>
                                            <PanelHeader icon={AddPhotoIcon} label="Profile Photo" />
                                            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar src={selectedEmployee.employee_photo}
                                                    sx={{ width: 52, height: 52, border: `2px solid ${T.border}`, bgcolor: alpha(T.accent, 0.1), color: T.accent, fontWeight: 800, fontSize: '1rem' }}>
                                                    {selectedEmployee.first_name[0]}
                                                </Avatar>
                                                <Stack direction="row" spacing={1}>
                                                    <Button component="label" variant="contained" size="small" disableElevation sx={btnPrimary}>
                                                        Upload Photo
                                                        <input type="file" hidden accept="image/*" onChange={(e) => handleUpload('photo', e.target.files[0])} />
                                                    </Button>
                                                    {selectedEmployee.employee_photo && (
                                                        <Button variant="outlined" size="small" onClick={() => handleDelete('photo')}
                                                            sx={{ borderRadius: '8px', borderColor: alpha(T.red, 0.3), color: T.red, fontWeight: 700, textTransform: 'none', fontSize: '0.75rem', '&:hover': { bgcolor: alpha(T.red, 0.05), borderColor: T.red } }}>
                                                            Remove
                                                        </Button>
                                                    )}
                                                </Stack>
                                            </Box>
                                        </Paper>

                                        {/* Signature */}
                                        <Paper elevation={0} sx={{ borderRadius: '12px', border: `1px solid ${T.border}`, bgcolor: T.white, overflow: 'hidden' }}>
                                            <PanelHeader icon={DrawIcon} label="Email Signature" />
                                            <Box sx={{ p: 2 }}>
                                                <Stack direction="row" spacing={1}>
                                                    <Button component="label" variant="contained" size="small" disableElevation sx={btnPrimary}>
                                                        Upload Signature
                                                        <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => handleUpload('signature', e.target.files[0])} />
                                                    </Button>
                                                    {selectedEmployee.email_signature && (
                                                        <>
                                                            <Button variant="outlined" size="small" component="a" href={selectedEmployee.email_signature} target="_blank"
                                                                sx={{ borderRadius: '8px', borderColor: T.border, color: T.ink2, fontWeight: 700, textTransform: 'none', fontSize: '0.75rem', '&:hover': { borderColor: T.blue, color: T.blue, bgcolor: alpha(T.blue, 0.04) } }}>
                                                                View
                                                            </Button>
                                                            <Button variant="outlined" size="small" onClick={() => handleDelete('signature')}
                                                                sx={{ borderRadius: '8px', borderColor: alpha(T.red, 0.3), color: T.red, fontWeight: 700, textTransform: 'none', fontSize: '0.75rem', '&:hover': { bgcolor: alpha(T.red, 0.05), borderColor: T.red } }}>
                                                                Remove
                                                            </Button>
                                                        </>
                                                    )}
                                                </Stack>
                                            </Box>
                                        </Paper>

                                        {/* Linked Assets */}
                                        <Paper elevation={0} sx={{ borderRadius: '12px', border: `1px solid ${T.border}`, bgcolor: T.white, overflow: 'hidden' }}>
                                            <PanelHeader icon={AttachFileIcon} label="Linked Assets" badge={selectedEmployee.marketing_assets?.length} />
                                            <Box sx={{ p: 2 }}>
                                                {selectedEmployee.marketing_assets?.length > 0 && (
                                                    <Stack spacing={0.75} sx={{ mb: 2 }}>
                                                        {selectedEmployee.marketing_assets.map(asset => (
                                                            <Box key={asset._id} sx={{ px: 1.5, py: '9px', borderRadius: '8px', bgcolor: T.bg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <FileIcon sx={{ fontSize: 13, color: T.muted }} />
                                                                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: T.ink2 }} noWrap>{asset.name}</Typography>
                                                                </Box>
                                                                <Stack direction="row" spacing={0.25}>
                                                                    <IconButton onClick={() => { navigator.clipboard.writeText(asset.link); message.success("Copied!"); }} size="small" sx={{ p: '4px', color: T.subtle, '&:hover': { color: T.blue } }}>
                                                                        <LinkIcon sx={{ fontSize: 14 }} />
                                                                    </IconButton>
                                                                    <IconButton onClick={() => handleDelete('variable', asset._id)} size="small" sx={{ p: '4px', color: T.subtle, '&:hover': { color: T.red } }}>
                                                                        <DeleteIcon sx={{ fontSize: 14 }} />
                                                                    </IconButton>
                                                                </Stack>
                                                            </Box>
                                                        ))}
                                                    </Stack>
                                                )}
                                                <Stack direction="row" spacing={1}>
                                                    <TextField fullWidth size="small" placeholder="Asset name…"
                                                        value={additionalAsset.name}
                                                        onChange={(e) => setAdditionalAsset({ ...additionalAsset, name: e.target.value })}
                                                        sx={inputSx}
                                                    />
                                                    <Button component="label" variant="contained" disabled={!additionalAsset.name} size="small" disableElevation sx={{ ...btnPrimary, flexShrink: 0 }}>
                                                        Add
                                                        <input type="file" hidden onChange={(e) => handleUpload('variable', e.target.files[0], additionalAsset.name)} />
                                                    </Button>
                                                </Stack>
                                            </Box>
                                        </Paper>

                                    </Stack>
                                </Grid>

                                {/* ── Right: Verification ── */}
                                <Grid item xs={12} md={5}>
                                    <Paper elevation={0} sx={{ borderRadius: '12px', border: `1px solid ${T.border}`, bgcolor: T.white, overflow: 'hidden' }}>
                                        <PanelHeader icon={VerifiedIcon} label="Verification" />
                                        <Box sx={{ p: 2 }}>
                                            {!selectedEmployee.profile_photo_proof && !selectedEmployee.email_signature_proof ? (
                                                <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25 }}>
                                                    <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: T.bg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <VerifiedIcon sx={{ fontSize: 22, color: T.subtle }} />
                                                    </Box>
                                                    <Typography sx={{ fontSize: '0.78rem', color: T.muted, fontWeight: 600 }}>No pending verifications</Typography>
                                                </Box>
                                            ) : (
                                                <Stack spacing={1.5}>
                                                    {selectedEmployee.profile_photo_proof && (
                                                        <AssetVerificationCard type="profile_photo" proof={selectedEmployee.profile_photo_proof} onAction={handleVerificationAction} />
                                                    )}
                                                    {selectedEmployee.email_signature_proof && (
                                                        <AssetVerificationCard type="email_signature" proof={selectedEmployee.email_signature_proof} onAction={handleVerificationAction} />
                                                    )}
                                                </Stack>
                                            )}
                                        </Box>
                                    </Paper>
                                </Grid>

                            </Grid>
                        </DialogContent>
                    </Box>
                )}

                {/* Upload overlay */}
                {uploading && (
                    <Box sx={{ position: 'absolute', inset: 0, bgcolor: alpha(T.white, 0.75), zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                        <Paper elevation={0} sx={{ px: 3, py: 2, borderRadius: '12px', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <CircularProgress size={18} sx={{ color: T.blue }} />
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.ink }}>Uploading…</Typography>
                        </Paper>
                    </Box>
                )}
            </Dialog>
        </Box>
    );
};

export default UpdateEmployeeData;
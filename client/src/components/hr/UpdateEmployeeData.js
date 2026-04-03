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
    InputAdornment, 
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Tooltip,
    Chip,
    alpha,
    useTheme,
    Fade,
    Zoom,
    Badge,
    Stack,
    Paper
} from '@mui/material';
import { 
    Search as SearchIcon, 
    PhotoCamera as PhotoIcon, 
    Email as EmailIcon, 
    CloudUpload as UploadIcon, 
    Delete as DeleteIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    History as HistoryIcon,
    AddCircle as AddIcon,
    Link as LinkIcon,
    Close as CloseIcon,
    Download as DownloadIcon,
    MoreVert as MoreIcon,
    CheckCircle as CheckCircleIcon,
    Verified as VerifiedIcon,
    Image as ImageIcon,
    Description as FileIcon,
    KeyboardArrowRight as ArrowIcon,
    GppGood as GuardIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';
import { UserContext } from '../../contexts/UserContext';
import { message } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

// --- Sub-components for a cleaner UI ---

const StatCard = ({ icon: Icon, title, value, color }) => (
    <Paper sx={{ 
        p: 1.5, 
        borderRadius: 3, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5,
        boxShadow: 'none',
        border: '1px solid',
        borderColor: alpha('#000', 0.05),
        bgcolor: alpha(color, 0.03)
    }}>
        <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: alpha(color, 0.1), 
            color: color,
            display: 'flex'
        }}>
            <Icon sx={{ fontSize: 18 }} />
        </Box>
        <Box>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
                {title}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>
                {value}
            </Typography>
        </Box>
    </Paper>
);

const GlobalAssetCard = ({ asset, onDelete, theme }) => (
    <Zoom in={true}>
        <Card sx={{ 
            p: 1.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: alpha('#000', 0.05),
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
                borderColor: 'primary.main'
            }
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <FileIcon sx={{ color: 'primary.main', fontSize: 16 }} />
                </Box>
                <Stack direction="row" spacing={0.5}>
                    <IconButton component="a" href={asset.link} target="_blank" size="small" sx={{ color: 'primary.main' }}>
                        <DownloadIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton onClick={() => onDelete(asset._id)} size="small" sx={{ color: 'error.main' }}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Stack>
            </Box>
            <Typography sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5, fontSize: '0.85rem' }} noWrap>
                {asset.name}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem' }}>
                <PersonIcon sx={{ fontSize: 10 }} /> {asset.updatedBy}
            </Typography>
        </Card>
    </Zoom>
);

const EmployeeCard = ({ emp, onClick, theme }) => (
    <Fade in={true}>
        <MotionCard 
            whileHover={{ y: -2 }}
            onClick={() => onClick(emp)}
            sx={{ 
                p: 1.5,
                cursor: 'pointer',
                borderRadius: 3,
                border: '1px solid',
                borderColor: alpha('#000', 0.05),
                bgcolor: 'white',
                transition: 'all 0.3s ease',
                '&:hover': {
                    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                    borderColor: theme.palette.primary.main,
                }
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                        emp.is_verified ? 
                        <VerifiedIcon sx={{ color: '#1d9bf0 !important', fontSize: 16, bgcolor: 'white', borderRadius: '50%' }} /> : 
                        null
                    }
                >
                    <Avatar src={emp.employee_photo} sx={{ width: 44, height: 44 }}>
                        {emp.first_name[0]}{emp.last_name[0]}
                    </Avatar>
                </Badge>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }} noWrap>
                        {emp.first_name} {emp.last_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: -0.2 }} noWrap>
                        {emp.designation || 'No designation'}
                    </Typography>
                </Box>
                <ArrowIcon sx={{ color: alpha('#000', 0.1), fontSize: 18 }} />
            </Box>
        </MotionCard>
    </Fade>
);

const AssetVerificationCard = ({ type, proof, onAction, theme }) => {
    const isApproved = proof?.status === 'Approved';
    const isRejected = proof?.status === 'Rejected';
    const isPending = !proof?.status || proof?.status === 'Pending';
    const statusColor = isApproved ? 'success' : isRejected ? 'error' : 'warning';
    
    return (
        <Paper sx={{ 
            p: 2, 
            borderRadius: 3, 
            border: '1px solid',
            borderColor: alpha(theme.palette[statusColor].main, 0.2),
            bgcolor: alpha(theme.palette[statusColor].main, 0.02),
        }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase' }}>
                    {type === 'profile_photo' ? <PhotoIcon sx={{ fontSize: 14 }} /> : <EmailIcon sx={{ fontSize: 14 }} />}
                    {type === 'profile_photo' ? 'Photo' : 'Signature'}
                </Typography>
                <Chip label={proof?.status || 'Pending'} size="small" color={statusColor} sx={{ fontWeight: 800, height: 18, fontSize: '0.65rem' }} />
            </Stack>

            <Button
                component="a" href={proof?.url} target="_blank" fullWidth variant="outlined" color={statusColor} size="small"
                startIcon={<ImageIcon sx={{ fontSize: 14 }} />}
                sx={{ borderRadius: 2, textTransform: 'none', mb: isApproved ? 1.5 : 0, fontWeight: 700, fontSize: '0.75rem' }}
            >
                Preview
            </Button>

            {isApproved && (
                <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.05), p: 1, borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ display: 'block', color: 'success.dark', fontWeight: 700, fontSize: '0.65rem' }}>
                        Approved by {proof.approvedBy}
                    </Typography>
                </Box>
            )}

            {isPending && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button fullWidth variant="contained" color="success" size="small" onClick={() => onAction(type, 'Approved')} sx={{ borderRadius: 2, color: 'white !important', fontWeight: 700, textTransform: 'none', fontSize: '0.7rem' }}>Approve</Button>
                    <Button fullWidth variant="contained" color="error" size="small" onClick={() => onAction(type, 'Rejected')} sx={{ borderRadius: 2, color: 'white !important', fontWeight: 700, textTransform: 'none', fontSize: '0.7rem' }}>Reject</Button>
                </Stack>
            )}
        </Paper>
    );
};

// --- Main Component ---

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

    useEffect(() => {
        fetchEmployees();
        fetchGlobalAssets();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/hr/active-by-company`, { withCredentials: true });
            setEmployeesByCompany(res.data);
        } catch (err) {
            console.error(err);
            message.error("Failed to load employees");
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalAssets = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/hr/global-assets`, { withCredentials: true });
            setGlobalAssets(res.data);
        } catch (err) {
            console.error(err);
        }
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
                headers: { 'Content-Type': 'multipart/form-data' }, withCredentials: true
            });

            message.success(`${assetType} updated successfully`);
            if (assetType === 'global') {
                fetchGlobalAssets();
                setAdditionalAsset({ name: '', file: null, value: '' });
            } else {
                setSelectedEmployee(res.data.user);
                fetchEmployees();
            }
        } catch (err) {
            console.error(err);
            message.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (assetType, assetId = '') => {
        try {
            setUploading(true);
            const endpoint = assetType === 'global' ? `/hr/global-asset/${assetId}` : `/hr/asset/${selectedEmployee._id}/${assetId}?assetType=${assetType}`;
            const res = await axios.delete(`${process.env.REACT_APP_API_STRING}${endpoint}`, { withCredentials: true });
            message.success(`${assetType} deleted successfully`);
            if (assetType === 'global') { fetchGlobalAssets(); } else { setSelectedEmployee(res.data.user); fetchEmployees(); }
        } catch (err) { console.error(err); message.error("Deletion failed"); } finally { setUploading(false); }
    };

    const handleVerificationAction = async (assetType, action) => {
        try {
            setUploading(true);
            const res = await axios.post(`${process.env.REACT_APP_API_STRING}/hr/marketing-proof-action`, {
                userId: selectedEmployee._id, assetType, action
            }, { withCredentials: true });
            message.success(`${assetType.replace('_', ' ')} verification ${action.toLowerCase()}`);
            setSelectedEmployee(res.data.user);
            fetchEmployees();
        } catch (err) { console.error(err); message.error("Action failed"); } finally { setUploading(false); }
    };

    const filteredCompanies = useMemo(() => {
        return Object.keys(employeesByCompany).reduce((acc, company) => {
            const filtered = employeesByCompany[company].filter(emp => 
                `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.designation?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (filtered.length > 0) acc[company] = filtered;
            return acc;
        }, {});
    }, [employeesByCompany, searchQuery]);

    const stats = useMemo(() => {
        let total = 0; let verified = 0;
        Object.values(employeesByCompany).forEach(list => { total += list.length; verified += list.filter(e => e.is_verified).length; });
        return { total, verified, pending: total - verified };
    }, [employeesByCompany]);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
            <Paper elevation={0} sx={{ 
                bgcolor: 'white', borderBottom: '1px solid', borderColor: alpha('#000', 0.05),
                position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)', backgroundColor: alpha('#fff', 0.8)
            }}>
                <Box sx={{ maxWidth: '1400px', mx: 'auto', px: 3, py: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography sx={{ fontWeight: 900, color: '#0f172a', fontSize: '1.1rem' }}>Data Hub</Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>Marketing Module</Typography>
                        </Box>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ bgcolor: alpha('#000', 0.04), p: 0.4, borderRadius: 2.5, display: 'flex' }}>
                                {['employees', 'global'].map(tab => (
                                    <Button key={tab} size="small" onClick={() => setActiveTab(tab)}
                                        sx={{ 
                                            borderRadius: 2, px: 2, py: 0.5, fontSize: '0.75rem', fontWeight: 700, textTransform: 'none',
                                            bgcolor: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? 'primary.main' : 'text.secondary',
                                            boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                        }}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </Button>
                                ))}
                            </Box>
                            <TextField placeholder="Search..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />,
                                    sx: { borderRadius: 2, bgcolor: alpha('#000', 0.02), '& fieldset': { border: 'none' }, width: 200 } }}
                            />
                        </Stack>
                    </Stack>
                </Box>
            </Paper>

            <Box sx={{ maxWidth: '1400px', mx: 'auto', px: 3, mt: 3 }}>
                {activeTab === 'employees' && (
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        <Grid item xs={4}><StatCard icon={PersonIcon} title="Total" value={stats.total} color={theme.palette.primary.main} /></Grid>
                        <Grid item xs={4}><StatCard icon={VerifiedIcon} title="Verified" value={stats.verified} color={theme.palette.success.main} /></Grid>
                        <Grid item xs={4}><StatCard icon={HistoryIcon} title="Pending" value={stats.pending} color={theme.palette.warning.main} /></Grid>
                    </Grid>
                )}

                {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress size={30} /></Box> :
                activeTab === 'global' ? (
                    <Box>
                        <Paper sx={{ p: 1.5, mb: 3, borderRadius: 3, border: '1px solid', borderColor: alpha('#000', 0.05), boxShadow: 'none' }}>
                            <Stack direction="row" spacing={2}>
                                <TextField fullWidth placeholder="New Global Asset Name" size="small" value={additionalAsset.name} 
                                    onChange={(e) => setAdditionalAsset({...additionalAsset, name: e.target.value})}
                                    InputProps={{ sx: { borderRadius: 2, bgcolor: alpha('#000', 0.02) } }}
                                />
                                <Button component="label" variant="contained" disabled={!additionalAsset.name} size="small"
                                    sx={{ borderRadius: 2, px: 3, fontWeight: 700, textTransform: 'none', color: 'white !important', bgcolor: '#1e293b !important' }}
                                >
                                    Upload <input type="file" hidden onChange={(e) => handleUpload('global', e.target.files[0], additionalAsset.name)} />
                                </Button>
                            </Stack>
                        </Paper>
                        <Grid container spacing={2}>{globalAssets.map(asset => (<Grid item xs={6} sm={4} md={2.4} key={asset._id}><GlobalAssetCard asset={asset} onDelete={(id) => handleDelete('global', id)} theme={theme} /></Grid>))}</Grid>
                    </Box>
                ) : (
                    Object.keys(filteredCompanies).map(company => (
                        <Box key={company} sx={{ mb: 4 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                                <Typography sx={{ fontWeight: 900, color: '#1e293b', fontSize: '1rem' }}>{company}</Typography>
                                <Chip label={filteredCompanies[company].length} size="small" sx={{ fontWeight: 800, height: 20, fontSize: '0.7rem' }} />
                            </Stack>
                            <Grid container spacing={2}>{filteredCompanies[company].map(emp => (<Grid item xs={12} sm={6} md={3} key={emp._id}><EmployeeCard emp={emp} onClick={handleEmployeeClick} theme={theme} /></Grid>))}</Grid>
                        </Box>
                    ))
                )}
            </Box>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
                {selectedEmployee && (
                    <Box sx={{ bgcolor: '#fff' }}>
                        <Box sx={{ p: 2, background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: 'white', position: 'relative' }}>
                            <IconButton onClick={() => setDialogOpen(false)} size="small" sx={{ position: 'absolute', right: 12, top: 12, color: 'white' }}><CloseIcon fontSize="small" /></IconButton>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar src={selectedEmployee.employee_photo} sx={{ width: 60, height: 60, border: '2px solid rgba(255,255,255,0.2)' }}>{selectedEmployee.first_name[0]}</Avatar>
                                <Box>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Typography sx={{ fontWeight: 900, fontSize: '1.2rem' }}>{selectedEmployee.first_name} {selectedEmployee.last_name}</Typography>
                                        {selectedEmployee.is_verified && <VerifiedIcon sx={{ color: '#1d9bf0', fontSize: 20 }} />}
                                    </Stack>
                                    <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600, display: 'block' }}>{selectedEmployee.designation}</Typography>
                                </Box>
                            </Stack>
                        </Box>

                        <DialogContent sx={{ p: 2, bgcolor: '#f8fafc' }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={7}>
                                    <Stack spacing={2}>
                                        <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: alpha('#000', 0.05) }}>
                                            <Typography variant="caption" sx={{ fontWeight: 900, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, color: '#1e293b' }}><PhotoIcon sx={{ fontSize: 14 }} /> PHOTO</Typography>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Button component="label" variant="contained" size="small" sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', bgcolor: '#1e293b !important', color: 'white !important' }}>
                                                    Upload <input type="file" hidden accept="image/*" onChange={(e) => handleUpload('photo', e.target.files[0])} />
                                                </Button>
                                                {selectedEmployee.employee_photo && <Button variant="text" color="error" size="small" onClick={() => handleDelete('photo')} sx={{ fontWeight: 700, textTransform: 'none' }}>Remove</Button>}
                                            </Stack>
                                        </Paper>
                                        <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: alpha('#000', 0.05) }}>
                                            <Typography variant="caption" sx={{ fontWeight: 900, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, color: '#1e293b' }}><EmailIcon sx={{ fontSize: 14 }} /> SIGNATURE</Typography>
                                            <Stack direction="row" spacing={1}>
                                                <Button component="label" variant="contained" size="small" sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', bgcolor: '#1e293b !important', color: 'white !important' }}>
                                                    Upload <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => handleUpload('signature', e.target.files[0])} />
                                                </Button>
                                                {selectedEmployee.email_signature && <Button variant="outlined" size="small" component="a" href={selectedEmployee.email_signature} target="_blank" sx={{ borderRadius: 2 }}>View</Button>}
                                            </Stack>
                                        </Paper>
                                        <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: alpha('#000', 0.05) }}>
                                            <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, color: '#1e293b' }}><FileIcon sx={{ fontSize: 14 }} /> LINKS</Typography>
                                            <Stack spacing={1} sx={{ mb: 2 }}>
                                                {selectedEmployee.marketing_assets?.map(asset => (
                                                    <Box key={asset._id} sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#000', 0.03), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>{asset.name}</Typography>
                                                        <Stack direction="row">
                                                            <IconButton onClick={() => { navigator.clipboard.writeText(asset.link); message.success("Copied!"); }} size="small" color="primary"><LinkIcon sx={{ fontSize: 14 }} /></IconButton>
                                                            <IconButton onClick={() => handleDelete('variable', asset._id)} size="small" color="error"><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
                                                        </Stack>
                                                    </Box>
                                                ))}
                                            </Stack>
                                            <Stack direction="row" spacing={1}>
                                                <TextField fullWidth size="small" placeholder="Name" value={additionalAsset.name} onChange={(e) => setAdditionalAsset({ ...additionalAsset, name: e.target.value })} InputProps={{ sx: { borderRadius: 2, fontSize: '0.75rem' } }} />
                                                <Button component="label" variant="contained" disabled={!additionalAsset.name} size="small" sx={{ borderRadius: 2, bgcolor: '#1e293b !important', color: 'white !important', textTransform: 'none' }}>
                                                    Add <input type="file" hidden onChange={(e) => handleUpload('variable', e.target.files[0], additionalAsset.name)} />
                                                </Button>
                                            </Stack>
                                        </Paper>
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} md={5}>
                                    <Stack spacing={2}>
                                        <Typography variant="caption" sx={{ fontWeight: 900, color: '#1e293b', ml: 1 }}>VERIFICATION</Typography>
                                        {selectedEmployee.profile_photo_proof && <AssetVerificationCard type="profile_photo" proof={selectedEmployee.profile_photo_proof} onAction={handleVerificationAction} theme={theme} />}
                                        {selectedEmployee.email_signature_proof && <AssetVerificationCard type="email_signature" proof={selectedEmployee.email_signature_proof} onAction={handleVerificationAction} theme={theme} />}
                                    </Stack>
                                </Grid>
                            </Grid>
                        </DialogContent>
                    </Box>
                )}
                {uploading && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: alpha('#fff', 0.6), zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress size={30} />
                    </Box>
                )}
            </Dialog>
        </Box>
    );
};

export default UpdateEmployeeData;
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
    Badge
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
    Image as ImageIcon,
    Description as FileIcon
} from '@mui/icons-material';
import axios from 'axios';
import { UserContext } from '../../contexts/UserContext';
import { message } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);

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
    const [activeTab, setActiveTab] = useState('employees'); // 'employees' or 'global'

    // Asset modification state
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

    const handleEmployeeClick = (emp) => {
        setSelectedEmployee(emp);
        setDialogOpen(true);
    };

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
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
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
            
            if (assetType === 'global') {
                fetchGlobalAssets();
            } else {
                setSelectedEmployee(res.data.user);
                fetchEmployees();
            }
        } catch (err) {
            console.error(err);
            message.error("Deletion failed");
        } finally {
            setUploading(false);
        }
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

    if (user.department !== 'Marketing' && user.role !== 'Admin') {
        return (
            <Box sx={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
            }}>
                <Card sx={{ p: 5, textAlign: 'center', maxWidth: 500, borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#ef4444', mb: 2 }}>Access Denied</Typography>
                    <Typography variant="body1" color="textSecondary">Only the Marketing team can access this module.</Typography>
                </Card>
            </Box>
        );
    }


    return (
        <Box sx={{ 
            minHeight: '100vh',
            bgcolor: '#f8fafc',
            width: '100%'
        }}>
            {/* Header */}
            <Box sx={{ 
                bgcolor: 'white',
                borderBottom: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.1),
                px: { xs: 2, md: 4 },
                py: 2,
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backdropFilter: 'blur(10px)',
                backgroundColor: alpha('#fff', 0.9)
            }}>
                <Box sx={{ 
                    maxWidth: '1600px', 
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 2
                }}>
                    <Box>
                        <Typography variant="h4" sx={{ 
                            fontWeight: 800, 
                            background: 'linear-gradient(135deg, #0f172a 0%, #2563eb 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 0.5
                        }}>
                            Employee Data Hub
                        </Typography>
                        <Typography color="textSecondary" variant="body2">
                            Manage employee profiles, assets, and marketing variables
                        </Typography>
                    </Box>
                    
                    <Box sx={{ 
                        display: 'flex', 
                        gap: 2, 
                        alignItems: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <Box sx={{ 
                            display: 'flex', 
                            gap: 1, 
                            bgcolor: alpha('#000', 0.04), 
                            p: 0.5, 
                            borderRadius: 3 
                        }}>
                            <Button
                                onClick={() => setActiveTab('employees')}
                                sx={{ 
                                    borderRadius: 2,
                                    px: 3,
                                    py: 1,
                                    bgcolor: activeTab === 'employees' ? 'white' : 'transparent',
                                    color: activeTab === 'employees' ? 'primary.main' : 'text.secondary',
                                    boxShadow: activeTab === 'employees' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                    '&:hover': {
                                        bgcolor: activeTab === 'employees' ? 'white' : alpha('#000', 0.02)
                                    }
                                }}
                            >
                                <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                                Employees
                            </Button>
                            <Button
                                onClick={() => setActiveTab('global')}
                                sx={{ 
                                    borderRadius: 2,
                                    px: 3,
                                    py: 1,
                                    bgcolor: activeTab === 'global' ? 'white' : 'transparent',
                                    color: activeTab === 'global' ? 'primary.main' : 'text.secondary',
                                    boxShadow: activeTab === 'global' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                    '&:hover': {
                                        bgcolor: activeTab === 'global' ? 'white' : alpha('#000', 0.02)
                                    }
                                }}
                            >
                                <BusinessIcon sx={{ mr: 1, fontSize: 20 }} />
                                Global Assets
                            </Button>
                        </Box>
                        
                        <TextField
                            placeholder="Search by name, username, or designation..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{ 
                                width: { xs: '100%', md: 320 },
                                bgcolor: 'white',
                                borderRadius: 3,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    '&:hover fieldset': {
                                        borderColor: 'primary.main',
                                    },
                                },
                            }}
                            size="small"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'primary.main' }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>
                </Box>
            </Box>

            {/* Main Content */}
            <Box sx={{ 
                maxWidth: '1600px', 
                margin: '0 auto', 
                px: { xs: 2, md: 4 },
                py: 4
            }}>
                {loading ? (
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        minHeight: '60vh'
                    }}>
                        <CircularProgress size={60} thickness={4} sx={{ color: 'primary.main' }} />
                    </Box>
                ) : activeTab === 'global' ? (
                    <MotionBox
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Global Assets Section */}
                        <Card sx={{ 
                            borderRadius: 4,
                            overflow: 'hidden',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                            border: '1px solid',
                            borderColor: alpha(theme.palette.primary.main, 0.1)
                        }}>
                            <Box sx={{ p: 4, bgcolor: 'white' }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
                                    Global Marketing Assets
                                    <Chip 
                                        label={`${globalAssets.length} assets`} 
                                        size="small" 
                                        sx={{ ml: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), fontWeight: 600 }}
                                    />
                                </Typography>

                                {/* Add Global Asset */}
                                <Card sx={{ 
                                    p: 3, 
                                    mb: 4, 
                                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                                    border: '2px dashed',
                                    borderColor: alpha(theme.palette.primary.main, 0.2),
                                    borderRadius: 3
                                }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                                        Add New Global Asset
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={8}>
                                            <TextField 
                                                fullWidth 
                                                placeholder="Enter asset name" 
                                                value={additionalAsset.name} 
                                                onChange={(e) => setAdditionalAsset({...additionalAsset, name: e.target.value})}
                                                sx={{ bgcolor: 'white', borderRadius: 2 }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Button 
                                                component="label" 
                                                variant="contained" 
                                                disabled={!additionalAsset.name}
                                                sx={{ 
                                                    borderRadius: 2,
                                                    color: 'white !important',
                                                    px: 4,
                                                    py: 1.2,
                                                    background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%) !important',
                                                    '&.Mui-disabled': {
                                                        background: '#cbd5e1 !important',
                                                        color: '#64748b !important'
                                                    },
                                                    '&:hover': {
                                                        background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%) !important',
                                                    }
                                                }}
                                                startIcon={<UploadIcon />}
                                            >
                                                Upload File
                                                <input type="file" hidden onChange={(e) => handleUpload('global', e.target.files[0], additionalAsset.name)} />
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Card>

                                {/* Assets Grid */}
                                <Grid container spacing={3}>
                                    {globalAssets.map((asset, index) => (
                                        <Grid item xs={12} sm={6} md={4} lg={3} key={asset._id}>
                                            <Zoom in={true} style={{ transitionDelay: `${index * 50}ms` }}>
                                                <Card sx={{ 
                                                    p: 2,
                                                    borderRadius: 3,
                                                    border: '1px solid',
                                                    borderColor: alpha(theme.palette.primary.main, 0.1),
                                                    transition: 'all 0.3s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-4px)',
                                                        boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                                                        borderColor: 'primary.main'
                                                    }
                                                }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                                        <Box sx={{ 
                                                            width: 40, 
                                                            height: 40, 
                                                            borderRadius: 2,
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <FileIcon sx={{ color: 'primary.main' }} />
                                                        </Box>
                                                        <Box>
                                                            <IconButton 
                                                                component="a" 
                                                                href={asset.link} 
                                                                target="_blank" 
                                                                size="small"
                                                                sx={{ color: 'primary.main' }}
                                                            >
                                                                <DownloadIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton 
                                                                onClick={() => handleDelete('global', asset._id)} 
                                                                size="small"
                                                                sx={{ color: 'error.main' }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    </Box>
                                                    
                                                    <Typography sx={{ fontWeight: 700, mb: 1 }} noWrap>
                                                        {asset.name}
                                                    </Typography>
                                                    
                                                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                                        Added by <strong>{asset.updatedBy}</strong>
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {new Date(asset.updatedAt).toLocaleDateString()}
                                                    </Typography>
                                                </Card>
                                            </Zoom>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        </Card>
                    </MotionBox>
                ) : (
                    <MotionBox
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Employees by Company */}
                        {Object.keys(filteredCompanies).map((company, companyIndex) => (
                            <Card key={company} sx={{ 
                                mb: 4,
                                borderRadius: 4,
                                overflow: 'hidden',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.primary.main, 0.1)
                            }}>
                                <Box sx={{ 
                                    p: 3, 
                                    bgcolor: 'white',
                                    borderBottom: '1px solid',
                                    borderColor: alpha(theme.palette.primary.main, 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2
                                }}>
                                    <Avatar sx={{ 
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main',
                                        width: 48,
                                        height: 48
                                    }}>
                                        <BusinessIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                            {company}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            {filteredCompanies[company].length} team members
                                        </Typography>
                                    </Box>
                                </Box>
                                
                                <Box sx={{ p: 3, bgcolor: '#fafbfc' }}>
                                    <Grid container spacing={2}>
                                        {filteredCompanies[company].map((emp, index) => (
                                            <Grid item xs={12} sm={6} md={4} lg={3} key={emp._id}>
                                                <Fade in={true} style={{ transitionDelay: `${index * 50}ms` }}>
                                                    <Card 
                                                        sx={{ 
                                                            p: 2,
                                                            cursor: 'pointer',
                                                            borderRadius: 3,
                                                            border: '1px solid',
                                                            borderColor: alpha(theme.palette.primary.main, 0.1),
                                                            transition: 'all 0.3s ease',
                                                            '&:hover': {
                                                                transform: 'translateY(-4px)',
                                                                boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                                                                borderColor: 'primary.main',
                                                                bgcolor: 'white',
                                                                '& .employee-name': {
                                                                    color: 'primary.main'
                                                                },
                                                                '& .employee-avatar': {
                                                                    borderColor: 'primary.main'
                                                                }
                                                            }
                                                        }}
                                                        onClick={() => handleEmployeeClick(emp)}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            <Badge
                                                                overlap="circular"
                                                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                                badgeContent={
                                                                    emp.employee_photo ? 
                                                                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} /> : 
                                                                    null
                                                                }
                                                            >
                                                                <Avatar 
                                                                    src={emp.employee_photo} 
                                                                    className="employee-avatar"
                                                                    sx={{ 
                                                                        width: 56, 
                                                                        height: 56,
                                                                        border: '2px solid',
                                                                        borderColor: 'transparent',
                                                                        transition: 'all 0.3s ease'
                                                                    }}
                                                                >
                                                                    {emp.first_name[0]}{emp.last_name[0]}
                                                                </Avatar>
                                                            </Badge>
                                                            <Box sx={{ flex: 1 }}>
                                                                <Typography 
                                                                    className="employee-name"
                                                                    sx={{ 
                                                                        fontWeight: 700, 
                                                                        fontSize: '1rem',
                                                                        color: 'text.primary',
                                                                        transition: 'color 0.3s ease'
                                                                    }}>
                                                                    {emp.first_name} {emp.last_name}
                                                                </Typography>
                                                                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500 }}>
                                                                    {emp.designation || 'No designation'}
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                                                                    {emp.email_signature && (
                                                                        <Tooltip title="Has email signature">
                                                                            <EmailIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                                                        </Tooltip>
                                                                    )}
                                                                    {emp.marketing_assets?.length > 0 && (
                                                                        <Tooltip title={`${emp.marketing_assets.length} assets`}>
                                                                            <FileIcon sx={{ fontSize: 14, color: 'info.main' }} />
                                                                        </Tooltip>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                    </Card>
                                                </Fade>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            </Card>
                        ))}

                        {Object.keys(filteredCompanies).length === 0 && (
                            <Card sx={{ 
                                p: 8, 
                                textAlign: 'center',
                                borderRadius: 4,
                                bgcolor: 'white'
                            }}>
                                <SearchIcon sx={{ fontSize: 60, color: alpha(theme.palette.primary.main, 0.3), mb: 2 }} />
                                <Typography variant="h6" color="textSecondary">No employees found</Typography>
                                <Typography variant="body2" color="textSecondary">Try adjusting your search</Typography>
                            </Card>
                        )}
                    </MotionBox>
                )}
            </Box>

            {/* Employee Management Dialog */}
            <Dialog 
                open={dialogOpen} 
                onClose={() => setDialogOpen(false)} 
                maxWidth="md" 
                fullWidth
                TransitionComponent={Fade}
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
                    }
                }}
            >
                {selectedEmployee && (
                    <>
                        <DialogTitle sx={{ 
                            p: 3, 
                            bgcolor: 'white',
                            borderBottom: '1px solid',
                            borderColor: alpha(theme.palette.primary.main, 0.1)
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar 
                                        src={selectedEmployee.employee_photo}
                                        sx={{ width: 64, height: 64, border: '2px solid', borderColor: 'primary.main' }}
                                    >
                                        {selectedEmployee.first_name[0]}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h5" sx={{ fontWeight: 800 }}>
                                            {selectedEmployee.first_name} {selectedEmployee.last_name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="body2" color="textSecondary">
                                                {selectedEmployee.company}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                                <IconButton onClick={() => setDialogOpen(false)} sx={{ color: 'text.secondary' }}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                        </DialogTitle>
                        
                        <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                
                                {/* Profile Picture Section */}
                                <Card sx={{ p: 3, borderRadius: 3 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ImageIcon sx={{ color: 'primary.main' }} />
                                        Profile Picture
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                                        {selectedEmployee.employee_photo ? (
                                            <Box sx={{ position: 'relative' }}>
                                                <Avatar 
                                                    src={selectedEmployee.employee_photo} 
                                                    sx={{ width: 100, height: 100, border: '2px solid', borderColor: 'primary.main' }}
                                                />
                                                <IconButton 
                                                    size="small" 
                                                    sx={{ 
                                                        position: 'absolute', 
                                                        top: -8, 
                                                        right: -8, 
                                                        bgcolor: 'white',
                                                        boxShadow: 2,
                                                        '&:hover': { bgcolor: 'error.main', color: 'white' }
                                                    }}
                                                    onClick={() => handleDelete('photo')}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        ) : (
                                            <Box sx={{ 
                                                width: 100, 
                                                height: 100, 
                                                borderRadius: 2,
                                                border: '2px dashed',
                                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: alpha(theme.palette.primary.main, 0.02)
                                            }}>
                                                <PhotoIcon sx={{ fontSize: 40, color: alpha(theme.palette.primary.main, 0.3) }} />
                                            </Box>
                                        )}
                                        
                                        <Box sx={{ flex: 1 }}>
                                            <Button
                                                component="label"
                                                variant="contained"
                                                startIcon={<UploadIcon />}
                                                sx={{ 
                                                    borderRadius: 2,
                                                    color: 'white !important',
                                                    px: 3,
                                                    background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%) !important',
                                                    mb: 1
                                                }}
                                            >
                                                {selectedEmployee.employee_photo ? 'Change Photo' : 'Upload Photo'}
                                                <input type="file" hidden accept="image/*" onChange={(e) => handleUpload('photo', e.target.files[0])} />
                                            </Button>
                                            
                                            {selectedEmployee.employee_photo_updatedBy && (
                                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                                    Last updated by <strong>{selectedEmployee.employee_photo_updatedBy}</strong> on {new Date(selectedEmployee.employee_photo_updatedAt).toLocaleDateString()}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </Card>

                                {/* Email Signature Section */}
                                <Card sx={{ p: 3, borderRadius: 3 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <EmailIcon sx={{ color: 'primary.main' }} />
                                        Email Signature
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                        {selectedEmployee.email_signature ? (
                                            <>
                                                <Button
                                                    component="a"
                                                    href={selectedEmployee.email_signature}
                                                    target="_blank"
                                                    variant="outlined"
                                                    startIcon={<DownloadIcon />}
                                                    sx={{ borderRadius: 2 }}
                                                >
                                                    View Signature
                                                </Button>
                                                <IconButton 
                                                    onClick={() => handleDelete('signature')}
                                                    sx={{ color: 'error.main' }}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </>
                                        ) : (
                                            <Button
                                                component="label"
                                                variant="outlined"
                                                startIcon={<UploadIcon />}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                Upload Signature
                                                <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => handleUpload('signature', e.target.files[0])} />
                                            </Button>
                                        )}
                                        
                                        {selectedEmployee.email_signature_updatedBy && (
                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                By <strong>{selectedEmployee.email_signature_updatedBy}</strong> on {new Date(selectedEmployee.email_signature_updatedAt).toLocaleDateString()}
                                            </Typography>
                                        )}
                                    </Box>
                                </Card>

                                {/* Marketing Assets Section */}
                                <Card sx={{ p: 3, borderRadius: 3 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <FileIcon sx={{ color: 'primary.main' }} />
                                        Marketing Assets & Variables
                                    </Typography>
                                    
                                    {selectedEmployee.marketing_assets?.length > 0 && (
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Current Assets:</Typography>
                                            <Grid container spacing={2}>
                                                {selectedEmployee.marketing_assets.map((asset) => (
                                                    <Grid item xs={12} sm={6} key={asset._id}>
                                                        <Card sx={{ 
                                                            p: 1.5, 
                                                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                                                            borderRadius: 2,
                                                            border: '1px solid',
                                                            borderColor: alpha(theme.palette.primary.main, 0.1),
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}>
                                                            <Box>
                                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{asset.name}</Typography>
                                                                <Typography variant="caption" color="textSecondary">
                                                                    By {asset.updatedBy}
                                                                </Typography>
                                                            </Box>
                                                            <Box>
                                                                <Tooltip title="Copy Link">
                                                                    <IconButton 
                                                                        size="small" 
                                                                        onClick={() => { navigator.clipboard.writeText(asset.link); message.success("Link copied!"); }}
                                                                        sx={{ color: 'primary.main' }}
                                                                    >
                                                                        <LinkIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <IconButton 
                                                                    size="small" 
                                                                    onClick={() => handleDelete('variable', asset._id)}
                                                                    sx={{ color: 'error.main' }}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                        </Card>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Box>
                                    )}

                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>Add New Asset:</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={8}>
                                            <TextField 
                                                fullWidth
                                                size="small"
                                                placeholder="Asset name"
                                                value={additionalAsset.name}
                                                onChange={(e) => setAdditionalAsset({ ...additionalAsset, name: e.target.value })}
                                                sx={{ bgcolor: 'white', borderRadius: 2 }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Button 
                                                component="label" 
                                                variant="contained" 
                                                disabled={!additionalAsset.name}
                                                startIcon={<UploadIcon />}
                                                sx={{ 
                                                    borderRadius: 2,
                                                    color: 'white !important',
                                                    px: 3,
                                                    background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%) !important',
                                                    mb: 1
                                                }}
                                            >
                                                Upload File
                                                <input 
                                                    type="file" 
                                                    hidden 
                                                    onChange={(e) => handleUpload('variable', e.target.files[0], additionalAsset.name)} 
                                                />
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Card>
                            </Box>
                        </DialogContent>
                        
                        <DialogActions sx={{ p: 3, bgcolor: 'white', borderTop: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.1) }}>
                            <Button 
                                onClick={() => setDialogOpen(false)}
                                variant="outlined"
                                sx={{ borderRadius: 2 }}
                            >
                                Close
                            </Button>
                        </DialogActions>
                    </>
                )}
                
                {uploading && (
                    <Box sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0, 
                        bgcolor: alpha('#fff', 0.9),
                        zIndex: 10, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <CircularProgress size={60} thickness={4} sx={{ color: 'primary.main', mb: 2 }} />
                            <Typography>Uploading...</Typography>
                        </Box>
                    </Box>
                )}
            </Dialog>
        </Box>
    );
};

export default UpdateEmployeeData;
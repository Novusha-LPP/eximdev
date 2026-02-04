import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import { fetchUserOpenPoints } from "../../services/openPointsService";
import "./userProfile.css";
import { Avatar, Tabs, Tab, CircularProgress, Snackbar, Alert, Button, Menu, MenuItem } from "@mui/material";
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonIcon from '@mui/icons-material/Person';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WorkIcon from '@mui/icons-material/Work';


const UserProfile = ({ username: propUsername }) => {
    const { username: paramUsername } = useParams();
    const { user: loggedInUser, setUser } = useContext(UserContext);
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [openPointsCount, setOpenPointsCount] = useState(0);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const openMenu = Boolean(anchorEl);

    // Date formatter helper
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Return original if invalid
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const targetUsername = propUsername || paramUsername || loggedInUser?.username;
    const isOwnProfile = targetUsername === loggedInUser?.username;

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-user-data/${targetUsername}`);
                setProfileData(res.data);
            } catch (err) {
                console.error("Failed to fetch user data", err);
            } finally {
                setLoading(false);
            }
        };
        if (targetUsername) fetchUserData();
    }, [targetUsername]);

    // Fetch open points data for analytics
    const [openPointsData, setOpenPointsData] = useState([]);
    useEffect(() => {
        const fetchOpenPointsData = async () => {
            try {
                const response = await fetchUserOpenPoints(targetUsername);
                // API returns { points, userInfo } - extract points array
                const points = response.points || [];
                setOpenPointsData(points);
                // Count non-green (active) points
                const activePoints = points.filter(p => p.status !== 'Green');
                setOpenPointsCount(activePoints.length);
            } catch (err) {
                console.error("Failed to fetch open points data", err);
            }
        };
        if (targetUsername) fetchOpenPointsData();
    }, [targetUsername]);

    // Calculate analytics from open points data
    const getOpenPointsAnalytics = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter points for this month (based on created_at or target_date)
        const thisMonthPoints = openPointsData.filter(p => {
            const targetDate = p.target_date ? new Date(p.target_date) : null;
            return targetDate && targetDate.getMonth() === currentMonth && targetDate.getFullYear() === currentYear;
        });

        // Status breakdowns
        const total = openPointsData.length;
        const completed = openPointsData.filter(p => p.status === 'Green').length;
        const pending = openPointsData.filter(p => p.status === 'Red').length;
        const inProgress = openPointsData.filter(p => p.status === 'Yellow').length;
        const changeRequested = openPointsData.filter(p => p.status === 'Orange').length;

        // This month stats
        const thisMonthTotal = thisMonthPoints.length;
        const thisMonthCompleted = thisMonthPoints.filter(p => p.status === 'Green').length;
        const thisMonthPending = thisMonthPoints.filter(p => p.status !== 'Green').length;

        // Overdue points (target_date < today and not Green)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdue = openPointsData.filter(p => {
            if (p.status === 'Green') return false;
            const targetDate = p.target_date ? new Date(p.target_date) : null;
            return targetDate && targetDate < today;
        }).length;

        // Upcoming (next 7 days)
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const upcoming = openPointsData.filter(p => {
            if (p.status === 'Green') return false;
            const targetDate = p.target_date ? new Date(p.target_date) : null;
            return targetDate && targetDate >= today && targetDate <= nextWeek;
        }).length;

        return {
            total,
            completed,
            pending,
            inProgress,
            changeRequested,
            thisMonthTotal,
            thisMonthCompleted,
            thisMonthPending,
            overdue,
            upcoming,
            activePoints: total - completed
        };
    };


    const handlePhotoClick = (event) => {
        if (isOwnProfile) {
            setAnchorEl(event.currentTarget);
        }
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleSelectUpload = () => {
        handleMenuClose();
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleRemovePhoto = async () => {
        handleMenuClose();
        if (!window.confirm("Are you sure you want to remove your profile photo?")) return;

        setUploading(true);
        try {
            await axios.put(`${process.env.REACT_APP_API_STRING}/update-profile-photo`, {
                username: targetUsername,
                employee_photo: "" // Send empty string to remove
            });

            setProfileData(prev => ({ ...prev, employee_photo: "" }));

            if (isOwnProfile) {
                const updatedUser = { ...loggedInUser, employee_photo: "" };
                localStorage.setItem("exim_user", JSON.stringify(updatedUser));
                setUser(updatedUser);
            }

            setSnackbar({ open: true, message: 'Profile photo removed successfully!', severity: 'success' });
        } catch (error) {
            console.error("Error removing photo:", error);
            setSnackbar({ open: true, message: 'Failed to remove photo.', severity: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handlePhotoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setSnackbar({ open: true, message: 'Please upload a valid image (JPEG, PNG, or WebP)', severity: 'error' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setSnackbar({ open: true, message: 'Image size should be less than 5MB', severity: 'error' });
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('files', file);
            formData.append('bucketPath', 'profile-photos');

            const uploadRes = await axios.post(`${process.env.REACT_APP_API_STRING}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            const photoUrl = uploadRes.data.urls[0];

            await axios.put(`${process.env.REACT_APP_API_STRING}/update-profile-photo`, {
                username: targetUsername,
                employee_photo: photoUrl
            });

            setProfileData(prev => ({ ...prev, employee_photo: photoUrl }));

            if (isOwnProfile) {
                const updatedUser = { ...loggedInUser, employee_photo: photoUrl };
                localStorage.setItem("exim_user", JSON.stringify(updatedUser));
                setUser(updatedUser);
            }

            setSnackbar({ open: true, message: 'Profile photo updated successfully!', severity: 'success' });
        } catch (error) {
            console.error("Error uploading photo:", error);
            setSnackbar({ open: true, message: 'Failed to upload photo. Please try again.', severity: 'error' });
        } finally {
            setUploading(false);
        }
    };

    if (loading) return (
        <div className="profile-loader">
            <CircularProgress size={40} sx={{ color: '#1a73e8' }} />
        </div>
    );

    if (!profileData) return (
        <div className="profile-error-state">
            <ErrorOutlineIcon className="error-icon" />
            <h2>User Not Found</h2>
        </div>
    );

    const fullName = [profileData.first_name, profileData.middle_name, profileData.last_name].filter(Boolean).join(' ');
    const initials = `${profileData.first_name?.[0] || ''}${profileData.last_name?.[0] || ''}`.toUpperCase();

    const documents = [
        { label: "Resume", url: profileData.resume },
        { label: "Aadhar Card", url: profileData.aadhar_photo_front },
        { label: "PAN Card", url: profileData.pan_photo },
        { label: "NDA", url: profileData.nda },
        { label: "Address Proof", url: profileData.address_proof }
    ];

    // Tab content components
    const OverviewTab = () => (
        <motion.div
            className="tab-content fade-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <div className="content-grid">
                {/* Left Column */}
                <div className="content-col">
                    {/* About / Personal Info */}
                    <div className="info-section">
                        <div className="section-header">Personal Information</div>
                        <div className="info-table">
                            <div className="info-row">
                                <span className="label">Full Name</span>
                                <span className="value strong">{fullName}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Company</span>
                                <span className="value">{profileData.company || 'N/A'}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Employment Type</span>
                                <span className="value">{profileData.employment_type || 'N/A'}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Date of Birth</span>
                                <span className="value">{formatDate(profileData.dob || profileData.date_of_birth)}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Blood Group</span>
                                <span className="value">{profileData.blood_group || 'N/A'}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Marital Status</span>
                                <span className="value">{profileData.marital_status || 'N/A'}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Qualification</span>
                                <span className="value">{profileData.highest_qualification || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="info-section">
                        <div className="section-header">Contact Information</div>
                        <div className="info-table">
                            <div className="info-row">
                                <span className="label">Mobile</span>
                                <span className="value">{profileData.mobile || 'N/A'}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Work Email</span>
                                <span className="value email">
                                    {profileData.official_email || profileData.email || 'N/A'}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="label">Personal Email</span>
                                <span className="value email">
                                    {profileData.personal_email || 'N/A'}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="label">Emergency</span>
                                <span className="value">
                                    {profileData.emergency_contact
                                        ? `${profileData.emergency_contact} (${profileData.emergency_contact_name})`
                                        : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Addresses */}
                    <div className="info-section">
                        <div className="section-header">Addresses</div>
                        <div className="address-container">
                            <div className="address-box">
                                <div className="addr-label">Current Address</div>
                                <div className="addr-text">
                                    {profileData.communication_address_line_1 || profileData.communication_address_line_2 ? (
                                        <>
                                            {[profileData.communication_address_line_1, profileData.communication_address_line_2].filter(Boolean).join(', ')}<br />
                                            {[profileData.communication_address_city, profileData.communication_address_state].filter(Boolean).join(', ')}
                                            {profileData.communication_address_pincode && ` - ${profileData.communication_address_pincode}`}
                                        </>
                                    ) : 'No address provided'}
                                </div>
                            </div>
                            <div className="address-box">
                                <div className="addr-label">Permanent Address</div>
                                <div className="addr-text">
                                    {profileData.permanent_address_line_1 || profileData.permanent_address_line_2 ? (
                                        <>
                                            {[profileData.permanent_address_line_1, profileData.permanent_address_line_2].filter(Boolean).join(', ')}<br />
                                            {[profileData.permanent_address_city, profileData.permanent_address_state].filter(Boolean).join(', ')}
                                            {profileData.permanent_address_pincode && ` - ${profileData.permanent_address_pincode}`}
                                        </>
                                    ) : 'No address provided'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="content-col">
                    {/* Documents */}
                    <div className="info-section">
                        <div className="section-header">Documents</div>
                        <div className="documents-list">
                            {documents.map((doc, index) => (
                                <div key={index} className="document-item">
                                    <div className="doc-icon-wrapper">
                                        {doc.url
                                            ? <CheckCircleIcon className="status-icon success" />
                                            : <ErrorOutlineIcon className="status-icon missing" />
                                        }
                                    </div>
                                    <div className="doc-meta">
                                        <div className="doc-name">{doc.label}</div>
                                        <div className={`doc-status ${doc.url ? 'uploaded' : 'pending'}`}>
                                            {doc.url ? 'Uploaded' : 'Missing'}
                                        </div>
                                    </div>
                                    {doc.url && (
                                        <a href={doc.url} target="_blank" rel="noreferrer" className="view-link">
                                            View
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bank & Employment IDs */}
                    <div className="info-section">
                        <div className="section-header">Bank & Employment Details</div>
                        <div className="info-table">
                            <div className="info-row">
                                <span className="label">Bank Name</span>
                                <span className="value">{profileData.bank_name || 'N/A'}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Account No.</span>
                                <span className="value">{profileData.bank_account_no || 'N/A'}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">IFSC Code</span>
                                <span className="value">{profileData.ifsc_code || 'N/A'}</span>
                            </div>
                            <div className="divider-row"></div>
                            <div className="info-row">
                                <span className="label">PAN No.</span>
                                <span className="value">{profileData.pan_no || 'N/A'}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Aadhar No.</span>
                                <span className="value">{profileData.aadhar_no || 'N/A'}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">PF No.</span>
                                <span className="value">{profileData.pf_no || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const ModulesTab = () => (
        <motion.div
            className="tab-content fade-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="grid-layout">
                {profileData.modules && profileData.modules.length > 0 ? (
                    profileData.modules.map((mod, i) => (
                        <div key={i} className="grid-card module-card">
                            <div className="card-icon module"><ViewModuleIcon /></div>
                            <div className="card-name">{mod}</div>
                        </div>
                    ))
                ) : (
                    <div className="empty-message">No modules assigned</div>
                )}
            </div>
        </motion.div>
    );

    const ImportersTab = () => (
        <motion.div
            className="tab-content fade-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="grid-layout">
                {profileData.assigned_importer_name && profileData.assigned_importer_name.length > 0 ? (
                    profileData.assigned_importer_name.map((imp, i) => (
                        <div key={i} className="grid-card importer-card">
                            <div className="card-icon importer"><BusinessIcon /></div>
                            <div className="card-name">{imp}</div>
                        </div>
                    ))
                ) : (
                    <div className="empty-message">No importers assigned</div>
                )}
            </div>
        </motion.div>
    );

    const OpenPointsTab = () => {
        const analytics = getOpenPointsAnalytics();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const currentMonth = monthNames[new Date().getMonth()];

        return (
            <motion.div
                className="tab-content fade-in"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div style={{ padding: '20px' }}>
                    {/* Header Section */}
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '1.5rem', fontWeight: 700 }}>
                            Open Points Analytics
                        </h3>
                        <p style={{ color: '#64748b', margin: 0 }}>
                            {isOwnProfile ? 'Your performance overview' : `${targetUsername}'s performance overview`}
                        </p>
                    </div>

                    {/* Main Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        {/* Total Points */}
                        <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{analytics.total}</div>
                            <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Total Points</div>
                        </div>
                        {/* Completed */}
                        <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>{analytics.completed}</div>
                            <div style={{ color: '#15803d', fontSize: '0.85rem', fontWeight: 600 }}>✅ Completed</div>
                        </div>
                        {/* Active/Pending */}
                        <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #fecaca' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>{analytics.activePoints}</div>
                            <div style={{ color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>🔴 Active</div>
                        </div>
                        {/* Overdue */}
                        <div style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #fed7aa' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ea580c' }}>{analytics.overdue}</div>
                            <div style={{ color: '#c2410c', fontSize: '0.85rem', fontWeight: 600 }}>⚠️ Overdue</div>
                        </div>
                    </div>

                    {/* This Month Section */}
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '1.1rem', fontWeight: 600 }}>
                            📅 {currentMonth} {new Date().getFullYear()} - This Month
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3b82f6' }}>{analytics.thisMonthTotal}</div>
                                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Total This Month</div>
                            </div>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#16a34a' }}>{analytics.thisMonthCompleted}</div>
                                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Completed</div>
                            </div>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#dc2626' }}>{analytics.thisMonthPending}</div>
                                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Pending</div>
                            </div>
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '1.1rem', fontWeight: 600 }}>
                            📊 Status Breakdown
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '12px', borderRadius: '8px', border: '2px solid #ef4444' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{analytics.pending}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Red (Pending)</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '12px', borderRadius: '8px', border: '2px solid #eab308' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#eab308' }}></div>
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{analytics.inProgress}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Yellow (In Progress)</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '12px', borderRadius: '8px', border: '2px solid #f97316' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f97316' }}></div>
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{analytics.changeRequested}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Orange (Change Req)</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '12px', borderRadius: '8px', border: '2px solid #22c55e' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }}></div>
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{analytics.completed}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Green (Closed)</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Deadlines */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>{analytics.upcoming}</div>
                            <div style={{ color: '#1d4ed8', fontSize: '0.9rem', fontWeight: 600 }}>📆 Due in Next 7 Days</div>
                        </div>
                        <div style={{ background: analytics.overdue > 0 ? 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '20px', borderRadius: '12px', border: analytics.overdue > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: analytics.overdue > 0 ? '#dc2626' : '#16a34a' }}>{analytics.overdue}</div>
                            <div style={{ color: analytics.overdue > 0 ? '#b91c1c' : '#15803d', fontSize: '0.9rem', fontWeight: 600 }}>
                                {analytics.overdue > 0 ? '⚠️ Overdue Tasks' : '✅ No Overdue Tasks'}
                            </div>
                        </div>
                    </div>

                    {/* View All Button */}
                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={() => navigate(`/open-points/user/${targetUsername}`)}
                            style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '14px 32px',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            }}
                        >
                            📋 View All Open Points
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="user-profile-container">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
            />

            {/* Clean Header Section */}
            <div className="profile-header-clean">
                <div className="header-left">
                    <div
                        className={`avatar-wrapper ${isOwnProfile ? 'clickable' : ''}`}
                        onClick={handlePhotoClick}
                    >
                        <Avatar
                            src={profileData.employee_photo}
                            sx={{ width: 80, height: 80, fontSize: '2rem' }}
                            className="main-avatar"
                        >
                            {initials}
                        </Avatar>
                        {isOwnProfile && (
                            <div className="upload-overlay">
                                {uploading ? <CircularProgress size={20} color="inherit" /> : <CameraAltIcon fontSize="small" />}
                            </div>
                        )}
                    </div>
                    <Menu
                        anchorEl={anchorEl}
                        open={openMenu}
                        onClose={handleMenuClose}
                    >
                        <MenuItem onClick={handleSelectUpload}>Upload Photo</MenuItem>
                        <MenuItem onClick={handleRemovePhoto}>Remove Photo</MenuItem>
                    </Menu>
                    <div className="header-text">
                        <h1>{fullName}</h1>
                        <div className="sub-text">
                            <span className="designation">{profileData.designation || 'No Designation'}</span>
                            {profileData.department && (
                                <>
                                    <span className="dot">•</span>
                                    <span className="department">{profileData.department}</span>
                                </>
                            )}
                        </div>
                        <div className="header-badges">
                            <span className="badge role">{profileData.role || 'User'}</span>
                            <span className="badge emp-id">ID: {profileData.username}</span>
                        </div>
                    </div>
                </div>
                <div className="header-right">
                    <div className="contact-quick">
                        <div className="cq-item">
                            <EmailIcon fontSize="small" />
                            <span>{profileData.official_email || profileData.email || 'No Email'}</span>
                        </div>
                        <div className="cq-item">
                            <PhoneIcon fontSize="small" />
                            <span>{profileData.mobile || 'No Mobile'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="profile-tabs-wrapper">
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    className="custom-tabs"
                    textColor="primary"
                    indicatorColor="primary"
                >
                    <Tab label="Overview" />
                    <Tab label={`Modules (${profileData.modules?.length || 0})`} />
                    <Tab label={`Importers (${profileData.assigned_importer_name?.length || 0})`} />
                    <Tab label={`Open Points (${openPointsCount})`} />
                </Tabs>
            </div>

            {/* Main Content Area */}
            <div className="profile-body">
                <AnimatePresence mode="wait">
                    {activeTab === 0 && <OverviewTab key="overview" />}
                    {activeTab === 1 && <ModulesTab key="modules" />}
                    {activeTab === 2 && <ImportersTab key="importers" />}
                    {activeTab === 3 && <OpenPointsTab key="openpoints" />}
                </AnimatePresence>
            </div>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default UserProfile;

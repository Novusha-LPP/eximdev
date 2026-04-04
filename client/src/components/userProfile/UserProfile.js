import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import { fetchUserOpenPoints } from "../../services/openPointsService";
import attendanceAPI from "../../api/attendance/attendance.api";
import leaveAPI from "../../api/attendance/leave.api";
import "./userProfile.css";
import { Avatar, Tabs, Tab, CircularProgress, Snackbar, Alert, Button, Menu, MenuItem, IconButton, Tooltip, Typography, Chip } from "@mui/material";
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedIcon from '@mui/icons-material/Verified';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonIcon from '@mui/icons-material/Person';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WorkIcon from '@mui/icons-material/Work';
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileUpload from "../gallery/FileUpload";
import kpiPioneerBadge from "../../assets/images/kpi-pioneer-badge.png";
import { FiLogIn, FiLogOut } from 'react-icons/fi';
import Attendance from '../attendance/Attendance';



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
    const [globalAssets, setGlobalAssets] = useState([]);

    // Attendance state
    const [attendanceData, setAttendanceData] = useState(null);
    const [leaveApplications, setLeaveApplications] = useState([]);
    const [leaveBalance, setLeaveBalance] = useState([]);
    const [punchLoading, setPunchLoading] = useState(false);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
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

    useEffect(() => {
        const fetchGlobalAssets = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_STRING}/hr/global-assets`, { withCredentials: true });
                setGlobalAssets(res.data);
            } catch (err) {
                console.error("Failed to fetch global assets", err);
            }
        };
        fetchGlobalAssets();
    }, []);

    const fetchAttendanceData = useCallback(async () => {
        const canViewAttendance = isOwnProfile || loggedInUser?.role === 'Admin' || loggedInUser?.role === 'Head_of_Department';
        if (!canViewAttendance || !profileData?._id) return;

        setAttendanceLoading(true);
        try {
            const queryParams = !isOwnProfile ? { employee_id: profileData._id } : {};
            const [dashData, leaveBalData, leaveApps] = await Promise.all([
                attendanceAPI.getDashboardData(queryParams).catch(() => null),
                leaveAPI.getBalance(profileData._id).catch(() => ({ balances: [] })),
                leaveAPI.getApplications({ employee_id: profileData._id, limit: 10 }).catch(() => ({ applications: [] }))
            ]);
            setAttendanceData(dashData);
            setLeaveBalance(leaveBalData?.balances || []);
            setLeaveApplications(leaveApps?.applications || []);
        } catch (err) {
            console.error('Failed to fetch attendance data', err);
        } finally {
            setAttendanceLoading(false);
        }
    }, [isOwnProfile, loggedInUser?.role, profileData?._id]);

    useEffect(() => {
        fetchAttendanceData();
    }, [fetchAttendanceData]);


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

    // Handle document upload (generic for both Onboarding and KYC)
    const handleDocumentUpload = async (fileUrls, field, type) => {
        if (!fileUrls || fileUrls.length === 0) return;
        const fileUrl = fileUrls[0];

        setUploading(true);
        try {
            const endpoint = type === 'kyc' 
                ? `${process.env.REACT_APP_API_STRING}/complete-kyc`
                : `${process.env.REACT_APP_API_STRING}/complete-onboarding`;

            await axios.post(endpoint, {
                username: targetUsername,
                [field]: fileUrl
            });

            // Update local state
            setProfileData(prev => ({ ...prev, [field]: fileUrl }));
            setSnackbar({ open: true, message: 'Document updated successfully!', severity: 'success' });
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            setSnackbar({ open: true, message: 'Failed to update document.', severity: 'error' });
        } finally {
            setUploading(false);
        }
    };

    // Handle document delete
    const handleDocumentDelete = async (field, type) => {
        const fileUrl = profileData[field];
        if (!fileUrl) return;

        if (!window.confirm("Are you sure you want to delete this document?")) return;

        setUploading(true);
        try {
            // 1. Delete from S3
            const key = new URL(fileUrl).pathname.slice(1);
            await axios.post(`${process.env.REACT_APP_API_STRING}/delete-s3-file`, { key });

            // 2. Clear field in DB
            const endpoint = type === 'kyc' 
                ? `${process.env.REACT_APP_API_STRING}/complete-kyc`
                : `${process.env.REACT_APP_API_STRING}/complete-onboarding`;

            await axios.post(endpoint, {
                username: targetUsername,
                [field]: ""
            });

            // Update local state
            setProfileData(prev => ({ ...prev, [field]: "" }));
            setSnackbar({ open: true, message: 'Document deleted successfully!', severity: 'success' });
        } catch (error) {
            console.error(`Error deleting ${field}:`, error);
            setSnackbar({ open: true, message: 'Failed to delete document.', severity: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleProofUpload = async (event, assetType) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('assetType', assetType);

            const res = await axios.post(`${process.env.REACT_APP_API_STRING}/user/marketing-proof-upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });

            const proofField = `${assetType}_proof`;
            setProfileData(prev => ({ 
                ...prev, 
                [proofField]: res.data.user[proofField]
            }));
            
            setSnackbar({ open: true, message: `${assetType.replace('_', ' ')} proof uploaded successfully!`, severity: 'success' });
        } catch (error) {
            console.error("Error uploading proof:", error);
            setSnackbar({ open: true, message: 'Failed to upload proof.', severity: 'error' });
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
        { label: "Resume", field: "resume", type: "onboarding", url: profileData.resume, accept: [".pdf", ".doc", ".docx"] },
        { label: "Aadhar Card", field: "aadhar_photo_front", type: "kyc", url: profileData.aadhar_photo_front, accept: ["image/*", ".pdf"] },
        { label: "PAN Card", field: "pan_photo", type: "kyc", url: profileData.pan_photo, accept: ["image/*", ".pdf"] },
        { label: "NDA", field: "nda", type: "onboarding", url: profileData.nda, accept: [".pdf"] },
        { label: "Address Proof", field: "address_proof", type: "onboarding", url: profileData.address_proof, accept: ["image/*", ".pdf"] }
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
                                <span className="label">Department</span>
                                <span className="value strong" style={{ color: '#1a73e8' }}>{profileData.department || 'N/A'}</span>
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
                                <div key={index} className="document-item" style={{ display: 'block' }}>
                                    <div className="hr-upload-item" style={{ margin: 0 }}>
                                        <span className="hr-upload-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>{doc.label}</span>
                                        <div className="hr-upload-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {(isOwnProfile || loggedInUser?.role === 'Admin') && (
                                                <FileUpload
                                                    label={doc.url ? "Replace" : "Upload"}
                                                    onFilesUploaded={(files) => handleDocumentUpload(files, doc.field, doc.type)}
                                                    bucketPath="kyc"
                                                    singleFileOnly={true}
                                                    acceptedFileTypes={doc.accept}
                                                    buttonSx={{ fontSize: '0.7rem', padding: '4px 16px', minWidth: 'auto', borderRadius: '4px' }}
                                                />
                                            )}
                                            
                                            {doc.url && (
                                                <div className="hr-upload-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="view-link">View</a>
                                                    {(isOwnProfile || loggedInUser?.role === 'Admin') && (
                                                        <IconButton 
                                                            size="small" 
                                                            color="error" 
                                                            onClick={() => handleDocumentDelete(doc.field, doc.type)}
                                                            title="Delete document"
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </div>
                                            )}
                                            {!doc.url && !isOwnProfile && loggedInUser?.role !== 'Admin' && (
                                                 <span style={{ fontSize: '0.75rem', color: '#999', fontStyle: 'italic' }}>Not uploaded</span>
                                            )}
                                        </div>
                                    </div>
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



    const handlePunch = async (type) => {
        setPunchLoading(true);
        try {
            const punchParams = { type, method: 'web' };
            if (!isOwnProfile) punchParams.employee_id = profileData._id;
            
            await attendanceAPI.punch(punchParams);
            setSnackbar({ open: true, message: `Punch ${type} recorded successfully!`, severity: 'success' });
            // Refresh data
            setTimeout(() => fetchAttendanceData(), 500);
        } catch (err) {
            setSnackbar({ open: true, message: err?.message || `Punch ${type} failed`, severity: 'error' });
        } finally {
            setPunchLoading(false);
        }
    };

    const AttendanceTab = () => {
        return (
            <motion.div className="tab-content fade-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Attendance employeeId={profileData?._id} />
            </motion.div>
        );
    };

    const MarketingAssetsTab = () => (
        <motion.div
            className="tab-content fade-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="info-section">
                <div className="section-header">Marketing Assets & Variables</div>
                <div className="info-table">
                    <div className="info-row">
                        <span className="label">Profile Photo</span>
                        <span className="value">
                            {profileData.employee_photo ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Avatar src={profileData.employee_photo} sx={{ width: 30, height: 30 }} />
                                    <Button size="small" component="a" href={profileData.employee_photo} target="_blank" endIcon={<OpenInNewIcon />}>View</Button>
                                </div>
                            ) : 'Not uploaded'}
                        </span>
                    </div>
                    {profileData.email_signature && (
                        <div className="info-row">
                            <span className="label">Email Signature</span>
                            <span className="value">
                                <a href={profileData.email_signature} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#1a73e8', fontWeight: 600 }}>
                                    <OpenInNewIcon fontSize="small" sx={{ fontSize: '0.9rem' }} /> View Signature
                                </a>
                            </span>
                        </div>
                    )}
                    
                    {/* User Specific Assets */}
                    {profileData.marketing_assets?.map((asset, i) => (
                        <div key={`personal-${i}`} className="info-row">
                            <span className="label">{asset.name}</span>
                            <span className="value">
                                <a href={asset.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#1a73e8', fontWeight: 600 }}>
                                    <OpenInNewIcon fontSize="small" sx={{ fontSize: '0.9rem' }} /> {asset.link.startsWith('http') ? 'View Asset' : asset.link}
                                </a>
                            </span>
                        </div>
                    ))}

                    {/* Global Shared Assets */}
                    {globalAssets.length > 0 && (
                        <>
                            <div className="section-subheader" style={{ padding: '15px 20px', background: '#f8fafc', fontWeight: 700, fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Global Shared Assets
                            </div>
                            {globalAssets.map((asset, i) => (
                                <div key={`global-${i}`} className="info-row">
                                    <span className="label">{asset.name}</span>
                                    <span className="value">
                                        <a href={asset.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#1a73e8', fontWeight: 600 }}>
                                            <OpenInNewIcon fontSize="small" sx={{ fontSize: '0.9rem' }} /> View Linked File
                                        </a>
                                    </span>
                                </div>
                            ))}
                        </>
                    )}

                    {!profileData.email_signature && profileData.marketing_assets?.length === 0 && globalAssets.length === 0 && (
                        <div className="empty-message" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No marketing assets or variables assigned to this profile.</div>
                    )}
                </div>
            </div>

            {/* Verification Section */}
            {(isOwnProfile || profileData.profile_photo_proof || profileData.email_signature_proof) && (
                <div className="info-section" style={{ marginTop: '24px' }}>
                    <div className="section-header">
                        Marketing Verification Status
                    </div>
                    
                    <div className="info-table" style={{ padding: '20px' }}>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                            To get a blue tick on your profile, please upload screenshots showing your updated profile photo and email signature. Both must be verified.
                        </Typography>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            {/* Profile Photo Verification */}
                            <div style={{ padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Profile Photo Status</Typography>
                                    {profileData.profile_photo_proof?.status && (
                                        <Chip 
                                            label={profileData.profile_photo_proof.status} 
                                            size="small"
                                            sx={{ 
                                                fontSize: '0.65rem',
                                                height: '20px',
                                                background: profileData.profile_photo_proof.status === 'Approved' ? '#dcfce7' : profileData.profile_photo_proof.status === 'Rejected' ? '#fef2f2' : '#fef9c3',
                                                color: profileData.profile_photo_proof.status === 'Approved' ? '#15803d' : profileData.profile_photo_proof.status === 'Rejected' ? '#b91c1c' : '#854d0e',
                                            }}
                                        />
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {profileData.profile_photo_proof?.url ? (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <Button size="small" component="a" href={profileData.profile_photo_proof.url} target="_blank" variant="outlined" startIcon={<OpenInNewIcon />}>View Proof</Button>
                                            {isOwnProfile && profileData.profile_photo_proof.status !== 'Approved' && (
                                                <Button size="small" component="label" variant="contained" startIcon={<CloudUploadIcon />} sx={{ background: '#1d9bf0' }}>
                                                    Update
                                                    <input type="file" hidden accept="image/*" onChange={(e) => handleProofUpload(e, 'profile_photo')} />
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        isOwnProfile && (
                                            <Button size="small" component="label" variant="contained" startIcon={<CloudUploadIcon />} sx={{ background: '#1d9bf0' }}>
                                                Upload Profile Proof
                                                <input type="file" hidden accept="image/*" onChange={(e) => handleProofUpload(e, 'profile_photo')} />
                                            </Button>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Email Signature Verification */}
                            <div style={{ padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Email Signature Status</Typography>
                                    {profileData.email_signature_proof?.status && (
                                        <Chip 
                                            label={profileData.email_signature_proof.status} 
                                            size="small"
                                            sx={{ 
                                                fontSize: '0.65rem',
                                                height: '20px',
                                                background: profileData.email_signature_proof.status === 'Approved' ? '#dcfce7' : profileData.email_signature_proof.status === 'Rejected' ? '#fef2f2' : '#fef9c3',
                                                color: profileData.email_signature_proof.status === 'Approved' ? '#15803d' : profileData.email_signature_proof.status === 'Rejected' ? '#b91c1c' : '#854d0e',
                                            }}
                                        />
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {profileData.email_signature_proof?.url ? (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <Button size="small" component="a" href={profileData.email_signature_proof.url} target="_blank" variant="outlined" startIcon={<OpenInNewIcon />}>View Proof</Button>
                                            {isOwnProfile && profileData.email_signature_proof.status !== 'Approved' && (
                                                <Button size="small" component="label" variant="contained" startIcon={<CloudUploadIcon />} sx={{ background: '#1d9bf0' }}>
                                                    Update
                                                    <input type="file" hidden accept="image/*" onChange={(e) => handleProofUpload(e, 'email_signature')} />
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        isOwnProfile && (
                                            <Button size="small" component="label" variant="contained" startIcon={<CloudUploadIcon />} sx={{ background: '#1d9bf0' }}>
                                                Upload Signature Proof
                                                <input type="file" hidden accept="image/*" onChange={(e) => handleProofUpload(e, 'email_signature')} />
                                            </Button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h1 style={{ margin: 0 }}>{fullName}</h1>
                                {profileData.is_verified && (
                                    <Tooltip title="Verified Profile">
                                        <VerifiedIcon sx={{ color: '#1d9bf0 !important', fontSize: '1.25rem' }} style={{ color: '#1d9bf0' }} />
                                    </Tooltip>
                                )}
                            </div>
                            {(isOwnProfile || loggedInUser?.role === 'Admin') && attendanceData?.punchStatus && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className={`profile-punch-btn ${attendanceData.punchStatus.status === 'Checked In' ? 'punch-out' : 'punch-in'}`}
                                        onClick={() => handlePunch(attendanceData.punchStatus.status === 'Checked In' ? 'OUT' : 'IN')}
                                        disabled={punchLoading}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            color: 'white',
                                            background: attendanceData.punchStatus.status === 'Checked In' ? '#ef4444' : '#22c55e',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {punchLoading ? <CircularProgress size={12} color="inherit" /> : (
                                            attendanceData.punchStatus.status === 'Checked In' ? <><FiLogOut size={12} /> Punch OUT</> : <><FiLogIn size={12} /> Punch IN</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
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
                            {(profileData.department === 'Export' || profileData.department === 'Exports') && (
                                <img src={kpiPioneerBadge} alt="KPI Pioneer" className="kpi-pioneer-img-badge" />
                            )}
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
                {(() => {
                    const canViewAttendance = isOwnProfile || loggedInUser?.role === 'Admin' || loggedInUser?.role === 'Head_of_Department' || loggedInUser?.role === 'HOD';
                    return (
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
                    {canViewAttendance && <Tab label="Attendance" />}
                    {(profileData.email_signature || (profileData.marketing_assets?.length > 0) || (globalAssets.length > 0)) && (
                        <Tab label="Marketing Assets" />
                    )}
                </Tabs>
                    );
                })()}
            </div>

            {/* Main Content Area */}
            <div className="profile-body">
                <AnimatePresence mode="wait">
                    {(() => {
                        const canViewAttendance = isOwnProfile || loggedInUser?.role === 'Admin' || loggedInUser?.role === 'Head_of_Department' || loggedInUser?.role === 'HOD';
                        const marketingIndex = canViewAttendance ? 5 : 4;
                        return (
                            <>
                                {activeTab === 0 && <OverviewTab key="overview" />}
                                {activeTab === 1 && <ModulesTab key="modules" />}
                                {activeTab === 2 && <ImportersTab key="importers" />}
                                {activeTab === 3 && <OpenPointsTab key="openpoints" />}
                                {activeTab === 4 && canViewAttendance && <AttendanceTab key="attendance" />}
                                {activeTab === marketingIndex && <MarketingAssetsTab key="marketing" />}
                            </>
                        );
                    })()}
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

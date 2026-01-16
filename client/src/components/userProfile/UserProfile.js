import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import "./userProfile.css";
import { Avatar, Tabs, Tab, CircularProgress, Snackbar, Alert, Button } from "@mui/material";
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
import AWS from "aws-sdk";

const UserProfile = ({ username: propUsername }) => {
    const { username: paramUsername } = useParams();
    const { user: loggedInUser, setUser } = useContext(UserContext);
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const fileInputRef = useRef(null);

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

    const handlePhotoClick = () => {
        if (isOwnProfile && fileInputRef.current) {
            fileInputRef.current.click();
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
            const S3 = new AWS.S3({
                accessKeyId: process.env.REACT_APP_ACCESS_KEY,
                secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
                region: "ap-south-1",
            });

            const filename = `profile-photos/${targetUsername}_${Date.now()}.${file.type.split('/')[1]}`;
            const params = {
                Bucket: "alvision-exim-images",
                Key: filename,
                Body: file,
                ContentType: file.type,
            };

            const uploadResult = await S3.upload(params).promise();
            const photoUrl = uploadResult.Location;

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
                                <span className="value">{profileData.dob || profileData.date_of_birth || 'N/A'}</span>
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
                </Tabs>
            </div>

            {/* Main Content Area */}
            <div className="profile-body">
                <AnimatePresence mode="wait">
                    {activeTab === 0 && <OverviewTab key="overview" />}
                    {activeTab === 1 && <ModulesTab key="modules" />}
                    {activeTab === 2 && <ImportersTab key="importers" />}
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

import React, { useContext, useEffect, useState } from "react";
import { Button, Box, CircularProgress, Snackbar } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSearchParams } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import ChargesGrid from "../ChargesGrid";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";

import { TextField } from "@mui/material";

function EditFreeDaysConf() {
    // CSS styles for upload containers
    const uploadContainerStyles = `
    .upload-container {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      background-color: #ffffff;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    
    .section-header {
      background-color: #f8fafc;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }

    .upload-content {
      padding: 20px;
    }
    
    .form-field {
      margin-bottom: 16px;
    }
    
    .field-label {
      display: block;
      margin-bottom: 6px;
      color: #4a5568;
      font-size: 14px;
      font-weight: 500;
    }
    
    .submit-section {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
    }
    
    .submit-btn {
      background: linear-gradient(135deg, #1d1e22ff 0%, #5e5b61ff 100%);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 300px;
    }
    
    .free-days-section {
      margin-bottom: 30px;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    }
    
    .free-days-header {
      font-size: 18px;
      font-weight: 600;
      color: #1d1e22;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #1976d2;
    }
  `;

    const { branch_code, trade_type, mode, job_no, year } = useParams();

    const [fileSnackbar, setFileSnackbar] = React.useState(false);
    const [snackbar, setSnackbar] = React.useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const location = useLocation();
    const [params] = useSearchParams();
    const jobId = params.get("jobId");
    const navigate = useNavigate();
    const { user } = useContext(UserContext);
    const [data, setData] = useState(null);

    // Handle back navigation
    const handleBackToList = () => {
        navigate("/import-do");
    };

    // Fetch data from API
    useEffect(() => {
        async function fetchData() {
            console.log("EditFreeDaysConf - Params:", { job_no, year, jobId });

            if (!jobId) {
                setError("Missing jobId parameter");
                setLoading(false);
                return;
            }

            if (!year || year === 'unknown') {
                setError("Missing or invalid year parameter. Please ensure the job has a year value.");
                setLoading(false);
                return;
            }

            if (!job_no) {
                setError("Missing job_no parameter");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                console.log("Fetching job data:", `${process.env.REACT_APP_API_STRING}/get-job/${branch_code}/${trade_type}/${mode}/${year}/${job_no}`);

                // Fetch job data
                const jobRes = await axios.get(
                    `${process.env.REACT_APP_API_STRING}/get-job/${branch_code}/${trade_type}/${mode}/${year}/${job_no}`
                );

                const jobData = {
                    ...jobRes.data,
                    do_shipping_line_invoice: jobRes.data.do_shipping_line_invoice || [],
                    insurance_copy: jobRes.data.insurance_copy || [],
                    other_do_documents: jobRes.data.other_do_documents || [],
                    security_deposit: jobRes.data.security_deposit || [],
                };

                setData(jobData);

                // Set formik values
                formik.setValues({
                    free_time: jobData.free_time || "",
                    shipping_line_airline: jobData.shipping_line_airline || "",
                    do_shipping_line_invoice:
                        jobData.do_shipping_line_invoice.length > 0
                            ? jobData.do_shipping_line_invoice
                            : [
                                {
                                    document_name: "Shipping Line Invoice",
                                    url: [],
                                    is_draft: false,
                                    is_final: false,
                                    document_check_date: "",
                                    document_check_status: false,
                                    payment_mode: "",
                                    wire_transfer_method: "",
                                    document_amount_details: "",
                                    cost_rate: "",
                                    payment_request_date: "",
                                    payment_made_date: "",
                                    is_tds: false,
                                    is_non_tds: false,
                                },
                            ],
                    insurance_copy:
                        jobData.insurance_copy.length > 0
                            ? jobData.insurance_copy
                            : [
                                {
                                    document_name: "Insurance",
                                    url: [],
                                    document_check_date: "",
                                    document_amount_details: "",
                                    cost_rate: "",
                                },
                            ],
                    other_do_documents: jobData.other_do_documents || [],
                    security_deposit: jobData.security_deposit || [],
                    do_copies: jobData.do_copies || [],
                });

                setLoading(false);
            } catch (error) {
                console.error("Error fetching data:", error);
                setError("Failed to load data. Please try again.");
                setLoading(false);
            }
        }

        fetchData();
    }, [jobId, year, job_no]);

    const formik = useFormik({
        initialValues: {
            free_time: "",
            shipping_line_airline: "",
            do_shipping_line_invoice: [
                {
                    document_name: "Shipping Line Invoice",
                    url: [],
                    is_draft: false,
                    is_final: false,
                    document_check_date: "",
                    document_check_status: false,
                    payment_mode: "",
                    wire_transfer_method: "",
                    document_amount_details: "",
                    cost_rate: "",
                    payment_request_date: "",
                    payment_made_date: "",
                    is_tds: false,
                    is_non_tds: false,
                },
            ],
            insurance_copy: [
                {
                    document_name: "Insurance",
                    url: [],
                    document_check_date: "",
                    document_amount_details: "",
                    cost_rate: "",
                },
            ],
            security_deposit: [],
            do_copies: [],
        },

        onSubmit: async (values) => {
            try {
                const submitData = {
                    ...values,
                    _id: jobId,
                    do_shipping_line_invoice: values.do_shipping_line_invoice.map(
                        (doc) => ({
                            ...doc,
                            payment_mode: Array.isArray(doc.payment_mode)
                                ? doc.payment_mode.join(",")
                                : doc.payment_mode,
                        })
                    ),
                    insurance_copy: values.insurance_copy,
                    other_do_documents: values.other_do_documents,
                    security_deposit: values.security_deposit,
                };

                // Get user info from localStorage for audit trail
                const username =
                    user?.username || localStorage.getItem("username") || "unknown";
                const userId =
                    user?.jobId || localStorage.getItem("userId") || "unknown";
                const userRole =
                    user?.role || localStorage.getItem("userRole") || "unknown";
                const headers = {
                    "Content-Type": "application/json",
                    "user-id": userId,
                    username: username,
                    "user-role": userRole,
                };

                await axios.patch(
                    `${process.env.REACT_APP_API_STRING}/update-free-days-config`,
                    submitData,
                    { headers }
                );

                setSnackbar(true);
            } catch (error) {
                console.error("Error updating free days config:", error);
                alert("Failed to update. Please try again.");
            }
            setTimeout(() => {
                window.close();
            }, 500);
        },
    });

    const handleDoCopiesUpload = (urls) => {
        formik.setFieldValue("do_copies", [...formik.values.do_copies, ...urls]);
    };

    const handleRemoveDoCopy = (index) => {
        const updatedCopies = [...formik.values.do_copies];
        updatedCopies.splice(index, 1);
        formik.setFieldValue("do_copies", updatedCopies);
    };

    if (!job_no || !year) {
        return (
            <div>
                <style>{uploadContainerStyles}</style>
                <Box sx={{ mb: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<ArrowBackIcon />}
                        onClick={handleBackToList}
                        sx={{
                            backgroundColor: "#1976d2",
                            color: "white",
                            "&:hover": {
                                backgroundColor: "#333",
                            },
                        }}
                    >
                        Back
                    </Button>
                </Box>
                <div>Error: Missing job_no or year parameters in URL</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div>
                <style>{uploadContainerStyles}</style>
                <div className="loading-container">
                    <CircularProgress />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <style>{uploadContainerStyles}</style>
                <Box sx={{ mb: 2 }}>
                    <Button
                        variant="contained"
                        onClick={handleBackToList}
                        sx={{
                            backgroundColor: "#1976d2",
                            color: "white",
                            "&:hover": {
                                backgroundColor: "#333",
                            },
                        }}
                    >
                        Back
                    </Button>
                </Box>
                <div>{error}</div>
            </div>
        );
    }

    return (
        <div>
            <style>{uploadContainerStyles}</style>

            {/* Back Button */}
            <Box sx={{ mb: 2 }}>
                <Button
                    variant="contained"
                    onClick={handleBackToList}
                    sx={{
                        backgroundColor: "#1976d2",
                        color: "white",
                        "&:hover": {
                            backgroundColor: "#333",
                        },
                    }}
                >
                    Back to Free Days Config
                </Button>
            </Box>

            {/* Static Job Details */}
            {data && <JobDetailsStaticData data={data} params={{ branch_code, trade_type, mode, job_no, year }} />}

            {/* Form */}
            <form onSubmit={formik.handleSubmit}>
                {/* Free Days Section */}
                <div className="upload-container" style={{ marginTop: "20px" }}>
                    <div className="section-header">
                        <h3 className="section-title">Free Days Configuration</h3>
                    </div>
                    <div className="upload-content">
                        <div className="row">
                            <div className="col-md-6 form-field">
                                <label className="field-label">Shipping Line / Airline</label>
                                <TextField
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    name="shipping_line_airline"
                                    value={formik.values.shipping_line_airline || ""}
                                    onChange={formik.handleChange}
                                    placeholder="Enter Shipping Line / Airline"
                                />
                            </div>
                            <div className="col-md-6 form-field">
                                <label className="field-label">Free Time (Days)</label>
                                <TextField
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    type="number"
                                    name="free_time"
                                    value={formik.values.free_time || ""}
                                    onChange={formik.handleChange}
                                    placeholder="Enter Free Days"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Charges Grid (Cost Tab only) */}
                <Box sx={{ mb: 4, mt: 2 }}>
                    <ChargesGrid 
                        parentId={jobId} 
                        parentModule="Job" 
                        initialTab="cost" 
                        hideTabs={true} 
                        shippingLineAirline={data?.shipping_line_airline}
                        jobNumber={job_no}
                        jobYear={year}
                    />
                </Box>

                {/* Charges Table */}
                <div className="upload-container">
                    <div className="section-header">
                        <h3 className="section-title">DO COPIES</h3>
                    </div>
                    <div className="upload-content">
                        <FileUpload
                            label="UPLOAD DO COPIES"
                            onFilesUploaded={(urls) => {
                                handleDoCopiesUpload(urls);
                            }}
                        />
                        <ImagePreview
                            images={formik.values.do_copies}
                            onDeleteImage={(index) => {
                                handleRemoveDoCopy(index);
                            }}
                        />
                    </div>
                </div>


                {/* Submit Button */}
                <div className="submit-section">
                    <button className="submit-btn" type="submit" aria-label="submit-btn">
                        Submit
                    </button>
                </div>
            </form>

            {/* Snackbar */}
            <Snackbar
                open={snackbar || fileSnackbar}
                message={
                    snackbar
                        ? "Configuration saved successfully!"
                        : "File uploaded successfully!"
                }
                sx={{ left: "auto !important", right: "24px !important" }}
                onClose={() => {
                    setSnackbar(false);
                    setFileSnackbar(false);
                }}
                autoHideDuration={3000}
            />
        </div>
    );
}

export default React.memo(EditFreeDaysConf);

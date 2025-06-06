import React, { useState, useEffect, useRef, useContext } from "react";
import {
  TextField,
  Box,
  FormControlLabel,
  Typography,
  Button,
} from "@mui/material";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import { useParams } from "react-router-dom";
import axios from "axios";
import JobDetailsRowHeading from "../import-dsr/JobDetailsRowHeading";
import { Checkbox } from "@mui/material";
import { Row, Col } from "react-bootstrap";
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import ImagePreview from "../../components/gallery/ImagePreview.js";

const OperationListJob = () => {
  const { job_no, year } = useParams();
  const bl_no_ref = useRef();
  const [data, setData] = useState(null);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const extractFileName = (url) => {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
      console.error("Failed to extract file name:", error);
      return url; // Fallback to original URL
    }
  };

  useEffect(() => {
    fetchJobDetails();
  }, [job_no, year]);

  const fetchJobDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-job/${year}/${job_no}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Error fetching job details:", error);
    }
  };

  const handleCheckboxChange = (e) => {
    const isChecked = e.target.checked;

    if (isChecked) {
      const currentDate = new Date();
      const isoDate = new Date(
        currentDate.getTime() - currentDate.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      setData((prevData) => ({
        ...prevData,
        documentation_completed_date_time: isoDate,
      }));
    } else {
      setData((prevData) => ({
        ...prevData,
        documentation_completed_date_time: "",
      }));
    }
  };

  const handleAdminDateChange = (e) => {
    const newValue = e.target.value;
    setData((prevData) => ({
      ...prevData,
      documentation_completed_date_time: newValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/update-documentation-job/${data._id}`,
        {
          documentation_completed_date_time:
            data.documentation_completed_date_time,
        }
      );
      navigate("/documentation");
      await fetchJobDetails(); // Fetch updated data after submission
    } catch (error) {
      console.error("Error updating documentation date:", error);
      alert("Failed to update documentation date.");
    }
  };

  const renderDocuments = (documents, type) => {
    if (!documents || documents.length === 0) {
      return <p>No {type} uploaded yet.</p>;
    }

    return (
      <Box display="flex" flexWrap="wrap" gap={2} mt={2}>
        {documents.map((doc, index) => (
          <Box
            key={index}
            sx={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "5px",
              flex: "1 1 30%",
              maxWidth: "30%",
              minWidth: "250px",
              maxHeight: "150px",
              overflowY: "auto",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                backgroundColor: "#333",
                color: "#fff",
                padding: "5px",
                borderRadius: "5px 5px 0 0",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              {doc.document_name || `Document ${index + 1}`} (
              {doc.document_code})
            </Typography>
            <Box mt={2}>
              {doc.url.map((url, imgIndex) => (
                <div
                  key={imgIndex}
                  style={{
                    marginBottom: "10px",
                    paddingBottom: "5px",
                    borderBottom: "1px solid #ccc",
                  }}
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "blue" }}
                  >
                    {extractFileName(url)}
                  </a>
                </div>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    );
  };
  const renderAllDocuments = (documents) => {
    if (!documents || documents.length === 0) {
      return <p>No documents uploaded yet.</p>;
    }

    return (
      <Box
        display="flex"
        flexWrap="wrap"
        gap={2}
        mt={2}
        sx={{
          justifyContent: "flex-start", // Center items on smaller devices
        }}
      >
        {documents.map((url, index) => (
          <Box
            key={index}
            sx={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "5px",
              flex: "1 1 30%", // Flex-basis for 3 columns
              maxWidth: "30%", // Ensure proper width
              minWidth: "250px", // Minimum width for smaller devices
            }}
          >
            {/* <Typography
              variant="subtitle1"
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                backgroundColor: "#333",
                color: "#fff",
                padding: "5px",
                borderRadius: "5px 5px 0 0",
              }}
            >
              Document {index + 1}
            </Typography> */}
            <Box mt={1} textAlign="center">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: "blue" }}
              >
                {extractFileName(url)}
              </a>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };
  return (
    <div>
      {data !== null ? (
        <>
          <JobDetailsStaticData
            data={data}
            bl_no_ref={bl_no_ref}
            params={{ job_no, year }}
          />

          <div className="job-details-container">
            <JobDetailsRowHeading heading="CTH Documents" />
            {renderDocuments(data.cth_documents, "CTH Documents")}
          </div>
          <div className="job-details-container">
            <JobDetailsRowHeading heading="All Documents" />
            {renderAllDocuments(data.all_documents)}
          </div>
               {/* ********************** submission ********************** */}
               <div className="job-details-container">
            <Row>
              <Col xs={12} md={4}>
                <div className="mb-3">
                  <strong>Verified Checklist:&nbsp;</strong>
                  <ImagePreview
                    images={data.checklist || []}
                    readOnly
                  />
                </div>
              </Col>
              <Col xs={12} md={4}>
                <div className="mb-3">
                  <strong>Job Sticker:&nbsp;</strong>
                  <ImagePreview
                    images={data.job_sticker_upload || []}
                    readOnly
                  />
                </div>
              </Col>
              <Col xs={12} md={4}>
                <div className="mb-3">
                  <strong>DO Copies:&nbsp;</strong>
                  <ImagePreview images={data.do_copies || []} readOnly />
                </div>
              </Col>
            </Row>
          </div>

          
        </>
      ) : (
        <p>Loading job details...</p>
      )}
    </div>
  );
};

export default OperationListJob;

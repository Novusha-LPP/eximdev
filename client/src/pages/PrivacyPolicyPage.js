import React, { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Typography, Box, Button, Divider, Fab } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useNavigate } from "react-router-dom";
import "../styles/privacy-policy.scss";

function PrivacyPolicyPage() {
  const [showScrollButton, setShowScrollButton] = useState(false);

  const navigate = useNavigate();
  const handleGoBack = () => {
    navigate("/");
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Container fluid className="privacy-policy-container" style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <Row>
        <Col lg={10} className="mx-auto" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleGoBack}
              sx={{ mb: 2, textTransform: "none", fontSize: "16px" }}
            >
              Go Back
            </Button>
            <Typography variant="h3" sx={{ fontWeight: "bold", mb: 2 }}>
              Privacy Policy - Attendance
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#666" }}>
              Effective Date: May 13, 2026
            </Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Content */}
          <Box sx={{ backgroundColor: "#fff", padding: "30px", borderRadius: "8px" }}>
            {/* Section 1 */}
            <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: "bold" }}>
              1. Introduction
            </Typography>
            <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
              Welcome to the <strong>Suraj Forwarders Attendance</strong> application. This Privacy Policy
              explains how <strong>Novusha LPP / Suraj Forwarders</strong> ("we," "us," or "our") collects, uses,
              and shares information about you when you use our mobile application and related services (the
              "Attendance Module").
            </Typography>
            <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
              By using the app, you agree to the collection and use of information in accordance with this policy.
            </Typography>

            {/* Section 2 */}
            <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: "bold" }}>
              2. Information Collection and Use
            </Typography>

            <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: "bold" }}>
              2.1 Location Data
            </Typography>
            <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
              To provide accurate attendance tracking and geofencing capabilities, the App requires access to your
              device's location services.
            </Typography>
            <Box sx={{ pl: 2, mb: 2 }}>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                <strong>Purpose:</strong> We collect precise location data (GPS coordinates) specifically during
                the <strong>"Punch In"</strong> and <strong>"Punch Out"</strong> actions. This is used to verify that
                the employee is physically present at the authorized workplace location as defined by the organization.
              </Typography>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                <strong>Disclosure:</strong> The app collects location data to enable attendance verification at the
                time of recording your work sessions. We do not track your location continuously in the background
                unless explicitly required by your organization's policy and disclosed separately.
              </Typography>
            </Box>

            <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: "bold" }}>
              2.2 Personal Information
            </Typography>
            <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
              We may collect and store certain personally identifiable information to identify and manage your
              employee profile, including:
            </Typography>
            <Box sx={{ pl: 3, mb: 2 }}>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                • Name
              </Typography>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                • Employee ID / Username
              </Typography>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                • Organization / Department details
              </Typography>
            </Box>

            <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: "bold" }}>
              2.3 Device Information
            </Typography>
            <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
              We may collect information about the device you use to access the App, including:
            </Typography>
            <Box sx={{ pl: 3, mb: 2 }}>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                • Device model
              </Typography>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                • Operating system and version
              </Typography>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                • Unique device identifiers
              </Typography>
            </Box>

            {/* Section 3 */}
            <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: "bold" }}>
              3. Data Storage and Sharing
            </Typography>
            <Box sx={{ pl: 2, mb: 2 }}>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                <strong>Employer Access:</strong> The data collected (attendance times and location of punches) is
                shared exclusively with your employer's administrative team for payroll and attendance management
                purposes.
              </Typography>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                <strong>No Third-Party Sale:</strong> We do not sell, trade, or otherwise transfer your personal
                information or location data to outside parties for marketing or advertising purposes.
              </Typography>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                <strong>Secure Storage:</strong> All data is stored on secure servers with industry-standard
                encryption protocols.
              </Typography>
            </Box>

            {/* Section 4 */}
            <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: "bold" }}>
              4. Permissions
            </Typography>
            <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
              To function correctly, the App will request the following permissions:
            </Typography>
            <Box sx={{ pl: 3, mb: 2 }}>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                • <strong>Location (Precise/GPS):</strong> Required to verify your location during punch-in/out.
              </Typography>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                • <strong>Internet Access:</strong> Required to sync your attendance data with the central server.
              </Typography>
            </Box>

            {/* Section 5 */}
            <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: "bold" }}>
              5. Security
            </Typography>
            <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
              The security of your data is important to us. We implement a variety of security measures to maintain
              the safety of your personal information when you enter, submit, or access your information.
            </Typography>

            {/* Section 6 */}
            <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: "bold" }}>
              6. User Rights
            </Typography>
            <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
              You can manage your location permissions through your device settings at any time. However, disabling
              location services may prevent you from successfully recording your attendance if geofencing is enabled
              by your organization.
            </Typography>

            {/* Section 7 */}
            <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: "bold" }}>
              7. Changes to This Privacy Policy
            </Typography>
            <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page and updating the "Effective Date."
            </Typography>

            {/* Section 8 */}
            <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: "bold" }}>
              8. Contact Us
            </Typography>
            <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
              If you have any questions about this Privacy Policy, please contact your HR Department or our support
              team:
            </Typography>
            <Box sx={{ pl: 2, mb: 4 }}>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                <strong>Email:</strong> support@surajforwarders.com
              </Typography>
              <Typography paragraph sx={{ lineHeight: 1.8, fontSize: "16px" }}>
                <strong>Website:</strong> https://surajforwarders.com
              </Typography>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Back Button */}
            <Box sx={{ textAlign: "center", mt: 4 }}>
              <Button
                variant="contained"
                startIcon={<ArrowBackIcon />}
                onClick={handleGoBack}
              >
                Go Back to Login
              </Button>
            </Box>
          </Box>
        </Col>
      </Row>

      {/* Scroll to Top Button */}
      {showScrollButton && (
        <Fab
          color="primary"
          aria-label="scroll to top"
          onClick={handleScrollToTop}
          sx={{
            position: "fixed",
            bottom: 30,
            right: 30,
            zIndex: 1000,
            animation: "fadeIn 0.3s ease-in",
          }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      )}
    </Container>
  );
}

export default PrivacyPolicyPage;

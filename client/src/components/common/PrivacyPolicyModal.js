import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";

function PrivacyPolicyModal({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span> Privacy Policy - Attendance</span>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ maxHeight: "60vh", overflowY: "auto" }}>
        <Box sx={{ py: 2 }}>
          {/* Header */}
          <Typography variant="subtitle2" sx={{ color: "#666", mb: 2 }}>
            Effective Date: May 13, 2026
          </Typography>

          {/* Section 1 */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: "bold" }}>
            1. Introduction
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
            Welcome to the <strong>Suraj Forwarders Attendance</strong> application. This Privacy
            Policy explains how <strong>Novusha LPP / Suraj Forwarders</strong> ("we," "us," or "our")
            collects, uses, and shares information about you when you use our mobile application and
            related services (the "Attendance Module").
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
            By using the app, you agree to the collection and use of information in accordance with
            this policy.
          </Typography>

          {/* Section 2 */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: "bold" }}>
            2. Information Collection and Use
          </Typography>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: "bold" }}>
            2.1 Location Data
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
            To provide accurate attendance tracking and geofencing capabilities, the App requires
            access to your device's location services.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            • <strong>Purpose:</strong> We collect precise location data (GPS coordinates) specifically
            during the <strong>"Punch In"</strong> and <strong>"Punch Out"</strong> actions. This is used
            to verify that the employee is physically present at the authorized workplace location as
            defined by the organization.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
            • <strong>Disclosure:</strong> The app collects location data to enable attendance
            verification at the time of recording your work sessions. We do not track your location
            continuously in the background unless explicitly required by your organization's policy and
            disclosed separately.
          </Typography>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: "bold" }}>
            2.2 Personal Information
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
            We may collect and store certain personally identifiable information to identify and manage
            your employee profile, including:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            • Name
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            • Employee ID / Username
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
            • Organization / Department details
          </Typography>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: "bold" }}>
            2.3 Device Information
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
            We may collect information about the device you use to access the App, including:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            • Device model
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            • Operating system and version
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
            • Unique device identifiers
          </Typography>

          {/* Section 3 */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: "bold" }}>
            3. Data Storage and Sharing
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            • <strong>Employer Access:</strong> The data collected (attendance times and location of
            punches) is shared exclusively with your employer's administrative team for payroll and
            attendance management purposes.
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            • <strong>No Third-Party Sale:</strong> We do not sell, trade, or otherwise transfer your
            personal information or location data to outside parties for marketing or advertising
            purposes.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
            • <strong>Secure Storage:</strong> All data is stored on secure servers with
            industry-standard encryption protocols.
          </Typography>

          {/* Section 4 */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: "bold" }}>
            4. Permissions
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
            To function correctly, the App will request the following permissions:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            • <strong>Location (Precise/GPS):</strong> Required to verify your location during
            punch-in/out.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
            • <strong>Internet Access:</strong> Required to sync your attendance data with the central
            server.
          </Typography>

          {/* Section 5 */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: "bold" }}>
            5. Security
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
            The security of your data is important to us. We implement a variety of security measures to
            maintain the safety of your personal information when you enter, submit, or access your
            information.
          </Typography>

          {/* Section 6 */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: "bold" }}>
            6. User Rights
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
            You can manage your location permissions through your device settings at any time. However,
            disabling location services may prevent you from successfully recording your attendance if
            geofencing is enabled by your organization.
          </Typography>

          {/* Section 7 */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: "bold" }}>
            7. Changes to This Privacy Policy
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by
            posting the new Privacy Policy on this page and updating the "Effective Date."
          </Typography>

          {/* Section 8 */}
          <Typography variant="h6" sx={{ mt: 3, mb: 1, fontWeight: "bold" }}>
            8. Contact Us
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            If you have any questions about this Privacy Policy, please contact your HR Department or
            our support team:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            • <strong>Email:</strong> support@surajforwarders.com
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, fontWeight: 500 }}>
            • <strong>Website:</strong> https://surajforwarders.com
          </Typography>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained">
          I Understand
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PrivacyPolicyModal;

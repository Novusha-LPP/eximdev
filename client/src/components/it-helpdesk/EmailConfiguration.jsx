import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Divider,
  Stack,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import SendIcon from "@mui/icons-material/Send";
import { toast } from "react-hot-toast";
import emailAPI from "../../api/emailAPI";

export default function EmailConfiguration() {
  const [email, setEmail] = useState({
    from_email: "support@alvision.in",
    to_email: "",
    subject: "",
    body: "",
  });
  
  const [sending, setSending] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmail((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendEmail = async () => {
    if (!email.to_email) {
      toast.error("Recipient email required");
      return;
    }
    if (!email.subject) {
      toast.error("Subject required");
      return;
    }
    if (!email.body) {
      toast.error("Message required");
      return;
    }

    setSending(true);

    try {
      const response = await emailAPI.config.send({
        from_email: email.from_email,
        to: email.to_email,
        subject: email.subject,
        text: email.body,
        html: `<div><p>${email.body}</p><br/><small>From: ${email.from_email}</small></div>`,
      });

      if (response.success) {
        toast.success("Email sent successfully");
        setEmail({
          from_email: "support@alvision.in",
          to_email: "",
          subject: "",
          body: "",
        });
      } else {
        toast.error(response.message || "Email sending failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Box p={3}>
      <Card sx={{ maxWidth: 600, margin: "0 auto", boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1.5} mb={2}>
            <EmailIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>
              Compose Email
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  disabled
                  label="From Email"
                  value={email.from_email}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="To (Recipient Email)"
                  name="to_email"
                  value={email.to_email}
                  onChange={handleInputChange}
                  size="small"
                  placeholder="e.g., client@example.com"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Subject"
                  name="subject"
                  value={email.subject}
                  onChange={handleInputChange}
                  size="small"
                  placeholder="Enter email subject"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={8}
                  label="Message Body"
                  name="body"
                  value={email.body}
                  onChange={handleInputChange}
                  placeholder="Type your message here..."
                />
              </Grid>
            </Grid>

            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                color="primary"
                endIcon={<SendIcon />}
                onClick={handleSendEmail}
                disabled={sending}
                size="large"
                sx={{ px: 4 }}
              >
                {sending ? "Sending..." : "Send Email"}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
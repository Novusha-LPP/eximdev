
import express from "express";
import { saveEmailConfig, testEmailConfig, sendEmail, sendTestEmail } from "../../middleware/nodemailerConfig.mjs";

const router = express.Router();

// Get current email configuration
router.get("/config", async (req, res) => {
  try {
    // Get the current email configuration
    const config = process.env.EMAIL_CONFIG ? JSON.parse(process.env.EMAIL_CONFIG) : null;

    res.json({ success: true, data: config });
  } catch (error) {
    console.error("Error getting email configuration:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Save email configuration
router.post("/config", async (req, res) => {
  try {
    const config = req.body;

    // Only from_email is required — email sent via Resend
    if (!config.from_email) {
      return res.status(400).json({ success: false, message: "From Email is required" });
    }

    // Save the email configuration
    const saved = saveEmailConfig(config);

    if (saved) {
      res.json({ success: true, message: "Email configuration saved successfully" });
    } else {
      res.status(500).json({ success: false, message: "Failed to save email configuration" });
    }
  } catch (error) {
    console.error("Error saving email configuration:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test email configuration
router.post("/test", async (req, res) => {
  try {
    const config = req.body;

    // Only from_email is required — email sent via Resend
    if (!config.from_email) {
      return res.status(400).json({ success: false, message: "From Email is required" });
    }

    // Test the email configuration via Resend
    const testResult = await testEmailConfig(config);

    res.json({ 
      success: testResult, 
      message: testResult ? "Email configuration is valid" : "Email configuration is invalid" 
    });
  } catch (error) {
    console.error("Error testing email configuration:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send test email
router.post("/send-test", async (req, res) => {
  try {
    const { to, from_email, subject, text, config } = req.body;

    const emailConfig = { from_email, subject, text, ...config };

    if (!to) {
      return res.status(400).json({ success: false, message: "Recipient email is required" });
    }

    if (!emailConfig.from_email) {
      return res.status(400).json({ success: false, message: "From email is required" });
    }

    saveEmailConfig(emailConfig);

    const result = await sendTestEmail(emailConfig, to);

    emailConfig.last_test = new Date().toISOString().split('T')[0] + " " + 
                          new Date().toLocaleTimeString('en-US', { hour12: false });
    emailConfig.last_test_status = result.success ? "success" : "error";

    saveEmailConfig(emailConfig);

    res.json({ 
      success: result.success, 
      message: result.success ? "Test email sent successfully" : "Failed to send test email", 
      logs: result.logs,
      error: result.error
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to send test email" });
  }
});

router.get("/email/send/ping", (req,res)=>{
  res.json({
    success:true,
    message:"Email route working"
  });
});

// Send email
router.get("/ping", (req,res)=>{
  res.json({
    success:true,
    message:"Email API working"
  });
});


// Send Email API
router.post("/send", async (req, res) => {
  try {

    const {
      to,
      subject,
      text,
      html,
      cc,
      bcc,
      attachments
    } = req.body;


    if (!to) {
      return res.status(400).json({
        success:false,
        message:"Recipient email is required"
      });
    }


    const result = await sendEmail({
      to,
      subject,
      text,
      html,
      cc,
      bcc,
      attachments
    });


    return res.json({
      success:true,
      message:"Email sent successfully",
      data:result
    });


  } catch(error){

    console.error("Email send error:", error);

    return res.status(500).json({
      success:false,
      message:error.message
    });

  }
});


export default router;


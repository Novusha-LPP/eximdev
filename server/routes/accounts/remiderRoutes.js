// routes/reminderSystem.js
import express from "express";
import AccountEntry from "../../model/accounts/AccountEntry.js";
import UserModel from "../../model/userModel.mjs";
import cron from "node-cron";
import nodemailer from "nodemailer";
import aws from "aws-sdk";


const router = express.Router();



// Configure AWS SDK
aws.config.update({
  accessKeyId: process.env.REACT_APP_ACCESS_KEY,
  secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  region: "ap-south-1",
});

// Create Nodemailer SES transporter
let transporter = nodemailer.createTransport({
  SES: new aws.SES({ apiVersion: "2010-12-01" }),
});

// Helper function to send reminder email using your existing working transporter
const sendReminderEmail = async (userEmail, userName, entries) => {
  // Group entries by urgency
  const urgentEntries = entries.filter(e => e.daysUntilDue <= 2);
  const importantEntries = entries.filter(e => e.daysUntilDue > 2 && e.daysUntilDue <= 5);
  
  // Generate email content
  const generateEntryTable = (entriesList, title, color) => {
    if (entriesList.length === 0) return '';
    
    return `
      <div style="margin: 20px 0;">
        <h3 style="color: ${color}; margin-bottom: 15px; border-bottom: 2px solid ${color}; padding-bottom: 5px;">
          ${title} (${entriesList.length} items)
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Master Type</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Company</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Due Date</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Billing Date</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Days Left</th>
            </tr>
          </thead>
          <tbody>
            ${entriesList.map(entry => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${entry.masterTypeName}</td>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${entry.defaultFields.companyName}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${new Date(entry.defaultFields.dueDate).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${entry.defaultFields.billingDate ? 
                  new Date(entry.defaultFields.billingDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'Not Set'}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: ${color}; font-weight: bold;">
                  ${entry.daysUntilDue} day(s)
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const totalEntries = entries.length;
  const subject = urgentEntries.length > 0 
    ? `🚨 URGENT: ${urgentEntries.length} Due Date Reminders - Action Required`
    : `⚠️ IMPORTANT: ${totalEntries} Due Date Reminders`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Due Date Reminder System</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
          Hello ${userName}, you have ${totalEntries} upcoming due dates requiring attention
        </p>
      </div>
      
      <div style="padding: 30px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          ${generateEntryTable(urgentEntries, '🚨 URGENT - 2 Days or Less', '#dc3545')}
          ${generateEntryTable(importantEntries, '⚠️ IMPORTANT - 3-5 Days', '#fd7e14')}
          
          ${totalEntries === 0 ? `
            <div style="text-align: center; padding: 40px;">
              <p style="font-size: 18px; color: #28a745;">✅ All caught up! No due dates in the next 5 days.</p>
            </div>
          ` : `
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-top: 20px;">
              <h4 style="margin: 0 0 10px 0; color: #856404;">📋 Action Required:</h4>
              <ul style="margin: 0; color: #856404;">
                <li>Review all upcoming due dates</li>
                <li>Ensure billing dates are set appropriately</li>
                <li>Contact relevant parties for urgent items</li>
                <li>Update master entries as needed</li>
              </ul>
            </div>
          `}
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; background-color: #f1f1f1; border-radius: 0 0 10px 10px;">
        <p style="margin: 0; color: #666; font-size: 14px;">
          This is an automated reminder from the Master Management System.<br/>
          You received this because you have access to the Accounts module.<br/>
          Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: "connect@surajgroupofcompanies.com",
    to: userEmail,
    subject: subject,
    html: htmlContent
  };

  try {
    // Use your existing working transporter
    await transporter.sendMail(mailOptions);
    console.log(`✅ Reminder email sent to: ${userEmail} (${userName}) - ${totalEntries} entries`);
    return { success: true, userEmail, userName, entriesCount: totalEntries };
  } catch (error) {
    console.error(`❌ Failed to send email to ${userEmail}:`, error.message);
    return { success: false, userEmail, userName, error: error.message };
  }
};

// Function to check and send due date reminders
const checkAndSendReminders = async () => {
  try {
    console.log('🔍 Starting automatic due date reminder check...');
    
    // Get all users with "Accounts" module access
    const accountsUsers = await UserModel.find({
      modules: { $in: ["Accounts"] }
    });

    if (accountsUsers.length === 0) {
      console.log('⚠️  No users found with Accounts module access');
      return { success: false, message: 'No accounts users found' };
    }

    console.log(`👥 Found ${accountsUsers.length} users with Accounts access:`);
    accountsUsers.forEach(user => {
      console.log(`   - ${user.first_name} ${user.last_name} (${user.email})`);
    });

    // Get all master entries with due dates
    const masterEntries = await AccountEntry.find({
      'defaultFields.dueDate': { $exists: true, $ne: null, $ne: '' }
    }).populate('masterTypeId');

    if (masterEntries.length === 0) {
      console.log('📋 No master entries with due dates found');
      return { success: true, message: 'No entries to check' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter entries that need reminders
    const entriesNeedingReminders = [];
    
    for (const entry of masterEntries) {
      try {
        if (!entry.defaultFields.dueDate) {
          console.log(`⏭️  Skipping ${entry.masterTypeName} - ${entry.defaultFields.companyName}: No due date`);
          continue;
        }

        const dueDate = new Date(entry.defaultFields.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

        console.log(`📅 ${entry.masterTypeName} - ${entry.defaultFields.companyName}: ${daysUntilDue} days until due`);

        // Check if due date is within 5 days and not overdue
        if (daysUntilDue >= 0 && daysUntilDue <= 5) {
          let shouldSendReminder = true;

          // Check billing date condition
          if (entry.defaultFields.billingDate) {
            const billingDate = new Date(entry.defaultFields.billingDate);
            billingDate.setHours(0, 0, 0, 0);
            
            const daysBetweenBillingAndDue = Math.floor((dueDate - billingDate) / (1000 * 60 * 60 * 24));            
            if (daysBetweenBillingAndDue <= 5) {
              shouldSendReminder = false;
              console.log(`⏭️  Skipping ${entry.masterTypeName} - ${entry.defaultFields.companyName}: billing date within 5 days of due date`);
            }
          } else {
            console.log(`📊 ${entry.masterTypeName}: No billing date set`);
          }

          if (shouldSendReminder) {
            console.log(`✅ Adding ${entry.masterTypeName} - ${entry.defaultFields.companyName} to reminder list`);
            entriesNeedingReminders.push({
              ...entry.toObject(),
              daysUntilDue
            });
          }
        } else if (daysUntilDue < 0) {
          console.log(`⏰ ${entry.masterTypeName} - ${entry.defaultFields.companyName}: Overdue by ${Math.abs(daysUntilDue)} days`);
        } else {
          console.log(`⏳ ${entry.masterTypeName} - ${entry.defaultFields.companyName}: Due in ${daysUntilDue} days (beyond 5-day window)`);
        }
      } catch (entryError) {
        console.error(`❌ Error processing entry ${entry._id}:`, entryError.message);
      }
    }

    if (entriesNeedingReminders.length === 0) {
      console.log('✅ No entries need reminders at this time');
      return { success: true, message: 'No reminders needed' };
    }

    console.log(`📧 ${entriesNeedingReminders.length} entries need reminders`);

    // Send emails to all accounts users
    const emailResults = [];
    
    for (const user of accountsUsers) {
      try {
        const userName = `${user.first_name} ${user.last_name}`.trim();
        const result = await sendReminderEmail(user.email, userName, entriesNeedingReminders);
        emailResults.push(result);
        
        // Add delay between emails to avoid overwhelming the email service
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Error sending email to ${user.email}:`, error.message);
        emailResults.push({
          success: false,
          userEmail: user.email,
          userName: `${user.first_name} ${user.last_name}`,
          error: error.message
        });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    const failureCount = emailResults.filter(r => !r.success).length;

    console.log(`✅ Reminder check completed: ${successCount} emails sent successfully, ${failureCount} failed`);
    
    return {
      success: true,
      entriesChecked: masterEntries.length,
      entriesNeedingReminders: entriesNeedingReminders.length,
      emailResults,
      successCount,
      failureCount,
      accountsUsers: accountsUsers.length
    };

  } catch (error) {
    console.error('❌ Error in automatic reminder check:', error);
    return { success: false, error: error.message };
  }
};

// Manual trigger endpoint (for testing)
router.post('/trigger-reminders', async (req, res) => {
  try {
    console.log('🧪 Manual reminder trigger initiated');
    const result = await checkAndSendReminders();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in manual reminder trigger:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint using your existing transporter
router.get('/test-email-now', async (req, res) => {
  try {
    const testMailOptions = {
      from: "connect@surajgroupofcompanies.com",
      to: "daymarafik123@gmail.com",
      subject: "🧪 TEST: Using Working Transporter",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #4CAF50; border-radius: 10px;">
          <h1 style="color: #4CAF50;">✅ Test Successful!</h1>
          <p>This email was sent using your existing working transporter.</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          <p><strong>System Status:</strong> Ready to send reminders!</p>
        </div>
      `
    };

    const info = await transporter.sendMail(testMailOptions);
    
    res.status(200).json({
      success: true,
      message: "Test email sent successfully using working transporter",
      messageId: info.messageId,
      recipientEmail: "daymarafik123@gmail.com"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get reminder status endpoint
router.get('/reminder-status', async (req, res) => {
  try {
    const accountsUsers = await UserModel.find({
      modules: { $in: ["Accounts"] }
    }).select('first_name last_name email modules');

    const masterEntries = await AccountEntry.find({
      'defaultFields.dueDate': { $exists: true, $ne: null, $ne: '' }
    }).select('masterTypeName defaultFields');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEntries = masterEntries.filter(entry => {
      if (!entry.defaultFields.dueDate) return false;
      
      const dueDate = new Date(entry.defaultFields.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue >= 0 && daysUntilDue <= 5) {
        if (entry.defaultFields.billingDate) {
          const billingDate = new Date(entry.defaultFields.billingDate);
          billingDate.setHours(0, 0, 0, 0);
          const daysBetweenBillingAndDue = Math.floor((dueDate - billingDate) / (1000 * 60 * 60 * 24));
          return daysBetweenBillingAndDue > 5;
        }
        return true;
      }
      return false;
    });

    res.status(200).json({
      accountsUsers: accountsUsers.length,
      accountsUsersList: accountsUsers.map(u => ({
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        hasAccountsModule: u.modules.includes('Accounts')
      })),
      totalEntries: masterEntries.length,
      upcomingDueDates: upcomingEntries.length,
      nextReminderCheck: '9:00 AM daily IST',
      systemStatus: 'active',
      currentTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Automatic daily reminder system using cron
// Runs every day at 9:00 AM IST
cron.schedule('0 9 * * *', async () => {
  console.log('⏰ Scheduled reminder check triggered at:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  await checkAndSendReminders();
}, {
  timezone: "Asia/Kolkata"
});


// Optional: Test cron that runs every minute (for testing only - remove in production)
// cron.schedule('* * * * *', async () => {
//   console.log('🧪 Test reminder check at:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
//   await checkAndSendReminders();
// }, {
//   timezone: "Asia/Kolkata"
// });

console.log('📧 Due Date Reminder System initialized - Daily checks at 9:00 AM IST');

export default router;

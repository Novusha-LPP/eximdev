import ExcelJS from '../../client/node_modules/exceljs/lib/exceljs.nodejs.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateWorkSummary() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AlVision Developer';
  workbook.created = new Date();
  workbook.modified = new Date();

  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate 900
  };

  const headerFont = {
    name: 'Segoe UI',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  };

  const baseFont = {
    name: 'Segoe UI',
    size: 10
  };

  const borderStyle = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  const todayDate = '02-09-2026';

  // ==========================================
  // SHEET 1: Tasks & Changes Done Today
  // ==========================================
  const ws1 = workbook.addWorksheet('Tasks & Changes Done Today', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  ws1.columns = [
    { header: 'Sr. No.', key: 'srNo', width: 8 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Category / Area', key: 'category', width: 22 },
    { header: 'Module / Feature', key: 'module', width: 25 },
    { header: 'Issue / Requirement Description', key: 'issue', width: 40 },
    { header: 'Exact Resolution / Changes Implemented', key: 'solution', width: 50 },
    { header: 'Key Files Modified / Added', key: 'files', width: 45 },
    { header: 'Status', key: 'status', width: 16 }
  ];

  const tasksData = [
    {
      srNo: 1,
      date: todayDate,
      category: 'Branch Merge & Integration',
      module: 'Payroll Branch Integration',
      issue: 'User requested to pull Payroll branch and merge everything from Payroll into current branch while preserving all newly integrated modules (IT Helpdesk, Scorecards, AMC, Email Config).',
      solution: 'Merged Payroll (441a90ba) into exmworking (8f2b1825). Resolved all merge conflicts in HomePage.js, AssignModule.js, Sidebar.js, Home.js, and convertToExcel.js. Integrated all CRM phase 1 components and verified production build.',
      files: 'client/src/pages/HomePage.js, client/src/components/home/AssignModule.js, client/src/components/home/Sidebar.js, client/src/components/home/Home.js, client/src/components/crm/*',
      status: 'Completed'
    },
    {
      srNo: 2,
      date: todayDate,
      category: 'Server Stability & Startup',
      module: 'Resend API Safe Initialization',
      issue: 'Backend nodemon crashed on startup with "SyntaxError: Unexpected token << in app.mjs" and "Error: Missing API key. Pass it to constructor new Resend("re_123")".',
      solution: 'Removed stray merge conflict markers from server/app.mjs. Safely guarded Resend client initialization with null checks (process.env.RESEND_API_KEY ? new Resend(...) : null) and guarded all .send() calls across email endpoints.',
      files: 'server/app.mjs, server/routes/employee-onboarding/onboardEmployee.mjs, server/routes/home/changePassword.mjs, server/middleware/nodemailerConfig.mjs',
      status: 'Completed'
    },
    {
      srNo: 3,
      date: todayDate,
      category: 'Authentication & Security',
      module: 'Session Cookie & 401 Unauthorized Fix',
      issue: 'Admin user experienced "401 Unauthorized: Access Denied: No Token Provided" and "Failed to update modules" error when assigning modules to users on localhost:9006.',
      solution: 'Fixed invalid sameSite="none" with secure=false setting in login.mjs (which was rejected by modern browsers on HTTP). Configured sameSite="lax" in development and sameSite="none" + secure=true in production. Added Bearer token fallback in Axios request interceptor.',
      files: 'server/routes/login.mjs, client/src/index.js, server/middleware/authMiddleware.mjs',
      status: 'Completed'
    },
    {
      srNo: 4,
      date: todayDate,
      category: 'Permission & Module Visibility',
      module: 'Home Dashboard Module Categorization',
      issue: 'Assigning "Supplier Scorecard" to a user was also automatically displaying "AMC Suppliers Renewal Sheet" (with 3 unassigned tiles) due to a hardcoded push in Home.js.',
      solution: 'Removed hardcoded push of "AMC Suppliers Renewal", "AMC Visitor Logs", and "Admin Equipment Checklist" in Home.js. Added clear explanatory comments. All modules now strictly respect database assignments.',
      files: 'client/src/components/home/Home.js, client/src/utils/moduleCategories.js',
      status: 'Completed'
    },
    {
      srNo: 5,
      date: todayDate,
      category: 'UI & Table Actions',
      module: 'AMC Suppliers Renewal Sheet',
      issue: 'AMC Suppliers Renewal Sheet table only had add and delete functionality, with no visible edit button or view modal for records.',
      solution: 'Added dedicated Eye (View Details) button, Pencil (Edit Record) button, and Dustbin (Delete Record) button in Action column. Built read-only View Details Modal with full equipment, schedule dates, contact, and remarks breakdown.',
      files: 'client/src/pages/AmcRenewalList.jsx, client/src/styles/scorecard.scss',
      status: 'Completed'
    },
    {
      srNo: 6,
      date: todayDate,
      category: 'UI & Table Actions',
      module: 'Supplier Scorecards Actions & View Modal',
      issue: 'Supplier Scorecards table lacked view details functionality and clicking anywhere on table rows inadvertently opened edit mode.',
      solution: 'Added Eye (View Details) modal showing full criteria ratings breakdown and total score. Replaced text with Pencil (Edit) and Dustbin (Delete) icon buttons. Removed row click navigation so edit only opens on clicking the edit icon.',
      files: 'client/src/pages/ScorecardList.jsx, client/src/styles/scorecard.scss',
      status: 'Completed'
    },
    {
      srNo: 7,
      date: todayDate,
      category: 'UI Styling & Interaction',
      module: 'Action Buttons Hover Color Fix',
      issue: 'Hovering over table action icons caused icon colors to fade, change, or turn white/invisible due to generic .btn:hover CSS overrides.',
      solution: 'Added specific .btn-icon.btn-info, .btn-icon.btn-primary, and .btn-icon.btn-danger CSS classes with fixed stroke/text colors and subtle background brightness on hover, ensuring icon colors stay consistent.',
      files: 'client/src/styles/scorecard.scss, client/src/pages/ScorecardList.jsx, client/src/pages/AmcRenewalList.jsx',
      status: 'Completed'
    },
    {
      srNo: 8,
      date: todayDate,
      category: 'UI & Table Formatting',
      module: 'Score Column Single Line Display',
      issue: 'In Supplier Scorecards table, the Score column wrapped values onto two lines (e.g. 6.20 on line 1 and / 10 on line 2).',
      solution: 'Added white-space: nowrap and min-width: fit-content to .score-badge class, table header, and <td> cells to ensure the full score (e.g. 6.20 / 10) always displays on a single line.',
      files: 'client/src/pages/ScorecardList.jsx, client/src/styles/scorecard.scss',
      status: 'Completed'
    },
    {
      srNo: 9,
      date: todayDate,
      category: 'Navigation',
      module: 'Global & Module Topbar Back Navigation',
      issue: 'Clicking the top back arrow next to the SURAJ logo in header or in module topbars did not consistently navigate back to the Home page.',
      solution: 'Updated AppbarComponent.js to navigate("/") on clicking top back arrow. Added circular back button in ScorecardList.jsx navigating directly to "/" (Home).',
      files: 'client/src/components/home/AppbarComponent.js, client/src/pages/ScorecardList.jsx, client/src/pages/AmcRenewalList.jsx',
      status: 'Completed'
    },
    {
      srNo: 10,
      date: todayDate,
      category: 'UI & Interaction',
      module: 'Score & Rating Column Click & Cursor Policy',
      issue: 'Score and Rating column data should not be clickable or open modals on click, and should show the standard arrow cursor.',
      solution: 'Set cursor: default on .score-badge in scorecard.scss and removed onClick handlers from Score and Rating column cells in ScorecardList.jsx, keeping View modal exclusive to the Eye action icon.',
      files: 'client/src/styles/scorecard.scss, client/src/pages/ScorecardList.jsx',
      status: 'Completed'
    },
    {
      srNo: 11,
      date: todayDate,
      category: 'UI & Modal Design',
      module: 'View Details Modal UI Polish & Refinement',
      issue: 'View Details modal had unnecessary bottom buttons (Close/Edit), an ugly scrollbar, and non-uniform corner curvature.',
      solution: 'Removed bottom footer button bar, removed scrollbar with compact responsive spacing, and applied uniform 20px rounded corners across all four sides of the modal container.',
      files: 'client/src/pages/ScorecardList.jsx, client/src/pages/AmcRenewalList.jsx',
      status: 'Completed'
    },
    {
      srNo: 12,
      date: todayDate,
      category: 'UI Alignment',
      module: 'Filter Bar Clear Filters Button Alignment',
      issue: 'Clear Filters button was sitting slightly lower and misaligned with neighboring search and dropdown filter inputs.',
      solution: 'Matched button height explicitly to 41px and normalized label spacing with visibility: hidden to lift and align Clear Filters seamlessly with other filter inputs.',
      files: 'client/src/pages/ScorecardList.jsx, client/src/pages/AmcRenewalList.jsx',
      status: 'Completed'
    },
    {
      srNo: 13,
      date: todayDate,
      category: 'UI Theme & Badges',
      module: 'Submitted Status Badge Color Theme',
      issue: 'User requested to update the Submitted status badge color theme.',
      solution: 'Applied crisp modern Teal theme (#0d9488 text with rgba(13, 148, 136, 0.12) background) to the .badge-submitted class and mapped getStatusClass("Submitted") to badge-submitted.',
      files: 'client/src/styles/scorecard.scss, client/src/utils/index.js',
      status: 'Completed'
    },
    {
      srNo: 14,
      date: todayDate,
      category: 'UI & Table Spacing',
      module: 'Table Layout, Column Min-Widths & Compact Action Icons',
      issue: '16-column table suffered from severe vertical text wrapping (7-8 lines per cell) and crowded action buttons.',
      solution: 'Added explicit column min-widths (Equipment Name, Location, Remarks), white-space: nowrap on all dates/numbers/badges, optimized cell padding to 10px 14px, and made action buttons compact 28px circles in single horizontal layout.',
      files: 'client/src/pages/AmcRenewalList.jsx, client/src/pages/ScorecardList.jsx, client/src/styles/scorecard.scss',
      status: 'Completed'
    },
    {
      srNo: 15,
      date: todayDate,
      category: 'UI & Spacing Polish',
      module: 'Stat Badges & Filter Bar Spacing Optimization',
      issue: 'Excessive whitespace around stat badge tiles and filter fields created an overly spaced out and disjointed header.',
      solution: 'Tightened card body padding from 24px to 12px 16px, reduced inter-card margins from 24px/16px to 12px, reduced form grid gaps from 20px to 12px, and enhanced stat cards with modern gradient backdrops, soft shadows, and clean typography.',
      files: 'client/src/styles/scorecard.scss',
      status: 'Completed'
    },
    {
      srNo: 16,
      date: todayDate,
      category: 'UI & Typography Polish',
      module: 'Filter Space Minimization & Label Font Size Increase',
      issue: 'Filter card had remaining empty bottom whitespace and filter field labels (Search, Status, etc.) were small.',
      solution: 'Reduced filter card padding to 8px 14px, set margin-bottom to 10px, increased filter label font-size by 2 sizes to 14px (bold #1e293b), matched input/button height to 38px, and compacted table padding to 8px 12px.',
      files: 'client/src/styles/scorecard.scss, client/src/pages/ScorecardList.jsx, client/src/pages/AmcRenewalList.jsx',
      status: 'Completed'
    }
  ];

  tasksData.forEach(row => {
    const r = ws1.addRow(row);
    r.font = baseFont;
    r.alignment = { vertical: 'middle', wrapText: true };
  });

  // Apply header styling
  ws1.getRow(1).eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws1.getRow(1).height = 28;

  // Apply cell borders & status styling
  ws1.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.height = 42;
      row.eachCell(cell => {
        cell.border = borderStyle;
      });
      const statusCell = row.getCell('status');
      if (statusCell.value === 'Completed') {
        statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF15803D' } };
        statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
      row.getCell('srNo').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('date').alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });


  // ==========================================
  // SHEET 2: Commit ID & Git Proof of Work
  // ==========================================
  const ws2 = workbook.addWorksheet('Commit ID & Git Proof of Work', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  ws2.columns = [
    { header: 'Sr. No.', key: 'srNo', width: 8 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Commit ID / Ref', key: 'commitId', width: 16 },
    { header: 'Timestamp', key: 'timestamp', width: 22 },
    { header: 'Branch', key: 'branch', width: 18 },
    { header: 'Commit Message / Title', key: 'message', width: 35 },
    { header: 'Detailed Description of Work & Proof', key: 'description', width: 55 },
    { header: 'Status / State', key: 'state', width: 22 }
  ];

  const commitsData = [
    {
      srNo: 1,
      date: todayDate,
      commitId: '8f2b1825',
      timestamp: '2026-09-02 13:10:12 IST',
      branch: 'exmworking (Merged from Payroll)',
      message: "Merge branch 'Payroll' into exmworking with new modules integrated",
      description: 'Pulled Payroll branch (441a90ba) and merged into exmworking. Retained IT Helpdesk, Scorecards, AMC modules, User Assets, and Email Config while bringing in all Payroll CRM components, Invoice Nucleus sync, Attendance and Karma Points.',
      state: 'Committed & Merged'
    },
    {
      srNo: 2,
      date: todayDate,
      commitId: 'bce7bc55',
      timestamp: '2026-09-02 13:12:36 IST',
      branch: 'exmworking',
      message: 'fix(app): remove stray merge marker from route mounting',
      description: 'Cleaned up merge conflict marker in server/app.mjs around line 759 to restore clean backend syntax compilation.',
      state: 'Committed'
    },
    {
      srNo: 3,
      date: todayDate,
      commitId: 'e6698532',
      timestamp: '2026-09-02 13:13:48 IST',
      branch: 'exmworking',
      message: 'fix(client): fix closing JSX tag nesting in HomePage.js',
      description: 'Fixed nested JSX Box closing tags in HomePage.js to ensure clean React frontend compilation.',
      state: 'Committed'
    },
    {
      srNo: 4,
      date: todayDate,
      commitId: '[Pending Commit]',
      timestamp: '2026-09-02 15:55:00 IST',
      branch: 'exmworking',
      message: 'fix: auth cookies, safe resend, module categorization, scorecard & amc view/edit UI',
      description: 'Uncommitted pending changes ready for user commit: Fixed login sameSite cookie & bearer token fallback; safe Resend mailer init; removed hardcoded AMC modules push; added Eye (View modal), Pencil (Edit), Dustbin (Delete) action buttons with fixed hover colors; score nowrap on single line; Appbar back navigation to home.',
      state: 'Working Tree (Ready to Commit)'
    }
  ];

  commitsData.forEach(row => {
    const r = ws2.addRow(row);
    r.font = baseFont;
    r.alignment = { vertical: 'middle', wrapText: true };
  });

  ws2.getRow(1).eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws2.getRow(1).height = 28;

  ws2.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.height = 42;
      row.eachCell(cell => {
        cell.border = borderStyle;
      });
      const stateCell = row.getCell('state');
      if (stateCell.value === 'Committed & Merged' || stateCell.value === 'Committed') {
        stateCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF15803D' } };
      } else {
        stateCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFD97706' } };
      }
      stateCell.alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('srNo').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('date').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('commitId').alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });


  // ==========================================
  // SHEET 3: Files Modified & Added Summary
  // ==========================================
  const ws3 = workbook.addWorksheet('Files Modified & Added Summary', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  ws3.columns = [
    { header: 'Sr. No.', key: 'srNo', width: 8 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'File Path', key: 'filePath', width: 50 },
    { header: 'Component / Tier', key: 'tier', width: 18 },
    { header: 'Change Type', key: 'changeType', width: 18 },
    { header: 'Summary of Key Modifications', key: 'summary', width: 55 }
  ];

  const filesData = [
    {
      srNo: 1,
      date: todayDate,
      filePath: 'server/routes/login.mjs',
      tier: 'Backend (Server)',
      changeType: 'Modified',
      summary: 'Configured sameSite: "lax" in dev and sameSite: "none" + secure: true in prod; returned JWT token in response body for Bearer auth fallback.'
    },
    {
      srNo: 2,
      date: todayDate,
      filePath: 'client/src/index.js',
      tier: 'Frontend (Client)',
      changeType: 'Modified',
      summary: 'Added Authorization: Bearer <token> fallback in global Axios request interceptor from localStorage.'
    },
    {
      srNo: 3,
      date: todayDate,
      filePath: 'server/routes/employee-onboarding/onboardEmployee.mjs',
      tier: 'Backend (Server)',
      changeType: 'Modified',
      summary: 'Safely guarded Resend client initialization with null check to prevent server startup crashes when API key is missing.'
    },
    {
      srNo: 4,
      date: todayDate,
      filePath: 'server/routes/home/changePassword.mjs',
      tier: 'Backend (Server)',
      changeType: 'Modified',
      summary: 'Safely guarded Resend client initialization and email sending logic.'
    },
    {
      srNo: 5,
      date: todayDate,
      filePath: 'server/middleware/nodemailerConfig.mjs',
      tier: 'Backend (Server)',
      changeType: 'Modified',
      summary: 'Guarded Resend sendEmail fallback when RESEND_API_KEY is not configured.'
    },
    {
      srNo: 6,
      date: todayDate,
      filePath: 'client/src/components/home/Home.js',
      tier: 'Frontend (Client)',
      changeType: 'Modified',
      summary: 'Removed hardcoded auto-injection of AMC modules; added clean comments for module categorization and role permissions.'
    },
    {
      srNo: 7,
      date: todayDate,
      filePath: 'client/src/pages/ScorecardList.jsx',
      tier: 'Frontend (Client)',
      changeType: 'Modified',
      summary: 'Added Eye (View Details) modal, Pencil (Edit) and Dustbin (Delete) action icons; removed row click navigation; ensured Score displays on single line; added back arrow to home.'
    },
    {
      srNo: 8,
      date: todayDate,
      filePath: 'client/src/pages/AmcRenewalList.jsx',
      tier: 'Frontend (Client)',
      changeType: 'Modified',
      summary: 'Added Eye (View Details) modal, Pencil (Edit) and Dustbin (Delete) action icons; removed row click; added back arrow to home.'
    },
    {
      srNo: 9,
      date: todayDate,
      filePath: 'client/src/styles/scorecard.scss',
      tier: 'Frontend (Styles)',
      changeType: 'Modified',
      summary: 'Added .btn-icon.btn-info, .btn-icon.btn-primary, and .btn-icon.btn-danger classes with fixed stroke/color preserving icon colors on hover; added white-space: nowrap to .score-badge.'
    },
    {
      srNo: 10,
      date: todayDate,
      filePath: 'client/src/components/home/AppbarComponent.js',
      tier: 'Frontend (Client)',
      changeType: 'Modified',
      summary: 'Updated global Appbar back arrow next to SURAJ logo to navigate directly to "/" (Home page).'
    },
    {
      srNo: 11,
      date: todayDate,
      filePath: 'client/src/utils/convertToExcel.js',
      tier: 'Frontend (Client)',
      changeType: 'Modified',
      summary: 'Fixed net_weight undefined variable reference to item.net_weight.'
    },
    {
      srNo: 12,
      date: todayDate,
      filePath: 'client/src/pages/HomePage.js',
      tier: 'Frontend (Client)',
      changeType: 'Modified',
      summary: 'Resolved all 12 merge conflicts from Payroll branch; integrated all CRM, IT Helpdesk, AMC, Scorecard, and Attendance routes.'
    },
    {
      srNo: 13,
      date: todayDate,
      filePath: 'client/src/components/crm/*',
      tier: 'Frontend (Client)',
      changeType: 'Added (35 Files)',
      summary: 'Integrated full CRM phase 1 system (AccountFormModal, CustomerList, ActivityTimeline, LeadScoringModule, etc.) from Payroll branch.'
    },
    {
      srNo: 14,
      date: todayDate,
      filePath: 'server/model/crm/* & server/routes/crm/*',
      tier: 'Backend (Server)',
      changeType: 'Added (14 Files)',
      summary: 'Integrated CRM models (Activity, AutomationRule, LeadScore, Notification, Organization, Task, Territory) and controllers from Payroll.'
    }
  ];

  filesData.forEach(row => {
    const r = ws3.addRow(row);
    r.font = baseFont;
    r.alignment = { vertical: 'middle', wrapText: true };
  });

  ws3.getRow(1).eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws3.getRow(1).height = 28;

  ws3.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.height = 36;
      row.eachCell(cell => {
        cell.border = borderStyle;
      });
      row.getCell('srNo').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('date').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('tier').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('changeType').alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  const newOutputPath = path.resolve('C:/eximdev/Work_Summary.xlsx');
  await workbook.xlsx.writeFile(newOutputPath);
  console.log(`Excel file successfully created at: ${newOutputPath}`);

  const oldOutputPath = path.resolve('C:/eximdev/Work_Summary_2026-09-02.xlsx');
  if (fs.existsSync(oldOutputPath)) {
    try {
      fs.unlinkSync(oldOutputPath);
      console.log(`Old file removed: ${oldOutputPath}`);
    } catch {
      // Old file might be open in Excel, skip deletion silently
    }
  }
}

generateWorkSummary().catch(err => {
  console.error('Error generating Excel summary:', err);
  process.exit(1);
});

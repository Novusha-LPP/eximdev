import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import fs from 'fs';

// Register models
import UserModel from '../model/userModel.mjs';
import KPISheet from '../model/kpi/kpiSheetModel.mjs';
import Company from '../model/attendance/Company.js';
import TeamModel from '../model/teamModel.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.PROD_MONGODB_URI;

if (!MONGODB_URI) {
  console.error("PROD_MONGODB_URI is not defined in the environment variables!");
  process.exit(1);
}

// Format date helper
function formatDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => n.toString().padStart(2, '0');
  
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Helper to extract action details from approval history
function getActionDetails(history, actionType) {
  if (!history || !Array.isArray(history)) return { name: '', date: '', comments: '' };
  const actions = history.filter(a => a.action === actionType);
  if (actions.length === 0) return { name: '', date: '', comments: '' };
  
  const lastAction = actions[actions.length - 1];
  const byUser = lastAction.by;
  const name = byUser ? `${byUser.first_name || ''} ${byUser.last_name || ''}`.trim() : '';
  const date = lastAction.date ? formatDate(lastAction.date) : '';
  const comments = lastAction.comments || '';
  return { name, date, comments };
}

async function run() {
  try {
    console.log("Connecting to production DB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.");

    // Fetch official companies to make a map
    const officialCompanies = await Company.find({});
    const dbCompanyMap = new Map();
    officialCompanies.forEach(c => {
      dbCompanyMap.set(c.company_name.toLowerCase().trim(), c.company_name);
    });

    // Helper to get normalized company name
    function getNormalizedCompanyName(user) {
      let rawName = '';
      if (user.company_id && user.company_id.company_name) {
        rawName = user.company_id.company_name;
      } else if (user.company) {
        rawName = user.company;
      }
      
      rawName = rawName.trim();
      if (!rawName) return 'Other / Unassigned';
      
      const key = rawName.toLowerCase();
      if (dbCompanyMap.has(key)) {
        return dbCompanyMap.get(key);
      }
      
      // Manual overrides for spelling/casing inconsistencies
      if (key.includes('novusha')) return 'Novusha Consulting Services India LLP';
      if (key.includes('rabs')) return 'RABS Industries India Private Limited';
      if (key.includes('sr container')) return 'SR Container Carriers';
      if (key.includes('eximbiz')) return 'Eximbiz Enterprise';
      if (key.includes('sansar')) return 'Sansar Tradelink';
      if (key.includes('suraj forwarders')) {
        if (key.includes('shipping')) return 'Suraj Forwarders & Shipping Agencies';
        return 'Suraj Forwarders Private Limited';
      }
      if (key.includes('paramount')) return 'Paramount Propack Private Limited';
      if (key.includes('alluvium')) return 'Alluvium IoT Solutions Private Limited';

      // Fallback: title case
      return rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    // Target periods: March, April, May, June 2026
    const targetPeriods = [
      { year: 2026, month: 3, label: "March 2026" },
      { year: 2026, month: 4, label: "April 2026" },
      { year: 2026, month: 5, label: "May 2026" },
      { year: 2026, month: 6, label: "June 2026" }
    ];

    console.log("Fetching KPI Sheets...");
    const sheets = await KPISheet.find({
      $or: targetPeriods.map(p => ({ year: p.year, month: p.month }))
    })
    .populate('user')
    .populate('approval_history.by', 'first_name last_name username');

    console.log(`Found ${sheets.length} sheets in the target periods.`);

    // Extract all user IDs who have sheets
    const sheetUserIds = sheets.map(s => s.user?._id?.toString()).filter(Boolean);

    // Fetch all users (either active OR has sheets in the periods)
    console.log("Fetching users...");
    const users = await UserModel.find({
      $or: [
        { isActive: { $ne: false } },
        { _id: { $in: sheetUserIds } }
      ]
    }).populate('company_id', 'company_name company_code');

    console.log(`Found ${users.length} matching users.`);

    // Fetch active teams to associate team names
    console.log("Fetching teams...");
    const teams = await TeamModel.find({ isActive: { $ne: false } });

    // Map sheets to a quick lookup map: userId_year_month -> sheet
    const sheetsMap = new Map();
    sheets.forEach(sheet => {
      if (sheet.user?._id) {
        const key = `${sheet.user._id.toString()}_${sheet.year}_${sheet.month}`;
        sheetsMap.set(key, sheet);
      }
    });

    // Detailed rows array
    const detailedDataRows = [];

    // Grouping by company for sheet grouping
    const companyDataGroups = {};

    users.forEach(user => {
      // Find user team
      const userTeam = teams.find(t => 
        t.members.some(m => m.userId?.toString() === user._id.toString()) || 
        t.hodId?.toString() === user._id.toString()
      );
      const teamName = userTeam ? userTeam.name : 'General';

      // Get Company Name
      const companyName = getNormalizedCompanyName(user);
      
      // We will create entry for each target period
      targetPeriods.forEach(period => {
        const key = `${user._id.toString()}_${period.year}_${period.month}`;
        const sheet = sheetsMap.get(key);

        let status = 'NOT_CREATED';
        let submitDetails = { name: '', date: '', comments: '' };
        let checkDetails = { name: '', date: '', comments: '' };
        let verifyDetails = { name: '', date: '', comments: '' };
        let approveDetails = { name: '', date: '', comments: '' };
        let overallPct = null;
        let totalQty = null;
        let totalVal = null;
        let avgComplexity = null;
        let quadrant = '';
        let commentsList = [];

        if (sheet) {
          status = sheet.status;
          submitDetails = getActionDetails(sheet.approval_history, 'SUBMIT');
          checkDetails = getActionDetails(sheet.approval_history, 'CHECK');
          verifyDetails = getActionDetails(sheet.approval_history, 'VERIFY');
          approveDetails = getActionDetails(sheet.approval_history, 'APPROVE');
          
          overallPct = sheet.summary?.overall_percentage ?? null;
          totalQty = sheet.summary?.total_quantity ?? null;
          totalVal = sheet.summary?.total_value_score ?? null;
          avgComplexity = sheet.summary?.average_complexity ?? null;
          quadrant = sheet.summary?.performance_quadrant || '';

          // Gather comments
          if (submitDetails.comments) commentsList.push(`Submit: ${submitDetails.comments}`);
          if (checkDetails.comments) commentsList.push(`Check: ${checkDetails.comments}`);
          if (verifyDetails.comments) commentsList.push(`Verify: ${verifyDetails.comments}`);
          if (approveDetails.comments) commentsList.push(`Approve: ${approveDetails.comments}`);
        }

        const employeeName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unknown';
        const finalComments = commentsList.join(' | ');

        const dataRow = {
          company: companyName,
          employeeName,
          email: user.email || user.official_email || 'N/A',
          department: user.department || 'N/A',
          designation: user.designation || 'N/A',
          team: teamName,
          period: period.label,
          year: period.year,
          month: period.month,
          status,
          submittedBy: submitDetails.name || (status !== 'DRAFT' && status !== 'NOT_CREATED' ? employeeName : ''),
          submissionDate: submitDetails.date || (sheet && sheet.createdAt ? formatDate(sheet.createdAt) : ''),
          checkedBy: checkDetails.name,
          checkedDate: checkDetails.date,
          verifiedBy: verifyDetails.name,
          verifiedDate: verifyDetails.date,
          approvedBy: approveDetails.name,
          approvedDate: approveDetails.date,
          comments: finalComments,
          overallPct: overallPct !== null ? overallPct / 100 : null, // Store as fraction for % formatting in Excel
          totalQty,
          totalVal,
          avgComplexity,
          quadrant
        };

        detailedDataRows.push(dataRow);

        // Group by company
        if (!companyDataGroups[companyName]) {
          companyDataGroups[companyName] = [];
        }
        companyDataGroups[companyName].push(dataRow);
      });
    });

    console.log(`Generated ${detailedDataRows.length} user-period data rows.`);

    // Initialize Exceljs Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Antigravity AI';
    workbook.created = new Date();

    // -------------------------------------------------------------
    // SHEET 1: EXECUTIVE SUMMARY
    // -------------------------------------------------------------
    const summarySheet = workbook.addWorksheet('Executive Summary');
    summarySheet.views = [{ showGridLines: true }];

    // Set standard rows for styling
    summarySheet.addRow([]); // Blank line
    
    // Title
    summarySheet.getCell('B2').value = 'EXIM GROUP - KPI SUBMISSION ANALYSIS';
    summarySheet.getCell('B2').font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF1F4E78' } };
    summarySheet.getCell('B3').value = `Generated on: ${formatDate(new Date())} | Scope: Last 3 Months (March - May 2026) + Current (June 2026)`;
    summarySheet.getCell('B3').font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF595959' } };
    summarySheet.addRow([]);
    summarySheet.addRow([]);

    // We will calculate summary statistics by Company and Month
    const summaryTableData = [];
    
    const uniqueCompanyNames = Object.keys(companyDataGroups).sort();
    
    uniqueCompanyNames.forEach(compName => {
      targetPeriods.forEach(period => {
        const matchingRows = companyDataGroups[compName].filter(r => r.year === period.year && r.month === period.month);
        const total = matchingRows.length;
        const approved = matchingRows.filter(r => r.status === 'APPROVED').length;
        const pending = matchingRows.filter(r => ['SUBMITTED', 'CHECKED', 'VERIFIED'].includes(r.status)).length;
        const draft = matchingRows.filter(r => r.status === 'DRAFT').length;
        const notCreated = matchingRows.filter(r => r.status === 'NOT_CREATED').length;
        
        const submittedCount = approved + pending;
        const submissionRate = total > 0 ? (submittedCount / total) : 0;
        const completionRate = total > 0 ? (approved / total) : 0;

        summaryTableData.push({
          company: compName,
          period: period.label,
          total,
          approved,
          pending,
          draft,
          notCreated,
          submissionRate,
          completionRate
        });
      });
    });

    // Add Table Header for Summary
    const summaryHeaders = [
      'Company Name',
      'Period',
      'Total Expected',
      'Approved KPI',
      'Pending Review',
      'In Draft',
      'Not Created',
      'Submission Rate %',
      'Completion Rate %'
    ];
    
    const summaryStartRow = 5;
    const sHeaderRowObj = summarySheet.getRow(summaryStartRow);
    summaryHeaders.forEach((h, idx) => {
      const cell = sHeaderRowObj.getCell(idx + 2); // Start from column B (index 2)
      cell.value = h;
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'medium', color: { argb: 'FF1F4E78' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
      };
    });
    sHeaderRowObj.height = 25;

    // Fill Summary Data
    let currentRowNum = summaryStartRow + 1;
    summaryTableData.forEach((sData, rIdx) => {
      const row = summarySheet.getRow(currentRowNum);
      row.getCell(2).value = sData.company;
      row.getCell(3).value = sData.period;
      row.getCell(4).value = sData.total;
      row.getCell(5).value = sData.approved;
      row.getCell(6).value = sData.pending;
      row.getCell(7).value = sData.draft;
      row.getCell(8).value = sData.notCreated;
      
      const subCell = row.getCell(9);
      subCell.value = sData.submissionRate;
      subCell.numFmt = '0.0%';
      
      const compCell = row.getCell(10);
      compCell.value = sData.completionRate;
      compCell.numFmt = '0.0%';

      // Alignments
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };

      // Styling and Zebra striping
      const isEven = rIdx % 2 === 0;
      for (let c = 2; c <= 10; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
        if (isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F5F8' }
          };
        }
      }
      row.height = 20;
      currentRowNum++;
    });

    // Auto-fit Columns for Summary Sheet
    summarySheet.columns.forEach((column, colIdx) => {
      if (colIdx === 0) return; // Column A is empty
      let maxLen = 10;
      column.eachCell({ includeEmpty: true }, (cell, rowIdx) => {
        if (rowIdx < summaryStartRow) return;
        const valStr = cell.value ? cell.value.toString() : '';
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      column.width = Math.min(maxLen + 4, 45);
    });
    summarySheet.getColumn(1).width = 3; // Column A padding

    // -------------------------------------------------------------
    // HELPER FUNCTION TO POPULATE MASTER & DETAILED LISTS
    // -------------------------------------------------------------
    const listHeaders = [
      'Company Name',
      'Employee Name',
      'Email',
      'Department',
      'Designation',
      'Team',
      'Period',
      'KPI Status',
      'Submitted By',
      'Submission Date',
      'Checked By',
      'Checking Date',
      'Verified By',
      'Verification Date',
      'Approved By',
      'Approval Date',
      'Overall %',
      'Total Qty',
      'Total Score',
      'Avg Complexity',
      'Performance Quadrant',
      'Approval Comments'
    ];

    function fillListSheet(sheet, dataRows) {
      sheet.views = [{ showGridLines: true }];
      
      // Add Header Row
      const hRow = sheet.addRow(listHeaders);
      hRow.height = 28;
      
      hRow.eachCell((cell, idx) => {
        cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F4E78' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'medium', color: { argb: 'FF1F4E78' } },
          right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
        };
      });

      // Add Data Rows
      dataRows.forEach((r, rIdx) => {
        const row = sheet.addRow([
          r.company,
          r.employeeName,
          r.email,
          r.department,
          r.designation,
          r.team,
          r.period,
          r.status,
          r.submittedBy,
          r.submissionDate,
          r.checkedBy,
          r.checkedDate,
          r.verifiedBy,
          r.verifiedDate,
          r.approvedBy,
          r.approvedDate,
          r.overallPct,
          r.totalQty,
          r.totalVal,
          r.avgComplexity,
          r.quadrant,
          r.comments
        ]);
        
        row.height = 20;

        // Alignment formatting
        row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }; // Company
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }; // Name
        row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' }; // Email
        row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' }; // Dept
        row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' }; // Desg
        row.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' }; // Team
        row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' }; // Period
        row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' }; // Status
        row.getCell(9).alignment = { horizontal: 'left', vertical: 'middle' }; // Subby
        row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' }; // SubDate
        row.getCell(11).alignment = { horizontal: 'left', vertical: 'middle' }; // Chkby
        row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' }; // ChkDate
        row.getCell(13).alignment = { horizontal: 'left', vertical: 'middle' }; // Verby
        row.getCell(14).alignment = { horizontal: 'center', vertical: 'middle' }; // VerDate
        row.getCell(15).alignment = { horizontal: 'left', vertical: 'middle' }; // Appby
        row.getCell(16).alignment = { horizontal: 'center', vertical: 'middle' }; // AppDate
        
        const pctCell = row.getCell(17); // Overall %
        pctCell.alignment = { horizontal: 'right', vertical: 'middle' };
        pctCell.numFmt = '0.0%';

        row.getCell(18).alignment = { horizontal: 'right', vertical: 'middle' }; // Qty
        row.getCell(18).numFmt = '#,##0';
        row.getCell(19).alignment = { horizontal: 'right', vertical: 'middle' }; // Score
        row.getCell(19).numFmt = '#,##0';
        row.getCell(20).alignment = { horizontal: 'right', vertical: 'middle' }; // Avg Complexity
        row.getCell(20).numFmt = '0.00';
        
        row.getCell(21).alignment = { horizontal: 'center', vertical: 'middle' }; // Quadrant
        row.getCell(22).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }; // Comments

        // Zebra & borders
        const isEven = rIdx % 2 === 0;
        row.eachCell((cell, cIdx) => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
          };
          if (isEven) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' }
            };
          }
        });

        // Status coloring in Column 8
        const statusCell = row.getCell(8);
        const status = statusCell.value;
        if (status === 'APPROVED') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; // light green
          statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF375623' } };
        } else if (['SUBMITTED', 'CHECKED', 'VERIFIED'].includes(status)) {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; // light blue
          statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1F4E78' } };
        } else if (status === 'DRAFT') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }; // light yellow
          statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF7F6000' } };
        } else if (['NOT_CREATED', 'REJECTED'].includes(status)) {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8CBAD' } }; // light red
          statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFC00000' } };
        }
      });

      // Auto-fit column widths
      sheet.columns.forEach((column) => {
        let maxLen = 10;
        column.eachCell({ includeEmpty: true }, (cell, rowIdx) => {
          if (rowIdx === 1) {
            if (cell.value && cell.value.toString().length * 1.2 > maxLen) {
              maxLen = cell.value.toString().length * 1.2;
            }
          } else {
            const valStr = cell.value ? cell.value.toString() : '';
            if (valStr.length > maxLen) maxLen = valStr.length;
          }
        });
        column.width = Math.min(maxLen + 3, 38);
      });
    }

    // -------------------------------------------------------------
    // SHEET 2: GLOBAL MASTER LIST
    // -------------------------------------------------------------
    const masterSheet = workbook.addWorksheet('Master List');
    fillListSheet(masterSheet, detailedDataRows);

    // -------------------------------------------------------------
    // SHEETS 3+: INDIVIDUAL COMPANY TABS
    // -------------------------------------------------------------
    console.log("Generating company specific sheets...");
    uniqueCompanyNames.forEach(compName => {
      // Clean company name for sheet tab name (limit 30 chars, no special characters like / \ ? * [ ])
      let tabName = compName
        .replace(/[\/\\\?\*\[\]]/g, '')
        .replace(/\bPrivate Limited\b/ig, 'Pvt Ltd')
        .replace(/\bSolutions\b/ig, 'Sol')
        .replace(/\bConsulting Services\b/ig, 'Cons')
        .substring(0, 30);
      
      if (!tabName.trim()) tabName = 'Company';
      
      const compSheet = workbook.addWorksheet(tabName);
      const compRows = companyDataGroups[compName];
      
      fillListSheet(compSheet, compRows);
    });

    // Write file to paths
    const workspaceReportPath = path.join(__dirname, '..', 'scratch', 'KPI_Organization_Wise_Report_Last_3_Months.xlsx');
    const artifactReportPath = 'C:\\Users\\india\\.gemini\\antigravity-ide\\brain\\8f3df012-75e3-4744-8d35-1c2c195fec08\\KPI_Organization_Wise_Report_Last_3_Months.xlsx';

    // Ensure directory exists in workspace
    const scratchDir = path.join(__dirname, '..', 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    console.log(`Writing workbook to: ${workspaceReportPath}`);
    await workbook.xlsx.writeFile(workspaceReportPath);
    console.log("Workbook written to workspace scratch directory.");

    // Write to artifact path as well
    console.log(`Writing workbook to artifact path: ${artifactReportPath}`);
    await workbook.xlsx.writeFile(artifactReportPath);
    console.log("Workbook written to artifact directory.");

    await mongoose.disconnect();
    console.log("Disconnected from database. Done!");
  } catch (error) {
    console.error("Error running script:", error);
    process.exit(1);
  }
}

run();

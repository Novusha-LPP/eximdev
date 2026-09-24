import ExcelJS from "exceljs";
import moment from "moment";
import { TRANSPORT_BRANCHES } from "../../model/invoicing/TransportBranchInvoicingModel.mjs";

const thinBorder = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } }
};

const doubleBottomBorder = {
  top: { style: "thin", color: { argb: "FF1E3A8A" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "double", color: { argb: "FF1E3A8A" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } }
};

/**
 * Builds the styled Daily Invoicing worksheet on any workbook
 */
export function buildDailyInvoicingSheet(wb, targetDate = null) {
  const ws = wb.addWorksheet("Daily Invoicing Template", {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: "FF1E40AF" } }
  });

  const dateStr = targetDate || moment().format("YYYY-MM-DD");

  ws.columns = [
    { key: "date", width: 16 },
    { key: "branch", width: 26 },
    { key: "invoice_count", width: 20 },
    { key: "invoice_amount", width: 24 },
    { key: "pending_lrs", width: 18 }
  ];

  // Row 1: Company Title Banner
  ws.mergeCells("A1:E1");
  const r1 = ws.getCell("A1");
  r1.value = "🏢 SURAJ FORWARDERS PVT. LTD.";
  r1.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  r1.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 32;

  // Row 2: Subtitle Banner
  ws.mergeCells("A2:E2");
  const r2 = ws.getCell("A2");
  r2.value = "AYAN — TRANSPORT INVOICING MODULE (DAILY SALES FORMAT)";
  r2.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  r2.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 24;

  // Row 3: Metadata Bar
  ws.mergeCells("A3:E3");
  const r3 = ws.getCell("A3");
  r3.value = `Official Daily Template | Date: ${dateStr} | 7 Authorized Branches | Suraj Forwarders ERP`;
  r3.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF475569" } };
  r3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  r3.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(3).height = 20;

  // Row 4: Spacer
  ws.getRow(4).height = 8;

  // Row 5: Column Headers
  const headers = ["Date", "Branch", "Invoice Count", "Invoice Amount (₹)", "Pending LRs"];
  const hRow = ws.getRow(5);
  hRow.values = headers;
  hRow.height = 28;
  hRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });

  // Rows 6 - 12: 7 Branches Data
  TRANSPORT_BRANCHES.forEach((b, idx) => {
    const rowNum = 6 + idx;
    const row = ws.getRow(rowNum);
    row.values = [dateStr, b, 0, 0, 0];
    row.height = 22;

    const isEven = idx % 2 === 0;
    const bgFill = isEven ? "FFFFFFFF" : "FFF8FAFC";

    // Date
    const cA = row.getCell(1);
    cA.alignment = { horizontal: "center", vertical: "middle" };
    cA.font = { name: "Segoe UI", size: 10, color: { argb: "FF1E293B" } };
    cA.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgFill } };
    cA.border = thinBorder;

    // Branch
    const cB = row.getCell(2);
    cB.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    cB.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
    cB.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgFill } };
    cB.border = thinBorder;

    // Invoice Count
    const cC = row.getCell(3);
    cC.alignment = { horizontal: "right", vertical: "middle" };
    cC.font = { name: "Segoe UI", size: 10, color: { argb: "FF1E293B" } };
    cC.numFmt = "#,##0";
    cC.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgFill } };
    cC.border = thinBorder;

    // Invoice Amount
    const cD = row.getCell(4);
    cD.alignment = { horizontal: "right", vertical: "middle" };
    cD.font = { name: "Segoe UI", size: 10, color: { argb: "FF1E293B" } };
    cD.numFmt = "₹ #,##0";
    cD.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgFill } };
    cD.border = thinBorder;

    // Pending LRs
    const cE = row.getCell(5);
    cE.alignment = { horizontal: "right", vertical: "middle" };
    cE.font = { name: "Segoe UI", size: 10, color: { argb: "FF1E293B" } };
    cE.numFmt = "#,##0";
    cE.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgFill } };
    cE.border = thinBorder;
  });

  // Row 13: Total Row
  const totRow = ws.getRow(13);
  totRow.values = [
    "",
    "TOTAL (AUTO-CALCULATED)",
    { formula: "SUM(C6:C12)", result: 0 },
    { formula: "SUM(D6:D12)", result: 0 },
    { formula: "SUM(E6:E12)", result: 0 }
  ];
  totRow.height = 26;

  totRow.eachCell((cell, colNum) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
    cell.border = doubleBottomBorder;
    if (colNum === 2) {
      cell.alignment = { horizontal: "right", vertical: "middle" };
    } else if (colNum === 4) {
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.numFmt = "₹ #,##0";
    } else if (colNum === 3 || colNum === 5) {
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.numFmt = "#,##0";
    }
  });

  // Row 14: Spacer
  ws.getRow(14).height = 12;

  // Row 15 - 20: Instructions Box
  ws.mergeCells("A15:E15");
  const iHead = ws.getCell("A15");
  iHead.value = "📌 INSTRUCTIONS & GUIDELINES FOR AYAN:";
  iHead.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E3A8A" } };
  iHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  iHead.alignment = { horizontal: "left", vertical: "middle", indent: 1 };

  const instNotes = [
    "1. Enter daily figures for each of the 7 transport branches in Columns C (Count), D (Amount), and E (Pending LRs).",
    "2. Do NOT rename, reorder, or delete any of the 7 branch names in Column B.",
    "3. Date in Column A can be updated if submitting past dates (format: YYYY-MM-DD).",
    "4. The TOTAL row calculates automatically via Excel formulas — do not overwrite.",
    "5. Upload this file via Transport Invoicing Module -> 'Upload Excel' button to preview diffs and confirm update."
  ];

  instNotes.forEach((note, nIdx) => {
    const rNum = 16 + nIdx;
    ws.mergeCells(`A${rNum}:E${rNum}`);
    const cell = ws.getCell(`A${rNum}`);
    cell.value = `   • ${note}`;
    cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF475569" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    cell.alignment = { horizontal: "left", vertical: "middle" };
    ws.getRow(rNum).height = 18;
  });

  return ws;
}

/**
 * Builds the styled Sundry Debtors worksheet on any workbook
 */
export function buildSundryDebtorsSheet(wb, targetDate = null) {
  const ws = wb.addWorksheet("Sundry Debtors Template", {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: "FFD97706" } }
  });

  const dateStr = targetDate || moment().format("YYYY-MM-DD");

  ws.columns = [
    { key: "date", width: 16 },
    { key: "direct_party", width: 24 },
    { key: "suraj_forwarders", width: 30 },
    { key: "additional_transporter", width: 28 },
    { key: "total_sundry", width: 26 }
  ];

  // Row 1: Company Title Banner
  ws.mergeCells("A1:E1");
  const r1 = ws.getCell("A1");
  r1.value = "🏢 SURAJ FORWARDERS PVT. LTD.";
  r1.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF9A3412" } };
  r1.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 32;

  // Row 2: Subtitle Banner
  ws.mergeCells("A2:E2");
  const r2 = ws.getCell("A2");
  r2.value = "SUNDRY DEBTORS DAILY REPORT (SECTION 22)";
  r2.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97706" } };
  r2.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 24;

  // Row 3: Metadata Bar
  ws.mergeCells("A3:E3");
  const r3 = ws.getCell("A3");
  r3.value = `Official Template | Date: ${dateStr} | 3 Debtor Categories | Suraj Forwarders ERP`;
  r3.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF78350F" } };
  r3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
  r3.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(3).height = 20;

  // Row 4: Spacer
  ws.getRow(4).height = 8;

  // Row 5: Column Headers
  const headers = [
    "Date",
    "Direct Party (₹)",
    "Suraj Forwarders Pvt. Ltd. (₹)",
    "Additional Transporter (₹)",
    "Total Sundry Debtors (₹)"
  ];
  const hRow = ws.getRow(5);
  hRow.values = headers;
  hRow.height = 28;
  hRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });

  // Row 6: Data Row
  const dRow = ws.getRow(6);
  dRow.values = [dateStr, 0, 0, 0, { formula: "SUM(B6:D6)", result: 0 }];
  dRow.height = 24;

  // Cell A6: Date
  const cA = dRow.getCell(1);
  cA.alignment = { horizontal: "center", vertical: "middle" };
  cA.font = { name: "Segoe UI", size: 10, color: { argb: "FF1E293B" } };
  cA.border = thinBorder;

  // Cell B6-D6: Categories
  [2, 3, 4].forEach((col) => {
    const c = dRow.getCell(col);
    c.alignment = { horizontal: "right", vertical: "middle" };
    c.font = { name: "Segoe UI", size: 10, color: { argb: "FF1E293B" } };
    c.numFmt = "₹ #,##0";
    c.border = thinBorder;
  });

  // Cell E6: Total
  const cE = dRow.getCell(5);
  cE.alignment = { horizontal: "right", vertical: "middle" };
  cE.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF9A3412" } };
  cE.numFmt = "₹ #,##0";
  cE.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
  cE.border = doubleBottomBorder;

  // Row 7: Spacer
  ws.getRow(7).height = 12;

  // Row 8 - 12: Instructions
  ws.mergeCells("A8:E8");
  const iHead = ws.getCell("A8");
  iHead.value = "📌 SUNDRY DEBTORS NOTES (SECTION 22):";
  iHead.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF9A3412" } };
  iHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF6B2" } };
  iHead.alignment = { horizontal: "left", vertical: "middle", indent: 1 };

  const notes = [
    "1. Enter outstanding debtor amounts for: Direct Party, Suraj Forwarders Pvt. Ltd., and Additional Transporter.",
    "2. Column E 'Total Sundry Debtors' auto-sums columns B through D.",
    "3. Date can be changed if submitting for another day (format: YYYY-MM-DD).",
    "4. Upload via 'Upload Excel' in the Transport Invoicing module."
  ];

  notes.forEach((note, nIdx) => {
    const rNum = 9 + nIdx;
    ws.mergeCells(`A${rNum}:E${rNum}`);
    const cell = ws.getCell(`A${rNum}`);
    cell.value = `   • ${note}`;
    cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF475569" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF6B2" } };
    cell.alignment = { horizontal: "left", vertical: "middle" };
    ws.getRow(rNum).height = 18;
  });

  return ws;
}

/**
 * Builds the styled Direct Income worksheet on any workbook
 */
export function buildDirectIncomeSheet(wb, targetDate = null) {
  const ws = wb.addWorksheet("Direct Income Template", {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: "FF059669" } }
  });

  const dateStr = targetDate || moment().format("YYYY-MM-DD");

  ws.columns = [
    { key: "date", width: 18 },
    { key: "direct_income", width: 34 }
  ];

  // Row 1: Company Title Banner
  ws.mergeCells("A1:B1");
  const r1 = ws.getCell("A1");
  r1.value = "🏢 SURAJ FORWARDERS PVT. LTD.";
  r1.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
  r1.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 32;

  // Row 2: Subtitle Banner
  ws.mergeCells("A2:B2");
  const r2 = ws.getCell("A2");
  r2.value = "DIRECT INCOME DAILY REPORT";
  r2.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
  r2.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 24;

  // Row 3: Metadata Bar
  ws.mergeCells("A3:B3");
  const r3 = ws.getCell("A3");
  r3.value = `Official Template | Date: ${dateStr} | Single Total Amount Head`;
  r3.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF064E3B" } };
  r3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
  r3.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(3).height = 20;

  // Row 4: Spacer
  ws.getRow(4).height = 8;

  // Row 5: Column Headers
  const headers = ["Date", "Direct Income – Total Amount (₹)"];
  const hRow = ws.getRow(5);
  hRow.values = headers;
  hRow.height = 28;
  hRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });

  // Row 6: Data Row
  const dRow = ws.getRow(6);
  dRow.values = [dateStr, 0];
  dRow.height = 24;

  const cA = dRow.getCell(1);
  cA.alignment = { horizontal: "center", vertical: "middle" };
  cA.font = { name: "Segoe UI", size: 10, color: { argb: "FF1E293B" } };
  cA.border = thinBorder;

  const cB = dRow.getCell(2);
  cB.alignment = { horizontal: "right", vertical: "middle" };
  cB.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF065F46" } };
  cB.numFmt = "₹ #,##0";
  cB.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
  cB.border = thinBorder;

  // Row 7: Spacer
  ws.getRow(7).height = 12;

  // Row 8 - 11: Instructions
  ws.mergeCells("A8:B8");
  const iHead = ws.getCell("A8");
  iHead.value = "📌 DIRECT INCOME GUIDELINES:";
  iHead.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF065F46" } };
  iHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
  iHead.alignment = { horizontal: "left", vertical: "middle", indent: 1 };

  const notes = [
    "1. Direct Income has no branch or category breakdown — enter single total amount.",
    "2. Upload via 'Upload Excel' in the Transport Invoicing module."
  ];

  notes.forEach((note, nIdx) => {
    const rNum = 9 + nIdx;
    ws.mergeCells(`A${rNum}:B${rNum}`);
    const cell = ws.getCell(`A${rNum}`);
    cell.value = `   • ${note}`;
    cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF475569" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
    cell.alignment = { horizontal: "left", vertical: "middle" };
    ws.getRow(rNum).height = 18;
  });

  return ws;
}

/**
 * Builds the Summary Dashboard worksheet for the master workbook
 */
export function buildSummaryDashboardSheet(wb, targetDate = null) {
  const ws = wb.addWorksheet("Summary Dashboard", {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: "FF4F46E5" } }
  });

  const dateStr = targetDate || moment().format("YYYY-MM-DD");

  ws.columns = [
    { key: "metric", width: 34 },
    { key: "value", width: 24 },
    { key: "notes", width: 32 }
  ];

  // Banner
  ws.mergeCells("A1:C1");
  const r1 = ws.getCell("A1");
  r1.value = "📊 AYAN — DAILY TRANSPORT INVOICING SUMMARY DASHBOARD";
  r1.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
  r1.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 32;

  ws.mergeCells("A2:C2");
  const r2 = ws.getCell("A2");
  r2.value = `Date: ${dateStr} | Cross-Sheet Dynamic Rollup Formulas | Suraj Forwarders ERP`;
  r2.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FFFFFFFF" } };
  r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  r2.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 22;

  ws.getRow(3).height = 10;

  // Header
  const hRow = ws.getRow(4);
  hRow.values = ["Performance Metric", "Daily Value / Formula", "Source Sheet"];
  hRow.height = 26;
  hRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });

  const kpis = [
    {
      metric: "Total Invoice Count",
      formula: "'Daily Invoicing Template'!C13",
      fmt: "#,##0",
      source: "Daily Invoicing (7 Branches Sum)"
    },
    {
      metric: "Total Branch Invoicing Amount",
      formula: "'Daily Invoicing Template'!D13",
      fmt: "₹ #,##0",
      source: "Daily Invoicing (7 Branches Sum)"
    },
    {
      metric: "Total Pending LRs",
      formula: "'Daily Invoicing Template'!E13",
      fmt: "#,##0",
      source: "Daily Invoicing (7 Branches Sum)"
    },
    {
      metric: "Total Sundry Debtors",
      formula: "'Sundry Debtors Template'!E6",
      fmt: "₹ #,##0",
      source: "Sundry Debtors (Section 22)"
    },
    {
      metric: "Direct Income Total",
      formula: "'Direct Income Template'!B6",
      fmt: "₹ #,##0",
      source: "Direct Income Single Head"
    }
  ];

  kpis.forEach((kpi, idx) => {
    const rNum = 5 + idx;
    const row = ws.getRow(rNum);
    row.values = [kpi.metric, { formula: kpi.formula, result: 0 }, kpi.source];
    row.height = 22;

    const isEven = idx % 2 === 0;
    const bgFill = isEven ? "FFFFFFFF" : "FFF8FAFC";

    const c1 = row.getCell(1);
    c1.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
    c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgFill } };
    c1.border = thinBorder;

    const c2 = row.getCell(2);
    c2.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E3A8A" } };
    c2.numFmt = kpi.fmt;
    c2.alignment = { horizontal: "right", vertical: "middle" };
    c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgFill } };
    c2.border = thinBorder;

    const c3 = row.getCell(3);
    c3.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF64748B" } };
    c3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgFill } };
    c3.border = thinBorder;
  });

  // Grand Total Revenue Row
  const gRow = ws.getRow(10);
  gRow.values = [
    "GRAND TOTAL REVENUE (BRANCH + SUNDRY + DIRECT)",
    { formula: "'Daily Invoicing Template'!D13 + 'Sundry Debtors Template'!E6 + 'Direct Income Template'!B6", result: 0 },
    "Cross-Module Grand Sum"
  ];
  gRow.height = 28;
  gRow.eachCell((cell, colNum) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF1E3A8A" } };
    cell.border = doubleBottomBorder;
    if (colNum === 2) {
      cell.numFmt = "₹ #,##0";
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  });

  return ws;
}

/**
 * Builds the Instructions & User Guide worksheet for the master workbook
 */
export function buildInstructionsSheet(wb) {
  const ws = wb.addWorksheet("Instructions & Guide", {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: "FF64748B" } }
  });

  ws.columns = [
    { key: "section", width: 26 },
    { key: "rule", width: 70 }
  ];

  ws.mergeCells("A1:B1");
  const r1 = ws.getCell("A1");
  r1.value = "📖 AYAN — TRANSPORT INVOICING OPERATIONAL USER MANUAL";
  r1.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  r1.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 32;

  ws.getRow(2).height = 10;

  const guide = [
    ["Module Purpose", "Daily branch-wise transport invoicing, pending LR tracking, sundry debtors, and direct income."],
    ["Authorized Branches", "Only 7 official branches: ICD Khodiyar, ICD Sanand, ICD Mundra, ICD Airport, ICD Hazira, ICD Sachana, ICD Baroda."],
    ["Branch Invoicing Rules", "Invoice Count and Pending LRs must be non-negative integers. Invoice Amount must be non-negative currency in ₹."],
    ["Sundry Debtors (Sec 22)", "Three categories: 1) Direct Party, 2) Suraj Forwarders Pvt. Ltd., 3) Additional Transporter."],
    ["Direct Income Rules", "Single consolidated amount head for miscellaneous transport direct earnings."],
    ["Upload Process", "Go to Web Application -> Transport Invoicing -> Click 'Upload Excel'. Drag & drop this filled file."],
    ["Validation & Preview", "The system will check for errors, highlight modified figures vs database, and require confirmation."],
    ["Support & Security", "Isolated user-wise access: records submitted by Ayan are stored with user_id and username."]
  ];

  guide.forEach((g, idx) => {
    const rNum = 3 + idx;
    const row = ws.getRow(rNum);
    row.values = [g[0], g[1]];
    row.height = 24;

    const c1 = row.getCell(1);
    c1.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E293B" } };
    c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    c1.border = thinBorder;

    const c2 = row.getCell(2);
    c2.font = { name: "Segoe UI", size: 10, color: { argb: "FF334155" } };
    c2.border = thinBorder;
  });

  return ws;
}

/**
 * 1. Generate Daily Template Buffer
 */
export async function generateDailyTemplateBuffer(date = null) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Suraj Forwarders Pvt. Ltd.";
  wb.created = new Date();
  buildDailyInvoicingSheet(wb, date);
  return await wb.xlsx.writeBuffer();
}

/**
 * 2. Generate Sundry Debtors Template Buffer
 */
export async function generateSundryTemplateBuffer(date = null) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Suraj Forwarders Pvt. Ltd.";
  wb.created = new Date();
  buildSundryDebtorsSheet(wb, date);
  return await wb.xlsx.writeBuffer();
}

/**
 * 3. Generate Direct Income Template Buffer
 */
export async function generateDirectIncomeTemplateBuffer(date = null) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Suraj Forwarders Pvt. Ltd.";
  wb.created = new Date();
  buildDirectIncomeSheet(wb, date);
  return await wb.xlsx.writeBuffer();
}

/**
 * 4. Generate Master Multi-Sheet Workbook Buffer
 */
export async function generateMasterWorkbookBuffer(date = null) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Suraj Forwarders Pvt. Ltd.";
  wb.created = new Date();

  buildDailyInvoicingSheet(wb, date);
  buildSundryDebtorsSheet(wb, date);
  buildDirectIncomeSheet(wb, date);
  buildSummaryDashboardSheet(wb, date);
  buildInstructionsSheet(wb);

  return await wb.xlsx.writeBuffer();
}

import fs from 'fs';
import path from 'path';

const logoBase64 = fs.readFileSync('C:\\eximdev\\server\\scratch\\suraj_logo_base64.txt', 'utf8').trim();
const signatureBase64 = fs.readFileSync('C:\\eximdev\\server\\scratch\\signature_base64.txt', 'utf8').trim();

const fileContent = `import { jsPDF } from 'jspdf';
import moment from 'moment';

const surajLogoBase64 = "${logoBase64}";
const signatureBase64 = "${signatureBase64}";

// Recalculates gross, LOP, overtime, arrears/bonus, statutory deductions and net pay
export const computePay = (employee, entry) => {
  const basic = entry.basic_amount || 0;
  const otHours = entry.total_overtime_hours || 0;
  const otRate = entry.ot_rate_snapshot || 0;
  const otPay = otHours * otRate;

  // LOP (Loss of pay)
  const absentDays = entry.absent_days || 0;
  const totalDays = entry.total_days_in_month || 30;
  const dailyRate = totalDays > 0 ? basic / totalDays : 0;
  const lop = absentDays * dailyRate;

  // Adjustments (Arrears/Bonus/Deductions)
  const adjustments = entry.adjustment_amount || 0;

  // Recalculated Gross
  const gross = basic + otPay + (adjustments > 0 ? adjustments : 0) - lop;

  // Recalculate Statutory Deductions
  // PF: 12% of basic
  const pf = entry.pf_employee || (basic > 0 ? Math.round(basic * 0.12) : 0);
  // ESI: 0.75% of gross if gross <= 21000
  const esi = entry.esi_employee || (gross <= 21000 ? Math.round(gross * 0.0075) : 0);
  // PT: standard professional tax
  const pt = entry.professional_tax || (gross > 10000 ? 200 : 0);

  const deductions = pf + esi + pt + (adjustments < 0 ? Math.abs(adjustments) : 0);
  const netPay = gross - deductions;

  return {
    basic,
    otPay,
    lop,
    adjustments,
    gross,
    pf,
    esi,
    pt,
    deductions,
    netPay
  };
};

// Helper to convert number to Indian currency words
function priceInWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\\d{2})(\\d{2})(\\d{2})(\\d{1})(\\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4]]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'only ' : '';
  return 'Rupees ' + str;
}

const formatCurrency = (v) => {
  return 'Rs. ' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Mask bank account helper
const maskBankAccount = (acNo) => {
  if (!acNo) return '—';
  const str = String(acNo);
  if (str.length > 4) {
    return '••••••••' + str.slice(-4);
  }
  return '••••••••';
};

// Helper to draw mock QR code dynamically
const drawMockQRCode = (doc, x, y, size) => {
  doc.setFillColor(0, 0, 0);
  doc.rect(x, y, size, size, 'F'); // black background

  // draw white inner space
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 1, y + 1, size - 2, size - 2, 'F');

  // Draw three corner markers (top-left, top-right, bottom-left)
  const markerSize = size * 0.25;
  const drawMarker = (mx, my) => {
    doc.setFillColor(0, 0, 0);
    doc.rect(mx, my, markerSize, markerSize, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(mx + 0.6, my + 0.6, markerSize - 1.2, markerSize - 1.2, 'F');
    doc.setFillColor(0, 0, 0);
    doc.rect(mx + 1.2, my + 1.2, markerSize - 2.4, markerSize - 2.4, 'F');
  };

  drawMarker(x + 1.5, y + 1.5); // top-left
  drawMarker(x + size - markerSize - 1.5, y + 1.5); // top-right
  drawMarker(x + 1.5, y + size - markerSize - 1.5); // bottom-left

  // Draw some random black pixels in the rest of the QR code
  doc.setFillColor(0, 0, 0);
  const pixelSize = 0.8;
  const startX = x + 1.5;
  const startY = y + 1.5;
  const endX = x + size - 1.5;
  const endY = y + size - 1.5;

  for (let px = startX; px < endX; px += pixelSize) {
    for (let py = startY; py < endY; py += pixelSize) {
      // Skip corner markers area
      const inTopLeft = (px < startX + markerSize + 1 && py < startY + markerSize + 1);
      const inTopRight = (px > endX - markerSize - 1 && py < startY + markerSize + 1);
      const inBottomLeft = (px < startX + markerSize + 1 && py > endY - markerSize - 1);

      if (!inTopLeft && !inTopRight && !inBottomLeft) {
        if (Math.random() > 0.5) {
          doc.rect(px, py, pixelSize, pixelSize, 'F');
        }
      }
    }
  }
};

const getFinancialYearRange = (year, monthStr) => {
  const month = parseInt(monthStr, 10);
  return month >= 4 ? year : year - 1;
};

// Compute YTD stats from history
export const computeYTDStatsFromHistory = (history, activeSummary) => {
  if (!history || history.length === 0 || !activeSummary) {
    return null;
  }
  const emp = activeSummary.employee_id || {};
  const activeFY = getFinancialYearRange(activeSummary.payroll_year, activeSummary.payroll_month);

  let gross = 0;
  let deductions = 0;
  let net = 0;
  let pf = 0;
  let esi = 0;
  let tds = 0;

  history.forEach(s => {
    const sFY = getFinancialYearRange(s.payroll_year, s.payroll_month);
    if (sFY === activeFY) {
      const sDate = s.payroll_year * 12 + s.payroll_month;
      const activeDate = activeSummary.payroll_year * 12 + activeSummary.payroll_month;
      if (sDate <= activeDate) {
        const comp = computePay(emp, s);
        gross += comp.gross || 0;
        deductions += comp.deductions || 0;
        net += comp.netPay || 0;
        pf += comp.pf || 0;
        esi += comp.esi || 0;
        tds += s.tds || 0;
      }
    }
  });

  return { gross, deductions, net, pf, esi, tds };
};

// Helper to draw a unified card with a soft drop shadow
const drawCardWithShadow = (doc, x, y, w, h) => {
  // Draw soft offset shadow (Slate 100)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(x + 0.4, y + 0.4, w, h, 2, 2, 'F');

  // Draw white card body with light border (Slate 200)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
};

// Helper to draw a card header background bar matching the card top rounding
const drawCardHeader = (doc, x, y, w, primaryColor) => {
  doc.setFillColor(...primaryColor);
  doc.roundedRect(x, y, w, 8, 2, 2, 'F');
  doc.rect(x, y + 4, w, 4, 'F'); // flatten bottom
};

// Generates A4 PDF using jsPDF with encryption
export const generatePayslipPDF = async (summary, companyInfo = {}, password = null, passwordRuleLabel = '', ytdStats = null) => {
  const emp = summary.employee_id || {};
  const computed = computePay(emp, summary);

  const primaryColor = [15, 23, 42]; // Slate 900 (neutral brand navy/charcoal)
  const secondaryColor = [115, 115, 115]; // Neutral Gray 500 (completely non-blue)
  const lightBg = [248, 250, 252]; // Slate 50
  const borderColor = [226, 232, 240]; // Slate 200

  // Initialize jsPDF with encryption settings
  const doc = new jsPDF({
    encryption: password ? {
      userPassword: password,
      ownerPassword: 'admin-payroll-owner-secret',
      userPermissions: ['print']
    } : undefined
  });

  // ─── Top Border Bar ──────────────────────────────────────────
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 4, 'F');

  // ─── Company branding (Original Color Logo) ───────────
  doc.addImage(surajLogoBase64, 'PNG', 10, 8, 48, 20);

  // Grey vertical divider line
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.4);
  doc.line(64, 8, 64, 28);

  // Company details
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(...primaryColor);
  doc.text('Suraj Group of Companies', 68, 12);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...secondaryColor);
  const addressLines = [
    '503, 5th Floor, Satyamev Epitome,',
    'Nr. Kargil Petrol Pump, S.G. Highway,',
    'Ahmedabad - 380015, Gujarat, India',
    'CIN: U74999GJ2016PTC093040'
  ];
  doc.text(addressLines[0], 68, 16.5);
  doc.text(addressLines[1], 68, 20.5);
  doc.text(addressLines[2], 68, 24.5);
  doc.text(addressLines[3], 68, 28.5);

  // ─── SALARY SLIP Pill ──────────────────────────────────────────
  doc.setFillColor(...primaryColor);
  doc.roundedRect(144, 8, 56, 7.5, 1.5, 1.5, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SALARY SLIP', 172, 13.3, { align: 'center' });

  // Salary slip period metadata
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryColor);
  const periodText = moment(summary.payroll_year + '-' + summary.payroll_month + '-01').format('MMMM - YYYY').toUpperCase();
  
  doc.setFont('Helvetica', 'bold'); doc.text('For the Month of', 144, 20);
  doc.text(':', 170, 20);
  doc.setFont('Helvetica', 'normal'); doc.text(periodText, 173, 20);

  const slipNo = summary.payslip_no || summary.payslip_number || ('PAY/' + String(summary.payroll_month).padStart(2, '0') + '/' + summary.payroll_year + '/' + String(emp.employee_code || '').slice(-4));
  doc.setFont('Helvetica', 'bold'); doc.text('Pay Slip No.', 144, 24.5);
  doc.text(':', 170, 24.5);
  doc.setFont('Helvetica', 'normal'); doc.text(slipNo, 173, 24.5);

  const payDate = summary.pay_date ? moment(summary.pay_date).format('DD-MMMM-YYYY') : moment(summary.payroll_year + '-' + summary.payroll_month + '-01').endOf('month').format('DD-MMMM-YYYY');
  doc.setFont('Helvetica', 'bold'); doc.text('Pay Date', 144, 29);
  doc.text(':', 170, 29);
  doc.setFont('Helvetica', 'normal'); doc.text(payDate, 173, 29);

  // Divider Line
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.line(10, 34, 200, 34);

  // ─── Side-by-Side Details Cards ─────────────────────────────────
  // Card 1: Employee Details (X = 10 to 128, width = 118, height = 52)
  drawCardWithShadow(doc, 10, 37, 118, 52);
  drawCardHeader(doc, 10, 37, 118, primaryColor);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('EMPLOYEE DETAILS', 14, 42.5);

  // Fields Left
  const dojVal = emp.joining_date || emp.date_of_joining;
  const doj = dojVal ? moment(dojVal).format('DD-MMM-YYYY') : '—';
  const fieldsLeft = [
    { label: 'Employee ID', value: emp.employee_code || '—' },
    { label: 'Employee Name', value: ((emp.first_name || '') + ' ' + (emp.last_name || '')).trim() },
    { label: 'Designation', value: emp.designation || '—' },
    { label: 'Department', value: emp.department || '—' },
    { label: 'Date of Joining', value: doj },
    { label: 'Work Location', value: emp.work_location || 'Ahmedabad (HO)' },
    { label: 'PAN No.', value: emp.pan_no || '—' },
    { label: 'UAN No.', value: emp.uan_number || '—' },
    { label: 'PF No.', value: emp.pf_no || '—' },
    { label: 'ESI No.', value: emp.esic_no || emp.esi_no || '—' }
  ];

  let fieldY = 50;
  const spacing = 3.8;
  fieldsLeft.forEach(f => {
    doc.setFont('Helvetica', 'normal'); // plain gray labels
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(7.5);
    doc.text(f.label, 14, fieldY);
    doc.text(':', 46, fieldY);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...primaryColor); // bold dark values
    doc.text(String(f.value), 49, fieldY);
    fieldY += spacing;
  });

  // Employee photo rendering (rounded-square crop with soft shadow)
  const photoX = 112; // Center X
  const photoY = 67; // Center Y
  const imgSize = 26; // 1:1 ratio
  const imgX = photoX - 13; // 99
  const imgY = photoY - 13; // 54

  const photoBase64 = emp.photoBase64;

  if (photoBase64) {
    try {
      // Soft shadow for photo box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(imgX + 0.4, imgY + 0.4, imgSize, imgSize, 2, 2, 'F');
      
      // Photo container
      doc.setFillColor(...lightBg);
      doc.roundedRect(imgX, imgY, imgSize, imgSize, 2, 2, 'FD');
      
      doc.addImage(photoBase64, 'PNG', imgX, imgY, imgSize, imgSize);
    } catch (err) {
      console.warn('Failed to add profile photo to pdf, falling back to avatar:', err);
      doc.setFillColor(203, 213, 225);
      doc.circle(photoX, photoY - 3, 4.5, 'F');
      doc.roundedRect(photoX - 8, photoY + 3.5, 16, 11, 2, 2, 'F');
    }
  } else {
    // Silhouette inside container
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(imgX + 0.4, imgY + 0.4, imgSize, imgSize, 2, 2, 'F');
    
    doc.setFillColor(...lightBg);
    doc.roundedRect(imgX, imgY, imgSize, imgSize, 2, 2, 'FD');
    
    doc.setFillColor(203, 213, 225);
    doc.circle(photoX, photoY - 3, 4.5, 'F');
    doc.roundedRect(photoX - 8, photoY + 3.5, 16, 11, 2, 2, 'F');
  }

  // Thin brand accent border (Navy outline instead of red)
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.4);
  doc.roundedRect(imgX, imgY, imgSize, imgSize, 2, 2, 'S');

  // Card 2: Bank Details (X = 134 to 200, width = 66, height = 52)
  drawCardWithShadow(doc, 134, 37, 66, 52);
  drawCardHeader(doc, 134, 37, 66, primaryColor);

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BANK DETAILS', 138, 42.5);

  // Fields Bank
  const fieldsBank = [
    { label: 'Bank Name', value: emp.bank_name || '—' },
    { label: 'Account No.', value: maskBankAccount(emp.bank_account_no) },
    { label: 'IFSC Code', value: emp.ifsc_code || emp.ifsc || '—' },
    { label: 'Branch', value: emp.bank_branch || 'S.G. Highway, Ahmedabad' }
  ];

  let bankY = 50;
  fieldsBank.forEach(f => {
    doc.setFont('Helvetica', 'normal'); // plain gray labels
    doc.setTextColor(...secondaryColor);
    doc.text(f.label, 138, bankY);
    doc.text(':', 159, bankY);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(...primaryColor); // bold dark values
    doc.text(String(f.value), 162, bankY);
    bankY += spacing;
  });

  // Payment Mode box (Slate card style matching the rest)
  doc.setDrawColor(...borderColor);
  doc.setFillColor(...lightBg);
  doc.setLineDash([2, 1]);
  doc.roundedRect(136, 69, 62, 11, 1.5, 1.5, 'FD');
  doc.setLineDash([]); // Reset dash

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...secondaryColor); // plain gray label
  doc.text('PAYMENT MODE', 139, 72.2);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(...primaryColor); // brand navy value
  doc.text(summary.payment_mode || 'Bank Transfer', 139, 77.2);

  // ─── Earnings & Deductions Tables (Dynamic heights) ──────────────
  let earnings = [];
  if (summary.earnings_breakup && summary.earnings_breakup.length > 0) {
    earnings = summary.earnings_breakup.map(item => ({ payhead: item.payhead, amount: item.amount }));
  } else {
    earnings = [
      { payhead: 'Basic Salary', amount: summary.basic_amount || 0 },
      { payhead: 'Overtime Pay', amount: computed.otPay || 0 }
    ];
    if (computed.lop > 0) {
      earnings.push({ payhead: 'Loss of Pay (LOP)', amount: -computed.lop });
    }
    if (computed.adjustments > 0) {
      earnings.push({ payhead: 'Adjustment / Bonus', amount: computed.adjustments });
    }
  }

  let deductions = [];
  if (summary.deductions_breakup && summary.deductions_breakup.length > 0) {
    deductions = summary.deductions_breakup.map(item => ({ payhead: item.payhead, amount: item.amount }));
  } else {
    deductions = [
      { payhead: 'Provident Fund (PF)', amount: computed.pf || 0 },
      { payhead: 'Employee State Ins (ESI)', amount: computed.esi || 0 },
      { payhead: 'Professional Tax (PT)', amount: computed.pt || 0 }
    ];
    if (summary.tds > 0) {
      deductions.push({ payhead: 'Income Tax (TDS)', amount: summary.tds });
    }
    if (summary.other_deductions > 0) {
      deductions.push({ payhead: summary.other_deduction_remarks || 'Other Deduction', amount: summary.other_deductions });
    }
    if (computed.adjustments < 0) {
      deductions.push({ payhead: 'Adjustment (Deduction)', amount: Math.abs(computed.adjustments) });
    }
  }

  // Calculate dynamic table height
  const maxRows = Math.max(earnings.length, deductions.length);
  const rowHeight = 5.5;
  const tableHeight = 8 + 6 + (maxRows * rowHeight) + 6; // header(8) + columnnames(6) + rows + total(6)

  // Tables start at Y = 93
  const tableY = 93;
  drawCardWithShadow(doc, 10, tableY, 92, tableHeight);
  drawCardWithShadow(doc, 108, tableY, 92, tableHeight);

  // 1. Earnings Table
  // Header bar
  doc.setFillColor(...primaryColor);
  doc.roundedRect(10, tableY, 92, 8, 2, 2, 'F');
  doc.rect(10, tableY + 4, 92, 4, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('EARNINGS', 14, tableY + 5.2);

  // Columns names
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Particulars', 13, tableY + 12);
  doc.text('Amount (Rs.)', 99, tableY + 12, { align: 'right' });
  doc.setDrawColor(...borderColor);
  doc.line(10, tableY + 14, 102, tableY + 14);

  // Rows
  let earnRowY = tableY + 14;
  for (let i = 0; i < maxRows; i++) {
    const item = earnings[i];
    doc.setDrawColor(241, 245, 249); // light divider
    doc.line(10, earnRowY + rowHeight, 102, earnRowY + rowHeight);

    if (item) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...primaryColor);
      doc.text(item.payhead, 13, earnRowY + 4);
      doc.text(formatCurrency(item.amount), 99, earnRowY + 4, { align: 'right' });
    }
    earnRowY += rowHeight;
  }

  // Earnings Total bottom row (Green total is kept for readability)
  const totalEarnY = tableY + 14 + (maxRows * rowHeight);
  doc.setFillColor(240, 253, 244); // Green 50
  doc.rect(10.25, totalEarnY, 91.5, 5.75, 'F');
  doc.setDrawColor(...borderColor);
  doc.line(10, totalEarnY, 102, totalEarnY);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61); // Green 700
  doc.text('TOTAL EARNINGS (A)', 13, totalEarnY + 4);
  doc.text(formatCurrency(computed.gross), 99, totalEarnY + 4, { align: 'right' });


  // 2. Deductions Table
  // Header bar
  doc.setFillColor(...primaryColor);
  doc.roundedRect(108, tableY, 92, 8, 2, 2, 'F');
  doc.rect(108, tableY + 4, 92, 4, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DEDUCTIONS', 112, tableY + 5.2);

  // Columns names
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Particulars', 111, tableY + 12);
  doc.text('Amount (Rs.)', 197, tableY + 12, { align: 'right' });
  doc.setDrawColor(...borderColor);
  doc.line(108, tableY + 14, 200, tableY + 14);

  // Rows
  let deductRowY = tableY + 14;
  for (let i = 0; i < maxRows; i++) {
    const item = deductions[i];
    doc.setDrawColor(241, 245, 249); // light divider
    doc.line(108, deductRowY + rowHeight, 200, deductRowY + rowHeight);

    if (item) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...primaryColor);
      doc.text(item.payhead, 111, deductRowY + 4);
      doc.text(formatCurrency(item.amount), 197, deductRowY + 4, { align: 'right' });
    }
    deductRowY += rowHeight;
  }

  // Deductions Total bottom row (Red total is kept for readability)
  const totalDeductY = tableY + 14 + (maxRows * rowHeight);
  doc.setFillColor(254, 242, 242); // Red 50
  doc.rect(108.25, totalDeductY, 91.5, 5.75, 'F');
  doc.setDrawColor(...borderColor);
  doc.line(108, totalDeductY, 200, totalDeductY);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(185, 28, 28); // Red 700
  doc.text('TOTAL DEDUCTIONS (B)', 111, totalDeductY + 4);
  doc.text(formatCurrency(computed.deductions), 197, totalDeductY + 4, { align: 'right' });

  // ─── Gross, Deductions, Net Payable Band Card ───────────────────
  const bandY = tableY + tableHeight + 4;
  drawCardWithShadow(doc, 10, bandY, 190, 13);

  // Vertical dividers
  doc.line(57, bandY, 57, bandY + 13);
  doc.line(105, bandY, 105, bandY + 13);
  doc.line(152, bandY, 152, bandY + 13);

  // 1. Gross Earnings (Green total kept for ease of reading)
  doc.setFontSize(7);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('GROSS EARNINGS (A)', 33.5, bandY + 4, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61); // Green 700
  doc.text(formatCurrency(computed.gross), 33.5, bandY + 9.8, { align: 'center' });

  // 2. Total Deductions (Red total kept for ease of reading)
  doc.setFontSize(7);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('TOTAL DEDUCTIONS (B)', 81, bandY + 4, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(185, 28, 28); // Red 700
  doc.text(formatCurrency(computed.deductions), 81, bandY + 9.8, { align: 'center' });

  // 3. Net Payable
  doc.setFontSize(7);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('NET PAYABLE (A - B)', 128.5, bandY + 4, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text(formatCurrency(computed.netPay), 128.5, bandY + 9.8, { align: 'center' });

  // 4. Amount in Words
  doc.setFontSize(7);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('AMOUNT IN WORDS', 176, bandY + 4, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  
  const wordsOnly = priceInWords(Math.round(computed.netPay)).replace('Rupees ', '').trim();
  const wordsOnlyFormatted = wordsOnly ? (wordsOnly.charAt(0).toUpperCase() + wordsOnly.slice(1) + '.') : '';
  const wordsLines = doc.splitTextToSize(wordsOnlyFormatted, 46);
  doc.text(wordsLines, 176, bandY + 8.5, { align: 'center' });

  // ─── Attendance Summary Card (Gridless alignment) ───────────────
  const attTableY = bandY + 13 + 4;
  drawCardWithShadow(doc, 10, attTableY, 190, 18);

  // Table header bar
  doc.setFillColor(...primaryColor);
  doc.roundedRect(10, attTableY, 190, 6, 2, 2, 'F');
  doc.rect(10, attTableY + 3, 190, 3, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ATTENDANCE SUMMARY', 14, attTableY + 4.2);

  // Subheaders (Col names)
  doc.setFillColor(...lightBg);
  doc.rect(10, attTableY + 6, 190, 6, 'F');
  doc.setFontSize(7.5);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...secondaryColor);

  const attHeaders = ['Total Days', 'Present Days', 'Paid Leave', 'LOP Days', 'Week Off', 'Holidays', 'Overtime (Hrs)'];
  const attValues = [
    summary.total_days_in_month || 30,
    summary.present_days || 0,
    summary.leave_days || 0,
    summary.absent_days || 0,
    summary.weekly_off_days || 0,
    summary.holiday_days || 0,
    (summary.total_overtime_hours || 0).toFixed(2)
  ];

  const colWidth = 190 / 7;
  for (let i = 0; i < 7; i++) {
    const colCenter = 10 + i * colWidth + colWidth / 2;
    doc.text(attHeaders[i], colCenter, attTableY + 10.2, { align: 'center' });
  }
  
  // Divider
  doc.setDrawColor(...borderColor);
  doc.line(10, attTableY + 12, 200, attTableY + 12);

  // Value row
  doc.setFontSize(7.5);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  for (let i = 0; i < 7; i++) {
    const colCenter = 10 + i * colWidth + colWidth / 2;
    doc.text(String(attValues[i]), colCenter, attTableY + 16.2, { align: 'center' });
  }

  // ─── Year To Date Summary Card (Gridless alignment) ─────────────
  const monthNum = parseInt(summary.payroll_month, 10);
  const startYear = monthNum >= 4 ? summary.payroll_year : summary.payroll_year - 1;
  const startMonthText = 'APR-' + startYear;
  const endMonthText = moment(summary.payroll_year + '-' + summary.payroll_month + '-01').format('MMM-YYYY').toUpperCase();

  const ytdTableY = attTableY + 18 + 4;
  drawCardWithShadow(doc, 10, ytdTableY, 190, 18);

  // Table header bar
  doc.setFillColor(...primaryColor);
  doc.roundedRect(10, ytdTableY, 190, 6, 2, 2, 'F');
  doc.rect(10, ytdTableY + 3, 190, 3, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(255, 255, 255);
  doc.text('YEAR TO DATE SUMMARY (' + startMonthText + ' TO ' + endMonthText + ')', 14, ytdTableY + 4.2);

  // Subheaders (Col names)
  doc.setFillColor(...lightBg);
  doc.rect(10, ytdTableY + 6, 190, 6, 'F');
  doc.setFontSize(7.2);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...secondaryColor);

  const ytdHeaders = ['Gross (Rs.)', 'Deductions (Rs.)', 'Net Salary (Rs.)', 'PF (Rs.)', 'ESI (Rs.)', 'TDS (Rs.)'];
  
  const grossYTD = (ytdStats && typeof ytdStats.gross === 'number') ? ytdStats.gross : computed.gross;
  const deductionsYTD = (ytdStats && typeof ytdStats.deductions === 'number') ? ytdStats.deductions : computed.deductions;
  const netYTD = (ytdStats && typeof ytdStats.net === 'number') ? ytdStats.net : computed.netPay;
  const pfYTD = (ytdStats && typeof ytdStats.pf === 'number') ? ytdStats.pf : computed.pf;
  const esiYTD = (ytdStats && typeof ytdStats.esi === 'number') ? ytdStats.esi : computed.esi;
  const tdsYTD = (ytdStats && typeof ytdStats.tds === 'number') ? ytdStats.tds : (summary.tds || 0);

  const ytdValues = [
    formatCurrency(grossYTD),
    formatCurrency(deductionsYTD),
    formatCurrency(netYTD),
    formatCurrency(pfYTD),
    formatCurrency(esiYTD),
    formatCurrency(tdsYTD)
  ];

  const ytdWidth = 190 / 6;
  for (let i = 0; i < 6; i++) {
    const colCenter = 10 + i * ytdWidth + ytdWidth / 2;
    doc.text(ytdHeaders[i], colCenter, ytdTableY + 10.2, { align: 'center' });
  }

  // Divider
  doc.line(10, ytdTableY + 12, 200, ytdTableY + 12);

  // Value row
  doc.setFontSize(7.2);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  for (let i = 0; i < 6; i++) {
    const colCenter = 10 + i * ytdWidth + ytdWidth / 2;
    doc.text(String(ytdValues[i]), colCenter, ytdTableY + 16.2, { align: 'center' });
  }

  // ─── Note, Signatures, Scan QR Card ─────────────────────────────
  const footerY = ytdTableY + 18 + 5;

  // 1. Company Authorised Signatory (Left)
  doc.setFontSize(8.2);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...secondaryColor);
  doc.text('COMPANY AUTHORISED SIGNATORY', 10, footerY + 4);

  doc.setFontSize(7.8);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Authorised Signatory', 10, footerY + 22);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Suraj Group of Companies', 10, footerY + 25.5);

  // 2. Note Card (Right-aligned with shadow, stretched to cover full remaining width)
  drawCardWithShadow(doc, 80, footerY, 120, 28);
  doc.setFontSize(7.8);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('NOTE:', 84, footerY + 4.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...secondaryColor);
  
  const notes = [
    'This is a system generated payslip and does not require any signature.',
    'Please keep this payslip confidential.',
    'For any queries, please contact HR Department.'
  ];
  doc.text('• ' + notes[0], 84, footerY + 9.5);
  doc.text('• ' + notes[1], 84, footerY + 15.5);
  doc.text('• ' + notes[2], 84, footerY + 21.5);

  // ─── Bottom Footer Bar (Symmetrical Top-Matching Border) ────────
  doc.setFillColor(...primaryColor);
  doc.rect(0, 293, 210, 4, 'F');

  // Return document instance
  return doc;
};
`;

fs.writeFileSync('C:\\eximdev\\client\\src\\lib\\payslip-pdf.js', fileContent);
console.log('Successfully updated C:\\eximdev\\client\\src\\lib\\payslip-pdf.js');

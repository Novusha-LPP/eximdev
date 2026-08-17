import { jsPDF } from 'jspdf';
import moment from 'moment';

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
  // PT: standard profesisonal tax
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
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
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
  return '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// Generates A4 PDF using jsPDF with encryption
export const generatePayslipPDF = async (summary, companyInfo = {}, password = null, passwordRuleLabel = '') => {
  const emp = summary.employee_id || {};
  const computed = computePay(emp, summary);

  // Initialize jsPDF with encryption settings
  const doc = new jsPDF({
    encryption: password ? {
      userPassword: password,
      ownerPassword: 'admin-payroll-owner-secret',
      userPermissions: ['print']
    } : undefined
  });

  const primaryColor = [15, 23, 42]; // Slate 900
  const secondaryColor = [71, 85, 105]; // Slate 600
  const lightBg = [248, 250, 252]; // Slate 50
  const borderColor = [226, 232, 240]; // Slate 200

  // ─── Top Border Bar ──────────────────────────────────────────
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 4, 'F');

  // ─── Company branding ─────────────────────────────────────────
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text(companyInfo.name || 'ALVISION EXIM PRIVATE LIMITED', 14, 20);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text(companyInfo.address || 'Corporate Office Address, Mumbai, India', 14, 25);

  doc.setDrawColor(...borderColor);
  doc.line(14, 30, 196, 30);

  // ─── Document Title ───────────────────────────────────────────
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  const periodText = moment(`${summary.payroll_year}-${summary.payroll_month}-01`).format('MMMM YYYY').toUpperCase();
  doc.text(`PAYSLIP FOR THE MONTH OF ${periodText}`, 14, 38);

  // ─── Employee Info Box (Statutory block, Bank is masked) ───────
  doc.setFillColor(...lightBg);
  doc.rect(14, 43, 182, 38, 'F');
  doc.rect(14, 43, 182, 38, 'S');

  doc.setFontSize(9);
  const leftColX = 18;
  const rightColX = 110;

  // Left Col
  doc.setFont('Helvetica', 'bold'); doc.text('Employee Name:', leftColX, 49);
  doc.setFont('Helvetica', 'normal'); doc.text(`${emp.first_name || ''} ${emp.last_name || ''}`.trim(), leftColX + 30, 49);

  doc.setFont('Helvetica', 'bold'); doc.text('Employee Code:', leftColX, 55);
  doc.setFont('Helvetica', 'normal'); doc.text(emp.employee_code || '—', leftColX + 30, 55);

  doc.setFont('Helvetica', 'bold'); doc.text('Department:', leftColX, 61);
  doc.setFont('Helvetica', 'normal'); doc.text(emp.department || '—', leftColX + 30, 61);

  doc.setFont('Helvetica', 'bold'); doc.text('Designation:', leftColX, 67);
  doc.setFont('Helvetica', 'normal'); doc.text(emp.designation || '—', leftColX + 30, 67);

  doc.setFont('Helvetica', 'bold'); doc.text('Joining Date:', leftColX, 73);
  const doj = emp.date_of_joining ? moment(emp.date_of_joining).format('DD/MM/YYYY') : '—';
  doc.setFont('Helvetica', 'normal'); doc.text(doj, leftColX + 30, 73);

  // Right Col (Bank Account stays masked)
  doc.setFont('Helvetica', 'bold'); doc.text('UAN / PF No:', rightColX, 49);
  doc.setFont('Helvetica', 'normal'); doc.text(emp.uan_number || emp.pf_no || '—', rightColX + 28, 49);

  doc.setFont('Helvetica', 'bold'); doc.text('ESI No:', rightColX, 55);
  doc.setFont('Helvetica', 'normal'); doc.text(emp.esic_no || '—', rightColX + 28, 55);

  doc.setFont('Helvetica', 'bold'); doc.text('PAN No:', rightColX, 61);
  doc.setFont('Helvetica', 'normal'); doc.text(emp.pan_no || '—', rightColX + 28, 61);

  doc.setFont('Helvetica', 'bold'); doc.text('Bank Name:', rightColX, 67);
  doc.setFont('Helvetica', 'normal'); doc.text(emp.bank_name || '—', rightColX + 28, 67);

  doc.setFont('Helvetica', 'bold'); doc.text('Account No:', rightColX, 73);
  doc.setFont('Helvetica', 'normal'); doc.text(maskBankAccount(emp.bank_account_no), rightColX + 28, 73);

  // ─── Attendance Summary ────────────────────────────────────────
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text('ATTENDANCE SUMMARY', 14, 90);

  doc.rect(14, 93, 182, 10);
  doc.line(55, 93, 55, 103);
  doc.line(95, 93, 95, 103);
  doc.line(145, 93, 145, 103);

  doc.setFontSize(9);
  doc.text(`Total Days: ${summary.total_days_in_month}`, 18, 99);
  doc.text(`Present Days: ${summary.present_days}`, 59, 99);
  doc.text(`Paid Leaves: ${summary.leave_days || 0}`, 99, 99);
  doc.text(`Payable Days: ${summary.payable_days}`, 149, 99);

  // ─── Earnings & Deductions Tables (Side-by-Side) ────────────────
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EARNINGS', 14, 113);
  doc.text('DEDUCTIONS', 110, 113);

  // Table boxes
  doc.rect(14, 116, 90, 60);
  doc.rect(106, 116, 90, 60);

  doc.setFillColor(...lightBg);
  doc.rect(14, 116, 90, 8, 'F');
  doc.rect(106, 116, 90, 8, 'F');

  doc.rect(14, 116, 90, 8, 'S');
  doc.rect(106, 116, 90, 8, 'S');

  doc.setFontSize(9);
  doc.text('Component', 18, 121);
  doc.text('Amount', 80, 121);
  doc.text('Component', 110, 121);
  doc.text('Amount', 172, 121);

  // Map earnings list
  const earnings = [
    { payhead: 'Basic + HRA', amount: computed.basic },
    { payhead: 'Overtime Pay', amount: computed.otPay }
  ];
  if (computed.lop > 0) {
    earnings.push({ payhead: 'LOP (Deducted)', amount: -computed.lop });
  }

  // Map deductions list
  const deductions = [
    { payhead: 'Provident Fund (PF)', amount: computed.pf },
    { payhead: 'Employee State Ins (ESI)', amount: computed.esi },
    { payhead: 'Professional Tax (PT)', amount: computed.pt }
  ];

  if (computed.adjustments > 0) {
    earnings.push({ payhead: 'Manual Adjustment (Bonus)', amount: computed.adjustments });
  } else if (computed.adjustments < 0) {
    deductions.push({ payhead: 'Manual Adjustment (Deduct)', amount: Math.abs(computed.adjustments) });
  }

  // Populate values
  doc.setFont('Helvetica', 'normal');
  let earnY = 130;
  earnings.forEach(item => {
    doc.text(item.payhead, 18, earnY);
    doc.text(formatCurrency(item.amount), 76, earnY);
    earnY += 6;
  });

  let deductY = 130;
  deductions.forEach(item => {
    doc.text(item.payhead, 110, deductY);
    doc.text(formatCurrency(item.amount), 168, deductY);
    deductY += 6;
  });

  // Dividers for total
  doc.line(14, 168, 104, 168);
  doc.line(106, 168, 196, 168);

  doc.setFont('Helvetica', 'bold');
  doc.text('Total Earnings:', 18, 173);
  doc.text(formatCurrency(computed.gross), 76, 173);

  doc.text('Total Deductions:', 110, 173);
  doc.text(formatCurrency(computed.deductions), 168, 173);

  // ─── Net Salary Band ──────────────────────────────────────────
  doc.setFillColor(...lightBg);
  doc.rect(14, 184, 182, 12, 'F');
  doc.rect(14, 184, 182, 12, 'S');

  doc.setFontSize(10);
  doc.setFont('Helvetica', 'bold');
  doc.text('NET PAYABLE SALARY:', 18, 192);
  doc.text(formatCurrency(computed.netPay), 150, 192);

  // Net Amount in words
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  const words = priceInWords(Math.round(computed.netPay));
  doc.text(`Amount in Words: ${words}`, 14, 202);

  // ─── Signatures block ──────────────────────────────────────────
  doc.line(14, 230, 70, 230);
  doc.line(140, 230, 196, 230);

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Employee Signature', 22, 235);
  doc.text('Authorized Signatory', 148, 235);

  // Footer notes (password rule and generation date)
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text('Note: This is a system-generated payslip and does not require a physical signature.', 14, 250);
  
  const genDate = moment().format('DD/MM/YYYY HH:mm');
  doc.text(`Generated on: ${genDate}`, 14, 255);
  if (password) {
    doc.text(`Security: Password protected with rule: ${passwordRuleLabel}`, 14, 260);
  }

  // Return document instance
  return doc;
};

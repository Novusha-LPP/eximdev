import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const downloadRabsPolicyBook = () => {
  const doc = new jsPDF();
  
  // Theme colors
  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [59, 130, 246]; // Blue 500
  
  // Header Helper
  const addHeader = (title) => {
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RABS EXIM PVT LTD', 15, 12);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Attendance & Payroll Policy Handbook', 15, 20);
    
    // Page Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...accentColor);
    doc.text(title, 15, 45);
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);
  };
  
  // Footer Helper
  const addFooter = (pageNum) => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('Confidential - For Internal RABS Employees Only', 15, 285);
    doc.text(`Page ${pageNum}`, 190, 285);
  };

  // --- Page 1: Cover ---
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 297, 'F');
  
  // Gold accent lines
  doc.setFillColor(...accentColor);
  doc.rect(15, 30, 3, 237, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(36);
  doc.text('RABS', 30, 80);
  doc.text('WELFARE POLICY', 30, 95);
  doc.text('HANDBOOK', 30, 110);
  
  doc.setFontSize(14);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('Automated Operations & Compliance Manual', 30, 125);
  
  doc.setFontSize(10);
  doc.text('Date of Issue: July 2026', 30, 220);
  doc.text('Version: 2.1 (Automated Shift System)', 30, 228);
  doc.text('Applicability: RABS Company Employees Only', 30, 236);
  
  // Page 2: Table of Contents & Section 1
  doc.addPage();
  addHeader('1. Executive Overview & 24-Hour Cycle');
  addFooter(2);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85); // Slate 700
  
  const text1 = `RABS Exim operates a dynamic, continuous 24-hour workspace environment. In order to cater to global export-import timelines, standard office-hour gating and buffer validations have been entirely removed for RABS personnel. 

Key Operational Rules:
1. 24-Hour Flexible Punching: Employees are authorized to check-in (Punch In) and check-out (Punch Out) at any time during a 24-hour cycle.
2. Shift Continuity: The system will automatically map the appropriate shift based on your entry time.
3. No Shift Gates: No lockouts or late-gate penalties apply to RABS flexible roles.
4. Auto-Closure: Sessions that exceed 24 hours without a checkout will be closed automatically under the timeout code 'timeout_24h' for administrative review.`;

  const splitText1 = doc.splitTextToSize(text1, 180);
  doc.text(splitText1, 15, 60);

  // Page 3: Shift Architecture & Autoresolver Table
  doc.addPage();
  addHeader('2. Shift Matrix & Resolution Algorithm');
  addFooter(3);
  
  const text2 = `RABS shifts are resolved dynamically by calculating the closest start-time proximity of the employee's check-in punch to the configured shift baselines.`;
  doc.text(doc.splitTextToSize(text2, 180), 15, 55);

  const tableData = [
    ['Morning Shift (MOR)', '09:00', '18:00', 'Active morning window'],
    ['General Shift (GEN)', '10:00', '19:00', 'Standard corporate hours'],
    ['Afternoon Shift (AFT)', '14:00', '23:00', 'Mid-day/Afternoon overlap'],
    ['Night Shift (NIG)', '20:00', '05:00', 'Overnight dispatch shift'],
    ['Housekeeping (HK)', '08:00', '17:00', 'Support & Facility shift']
  ];

  doc.autoTable({
    startY: 65,
    head: [['Shift Name', 'Start Time', 'End Time', 'Operational Scope']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: primaryColor },
    margin: { left: 15, right: 15 }
  });

  // Page 4: Compliance & Welfare Slabs
  doc.addPage();
  addHeader('3. Statutory Compliance & Welfare Slabs');
  addFooter(4);

  const text3 = `RABS adheres strictly to the central and state-specific statutory guidelines governing employee benefits and social security:

1. Provident Fund (PF): Contributed at 12% of the Basic salary, subject to the statutory ceiling of INR 15,000 per month.
2. Employee State Insurance (ESIC): Contribution of 0.75% (Employee) and 3.25% (Employer) applied for employees with gross monthly earnings under INR 21,000.
3. Professional Tax (PT): Applied in accordance with regional state slabs (e.g., Maharashtra PT rules).
4. Income Tax (TDS): Deduction governed by declaration submissions and investment proofs (80C, HRA, etc.) uploaded directly via S3 storage.`;

  doc.text(doc.splitTextToSize(text3, 180), 15, 60);

  doc.save('RABS_Employee_Policy_Book.pdf');
};

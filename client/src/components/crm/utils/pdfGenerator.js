import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Helper: Convert number to Indian currency words
function numberToIndianWords(num, prefix = 'Rupees') {
  const integerPart = Math.round(Number(num) || 0);
  if (integerPart === 0) return `${prefix} Zero Only`;

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const double = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n) {
    let str = '';
    if (n >= 100) {
      str += single[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += double[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += single[n] + ' ';
    }
    return str.trim();
  }

  let result = '';
  let tempNum = integerPart;

  // Crore
  if (tempNum >= 10000000) {
    result += convertLessThanThousand(Math.floor(tempNum / 10000000)) + ' Crore ';
    tempNum %= 10000000;
  }
  // Lakh
  if (tempNum >= 100000) {
    result += convertLessThanThousand(Math.floor(tempNum / 100000)) + ' Lakh ';
    tempNum %= 100000;
  }
  // Thousand
  if (tempNum >= 1000) {
    result += convertLessThanThousand(Math.floor(tempNum / 1000)) + ' Thousand ';
    tempNum %= 1000;
  }
  // Remaining
  if (tempNum > 0) {
    result += convertLessThanThousand(tempNum) + ' ';
  }

  return `${prefix} ${result.trim()} Only`;
}

const getTradeChargeRows = (tradeType = 'import') => {
  if (tradeType === 'export') {
    return [
      { label: 'Agency Charges', amount: 2200 },
      { label: 'Shipping Line Documentation Charges', amount: 1800 },
      { label: 'Customs Filing Charges', amount: 1200 },
      { label: 'EDI Charges', amount: 60 },
      { label: 'CFS / Gate Charges', amount: 13000 },
      { label: 'Transport to Port / ICD', amount: 9500 },
      { label: 'Terminal Handling Charges', amount: 6000 },
      { label: 'Lift on / Lift off Charges', amount: 1800 },
      { label: 'Seal / Security Charges', amount: 1200 },
      { label: 'Documentation / Insurance', amount: 1500 }
    ];
  }

  return [
    { label: 'Agency Charges', amount: 2750 },
    { label: 'VGM/ESB/FORM-13 filing through ODEX/MMD3', amount: 1500 },
    { label: 'Certificate of Origin - Non Preferential', amount: 500 },
    { label: 'EDI Charges', amount: 70 },
    { label: 'CFS charges at MUNDRA', amount: 15000 },
    { label: 'Unseal for Non Factory stuffing permission', amount: 8000 },
    { label: 'Transportation charges (ICD Khediyari to Amman)', amount: 10000 },
    { label: 'Lift on lift off charges', amount: 2000 },
    { label: 'Detention Charges', amount: 1500 },
    { label: 'Transportation charges (Amman to Mundra)', amount: 25000 },
    { label: 'Loaded Container Shifting charges', amount: 5000 }
  ];
};

// ─── Format 2: Paramount Propack Estimate PDF (ESTIMATE format) ───
const buildParamountEstimatePDF = (doc, quote) => {
  const pageWidth = 210;
  const pageHeight = 297;
  const m = 10;
  const cw = pageWidth - 2 * m; // 190

  // 1. Outer Border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(m, m, cw, pageHeight - 2 * m);

  // 2. Header
  // Paramount Logo: Red Rounded Square with White 'P'
  doc.setFillColor(225, 29, 72); // Rose/Red
  doc.roundedRect(14, 14, 11, 11, 1.8, 1.8, 'F');

  // White inner P graphic
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.7);
  doc.line(17.5, 16.5, 17.5, 22.5);
  doc.roundedRect(17.5, 16.5, 4.5, 3.2, 0.8, 0.8, 'S');

  // Text beside logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text('PARAMOUNT', 28, 18);
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PROPACK PVT. LTD.', 28, 21.5);

  // Company Address Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Paramount Propack Pvt Ltd', 55, 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('A-306, Wall Street 2, Opp. Orient Club,', 55, 18.5);
  doc.text('Nr. Gujarat College, Ellis Bridge,', 55, 22);
  doc.text('Ahmedabad 380006', 55, 25.5);
  doc.text('India. Phone : 9924304363, Mo.9924330777', 55, 29);
  doc.setFont('helvetica', 'bold');
  doc.text('GSTIN 24AAHCP4599D1Z8', 55, 33);

  // Title: ESTIMATE (Top Right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42);
  doc.text('ESTIMATE', pageWidth - m - 4, 27, { align: 'right' });

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(m, 39, pageWidth - m, 39);

  // 3. Meta Row
  const qDate = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('en-GB') : '27/04/2026';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('#', 14, 43.5);
  doc.text(`: ${quote.quoteNumber || 'EST-822'}`, 34, 43.5);

  doc.text('Place Of Supply', 110, 43.5);
  doc.text(`: ${quote.placeOfSupply || 'Gujarat (24)'}`, 145, 43.5);

  doc.text('Estimate Date', 14, 47.5);
  doc.text(`: ${qDate}`, 34, 47.5);

  doc.line(m, 50, pageWidth - m, 50);

  // 4. Bill To Section
  doc.setFillColor(248, 250, 252);
  doc.rect(m, 50, cw, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Bill To', 14, 54.2);

  doc.line(m, 56, pageWidth - m, 56);

  const accName = quote.accountId?.name || 'Alza Global';
  const contactName = quote.contactId ? `${quote.contactId.firstName} ${quote.contactId.lastName || ''}`.trim() : (quote.description || 'Mr. Rohit Jain');
  const billAddress = quote.billToAddress || 'Ahmedabad\n382470 Gujarat\nIndia';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(accName, 14, 62);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(contactName, 14, 66.5);
  doc.text(billAddress, 14, 71, { maxWidth: 170 });

  doc.line(m, 82, pageWidth - m, 82);

  // 5. Items Table
  const tableHeaders = [
    [
      { content: '#', styles: { halign: 'center' } },
      { content: 'Item & Description', styles: { halign: 'left' } },
      { content: 'HSN\n/SAC', styles: { halign: 'center' } },
      { content: 'Qty', styles: { halign: 'right' } },
      { content: 'Rate', styles: { halign: 'right' } },
      { content: '%\nCGST', styles: { halign: 'center' } },
      { content: 'Amt\nCGST', styles: { halign: 'right' } },
      { content: '%\nSGST', styles: { halign: 'center' } },
      { content: 'Amt\nSGST', styles: { halign: 'right' } },
      { content: 'Amount', styles: { halign: 'right' } }
    ]
  ];

  let rawItems = quote.lineItems || [];
  if (rawItems.length === 0) {
    rawItems = [
      { productName: '600 x 400 x 150\nFlat Bottom, Closed Handle,\nBlue', hsnSac: '39231030', quantity: 1000, unitPrice: 464, tax: 18 },
      { productName: '600/400 - LID', hsnSac: '392310', quantity: 1000, unitPrice: 220, tax: 18 }
    ];
  }

  let subTotal = 0;
  let totalCGST = 0;
  let totalSGST = 0;

  const tableBody = rawItems.map((it, idx) => {
    const qty = Number(it.quantity || 1);
    const rate = Number(it.unitPrice || 0);
    const amount = qty * rate;
    const taxRate = it.tax !== undefined ? Number(it.tax) : 18;
    const halfTax = taxRate / 2;
    const cgstAmt = amount * (halfTax / 100);
    const sgstAmt = amount * (halfTax / 100);

    subTotal += amount;
    totalCGST += cgstAmt;
    totalSGST += sgstAmt;

    return [
      String(idx + 1),
      it.productName || 'Plastic Crate Product',
      it.hsnSac || '392310',
      qty.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      rate.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      `${halfTax}%`,
      cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      `${halfTax}%`,
      sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })
    ];
  });

  const grandTotal = subTotal + totalCGST + totalSGST;

  doc.autoTable({
    startY: 82,
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontSize: 7.5,
      fontStyle: 'bold',
      lineWidth: 0.15,
      lineColor: [200, 200, 200],
      cellPadding: 1.5
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      lineWidth: 0.15,
      lineColor: [200, 200, 200],
      cellPadding: 1.5
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 54, halign: 'left' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 16, halign: 'right' },
      4: { cellWidth: 16, halign: 'right' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 12, halign: 'center' },
      8: { cellWidth: 18, halign: 'right' },
      9: { cellWidth: 18, halign: 'right' }
    },
    margin: { left: m, right: m }
  });

  const finalY = doc.lastAutoTable.finalY + 4;
  doc.line(125, finalY, pageWidth - m, finalY);

  // 6. Summary Section
  // Left Side: In Words, Notes, Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Total In Words', 14, finalY + 5);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(numberToIndianWords(grandTotal, 'Rupees'), 14, finalY + 9.5, { maxWidth: 105 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Notes', 14, finalY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(quote.terms?.notes || 'Looking forward for your business.', 14, finalY + 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Terms & Conditions', 14, finalY + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  const terms = [
    `Payment Terms: ${quote.terms?.paymentTerms || '100% Advance'}.`,
    'Freight charges will be extra.',
    'Delivery Within 10 -12 Working Days.',
    'Prices: The price is quoted in INR.',
    'Bank Detail: Kotak Mahindra Bank,',
    'Branch: Chandan House, Opp.Abhijit 3, Ahmedabad.',
    'A/c. No.1512264287, IFSC Code : KKBK0000812',
    'Other Detail: PAN No. AAHCP4599D',
    'GSTIN No.- 24AAHCP4599D1Z8'
  ];
  terms.forEach((t, i) => {
    doc.text(t, 14, finalY + 32.5 + i * 4);
  });

  // Right Side: Totals Box & Signature
  const rX = 125;
  const valX = pageWidth - m - 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Sub Total', rX + 4, finalY + 5);
  doc.text(subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), valX, finalY + 5, { align: 'right' });

  doc.text('CGST9 (9%)', rX + 4, finalY + 10);
  doc.text(totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2 }), valX, finalY + 10, { align: 'right' });

  doc.text('SGST9 (9%)', rX + 4, finalY + 15);
  doc.text(totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2 }), valX, finalY + 15, { align: 'right' });

  doc.line(rX, finalY + 17.5, pageWidth - m, finalY + 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Total', rX + 4, finalY + 22.5);
  doc.text(`Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, valX, finalY + 22.5, { align: 'right' });

  doc.line(rX, finalY + 25.5, pageWidth - m, finalY + 25.5);

  // Authorized Signature Box
  const sigBoxY = finalY + 28;
  doc.rect(rX, sigBoxY, pageWidth - m - rX, 35);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Authorized Signature', rX + (pageWidth - m - rX) / 2, sigBoxY + 31, { align: 'center' });
};

// ─── Format 1: SURAJ FORWARDERS PVT. LTD. (Import / Export Invoice & Quotation Format) ───
const buildSurajQuotePDF = (doc, quote) => {
  const pageWidth = 210;
  const pageHeight = 297;
  const m = 7;
  const cw = pageWidth - 2 * m; // 196

  // 1. Outer Border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(m, m, cw, pageHeight - 2 * m);

  // 2. Header Section
  // Sun Logo on left
  const logoCenterX = 18;
  const logoCenterY = 17;
  doc.setFillColor(234, 88, 12); // Orange / Sun Red
  doc.circle(logoCenterX, logoCenterY, 3.2, 'F');

  // Sun Rays
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.6);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const x1 = logoCenterX + Math.cos(angle) * 4.2;
    const y1 = logoCenterY + Math.sin(angle) * 4.2;
    const x2 = logoCenterX + Math.cos(angle) * 6.2;
    const y2 = logoCenterY + Math.sin(angle) * 6.2;
    doc.line(x1, y1, x2, y2);
  }

  // Logo Brand Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('SURAJ', 28, 17.5);
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text('FORWARDERS PVT. LTD.', 28, 20.5);

  // Center Header Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(0, 0, 0);
  doc.text('SURAJ FORWARDERS PVT. LTD.', 112, 12.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(30, 41, 59);
  doc.text('A/204-205, WALL STREET II, OPP. ORIENT CLUB, NR. GUJARAT COLLEGE, ELLIS BRIDGE, AHMEDABAD - 380006.', 112, 16, { align: 'center' });
  doc.text('Contact : 07926402005 | E-Mail : account@surajforwarders.com | www.surajforwarders.com', 112, 19.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text('GSTIN : 24AAKCS6838D1Z8          State : [24] GUJARAT', 112, 23, { align: 'center' });
  doc.text('PAN No : AAKCS6838D              CIN : U63090GJ2007PTC050253', 112, 26.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('MSME : UDYAM : GJ-01-0010319 (Small Services)', 112, 30, { align: 'center' });

  // Right QR Placeholder Box
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(180, 8.5, 21, 22.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('e-INVOICE', 190.5, 14, { align: 'center' });
  doc.text('QR VERIFIED', 190.5, 17, { align: 'center' });
  doc.setDrawColor(80, 80, 80);
  doc.rect(184, 19, 13, 10);
  doc.setFontSize(4.5);
  doc.text('SURAJ IRN', 190.5, 25, { align: 'center' });

  // Divider below header
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(m, 32.5, pageWidth - m, 32.5);

  // 3. Reference Strip
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('ACK', 9, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.quoteNumber || '162625115562138'}`, 18, 36);

  doc.setFont('helvetica', 'bold');
  doc.text('IRN', 65, 36);
  doc.setFont('helvetica', 'normal');
  const irn = String(quote._id || quote.quoteNumber || 'cc7255fee7d5ad1daea18f08ce70134622f1811babe4b2c0e2bf92e42681e7b6');
  doc.text(`: ${irn.length > 50 ? irn.substring(0, 50) + '...' : irn}`, 72, 36);

  doc.line(m, 38, pageWidth - m, 38);

  // 4. Two-Column Metadata Box
  doc.line(105, 38, 105, 84); // Vertical Center Divider

  // Customer Details (Left)
  const custName = quote.accountId?.name || 'CADILA PHARMACEUTICALS LTD';
  const custAddress = quote.billToAddress || '1389, TRASAD ROAD, DHOLKA';
  const custPan = quote.accountId?.pan || quote.panNo || 'AAACC6251E';
  const custGstin = quote.accountId?.gstin || quote.gstin || '24AAACC6251E1Z5';
  const custState = quote.placeOfSupply || 'Gujarat-24';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Customer', 9, 41.5);
  doc.setFontSize(8);
  doc.text(custName, 9, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(custAddress, 9, 48.5, { maxWidth: 94 });
  doc.setFont('helvetica', 'bold');
  doc.text(`PAN No : ${custPan}`, 9, 53.5);
  doc.text(`GSTIN : ${custGstin}     State : ${custState}`, 9, 57);

  // Horizontal sub-divider in left column
  doc.line(m, 59, 105, 59);

  // Consignment Details (Left Bottom)
  const beNum = quote.beNumber || '9988930';
  const beDate = quote.beDate || '19-Jun-26';
  const mblNo = quote.mblNo || '15763249900';
  const mblDate = quote.mblDate || '17-Jun-26';
  const hblNo = quote.hblNo || '1075291239';
  const hblDate = quote.hblDate || '17-Jun-26';
  const customHouse = quote.opportunityId?.pod || 'AHMEDABAD AIR CARGO';
  const vessel = quote.opportunityId?.shippingLine || 'QR0132';
  const originPort = quote.opportunityId?.pol || 'ROME';
  const pkgs = quote.packages || '4.560 KGS';
  const grossWt = quote.opportunityId?.containerWeight || '5601.600';

  doc.setFont('helvetica', 'bold');
  doc.text('BE Number', 9, 62.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${beNum}`, 32, 62.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', 66, 62.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${beDate}`, 76, 62.5);

  doc.setFont('helvetica', 'bold');
  doc.text('BE Type', 9, 66);
  doc.setFont('helvetica', 'normal');
  doc.text(': Home', 32, 66);

  doc.setFont('helvetica', 'bold');
  doc.text('MBL No.', 9, 69.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${mblNo}`, 32, 69.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', 66, 69.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${mblDate}`, 76, 69.5);

  doc.setFont('helvetica', 'bold');
  doc.text('HBL No.', 9, 73);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${hblNo}`, 32, 73);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', 66, 73);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${hblDate}`, 76, 73);

  doc.setFont('helvetica', 'bold');
  doc.text('Consignment Type', 9, 76.5);
  doc.setFont('helvetica', 'normal');
  doc.text(':', 32, 76.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Packages', 66, 76.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${pkgs}`, 78, 76.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Gross Weight', 9, 80);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${grossWt}`, 32, 80);
  doc.setFont('helvetica', 'bold');
  doc.text('Net Wt.', 66, 80);
  doc.setFont('helvetica', 'normal');
  doc.text(': —', 78, 80);

  doc.setFont('helvetica', 'bold');
  doc.text('Custom House', 9, 83.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${customHouse}`, 32, 83.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Chg. Wt.', 66, 83.5);
  doc.setFont('helvetica', 'normal');
  doc.text(': —', 78, 83.5);

  // Quotation / Invoice Details (Right)
  const qDate = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-') : '30-Jun-26';
  const dueDate = quote.terms?.validUntil ? new Date(quote.terms.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-') : qDate;
  const isExport = String(quote.tradeType || '').toLowerCase().includes('export');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Invoice No.', 108, 42);
  doc.text(`: ${quote.quoteNumber || 'GIA/1534/26-27'}`, 140, 42);

  doc.setFontSize(6.5);
  doc.text('Invoice Date', 108, 45.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${qDate}`, 140, 45.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Due Date', 108, 49);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${dueDate}`, 140, 49);

  doc.setFont('helvetica', 'bold');
  doc.text('Place of Supply', 108, 52.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.placeOfSupply || '[24] Gujarat'}`, 140, 52.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Job Number', 108, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.jobNumber || 'AMD/IMP/AIR/00124/26-27'}`, 140, 56);

  doc.setFont('helvetica', 'bold');
  doc.text('Job Type', 108, 59.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${isExport ? 'Export' : 'Import'}`, 140, 59.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Customer Ref.', 108, 63);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.description || 'POND: 200000102'}`, 140, 63);

  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number', 108, 66.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.quoteNumber || '1210000312'}`, 140, 66.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', 170, 66.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${qDate}`, 178, 66.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Terms of Invoice', 108, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.terms?.paymentTerms || 'Net 30'}`, 140, 70);

  doc.setFont('helvetica', 'bold');
  doc.text('Shipper Name', 108, 73.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.opportunityId?.shipper || 'RECORDATI SPA'}`, 140, 73.5);

  doc.setFont('helvetica', 'bold');
  doc.text('BE Heading', 108, 77);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.title || 'METHENAMINE HIPPURATE BATCH'}`, 140, 77);

  doc.setFont('helvetica', 'bold');
  doc.text('Vessel / Voyage', 108, 80.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${vessel}`, 140, 80.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Origin Port', 108, 84);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${originPort}`, 140, 84);

  // Horizontal divider below top meta
  doc.line(m, 86, pageWidth - m, 86);

  // Importer Name & Containers
  doc.setFont('helvetica', 'bold');
  doc.text('Importer Name', 9, 89.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${custName}`, 35, 89.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Containers', 108, 89.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.opportunityId?.containerType || '—'}`, 140, 89.5);

  doc.line(m, 92, pageWidth - m, 92);

  // 5. Charges Table
  const tableHeaders = [
    [
      { content: 'Sr.\nNo', styles: { halign: 'center' } },
      { content: 'Description', styles: { halign: 'left' } },
      { content: 'Invoice\nNo', styles: { halign: 'center' } },
      { content: 'Invoice\nDate', styles: { halign: 'center' } },
      { content: 'HSN\n/SAC', styles: { halign: 'center' } },
      { content: 'Tax\nType', styles: { halign: 'center' } },
      { content: 'Taxable\nValue', styles: { halign: 'right' } },
      { content: '%', styles: { halign: 'center' } },
      { content: 'CGST', styles: { halign: 'right' } },
      { content: '%', styles: { halign: 'center' } },
      { content: 'SGST', styles: { halign: 'right' } },
      { content: 'Total\n(INR)', styles: { halign: 'right' } }
    ]
  ];

  let rawItems = quote.lineItems || [];
  if (rawItems.length === 0) {
    rawItems = [
      { productName: 'DOCUMENTATION CHARGES', hsnSac: '996713', quantity: 1, unitPrice: 500, tax: 18 },
      { productName: 'EXAMINATION CHARGES', hsnSac: '996713', quantity: 1, unitPrice: 2500, tax: 18 },
      { productName: 'IMPORT AGENCY CHARGES', hsnSac: '996713', quantity: 1, unitPrice: 17500, tax: 18 },
      { productName: 'EPCG/ADV.AUTH. Licence Debting Charges', hsnSac: '996713', quantity: 1, unitPrice: 500, tax: 18 },
      { productName: 'ADANI CHARGES', hsnSac: '996713', quantity: 1, unitPrice: 28290, tax: 18 },
      { productName: 'MISCELLANEOUS CHARGES\nLOADING CHARGES', hsnSac: '996713', quantity: 1, unitPrice: 1000, tax: 18 },
      { productName: 'ADC NOC CHARGES', hsnSac: '996713', quantity: 1, unitPrice: 1000, tax: 18 },
      { productName: 'EDI', hsnSac: '996713', quantity: 1, unitPrice: 30, tax: 18 }
    ];
  }

  let totalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalINR = 0;

  const tableBody = rawItems.map((it, idx) => {
    const qty = Number(it.quantity || 1);
    const unitPrice = Number(it.unitPrice || 0);
    const discount = Number(it.discount || 0);
    const baseVal = qty * unitPrice * (1 - discount / 100);
    const taxRate = it.tax !== undefined ? Number(it.tax) : 18;
    const halfTax = taxRate / 2;
    const cgstAmt = baseVal * (halfTax / 100);
    const sgstAmt = baseVal * (halfTax / 100);
    const rowTotal = baseVal + cgstAmt + sgstAmt;

    totalTaxable += baseVal;
    totalCGST += cgstAmt;
    totalSGST += sgstAmt;
    totalINR += rowTotal;

    return [
      String(idx + 1),
      it.productName || 'Charge Item',
      '',
      '',
      it.hsnSac || '996713',
      'T',
      baseVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      halfTax ? String(halfTax) : '9',
      cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      halfTax ? String(halfTax) : '9',
      sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      rowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ];
  });

  // Subtotal row
  tableBody.push([
    { content: 'Sub Total', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
    '',
    { content: totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
    '',
    { content: totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } }
  ]);

  doc.autoTable({
    startY: 92,
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6.2,
      lineWidth: 0.2,
      lineColor: [0, 0, 0],
      cellPadding: 1
    },
    bodyStyles: {
      fontSize: 6.2,
      textColor: [0, 0, 0],
      lineWidth: 0.15,
      lineColor: [0, 0, 0],
      cellPadding: 1
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 54, halign: 'left' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 17, halign: 'right' },
      7: { cellWidth: 7, halign: 'center' },
      8: { cellWidth: 15, halign: 'right' },
      9: { cellWidth: 7, halign: 'center' },
      10: { cellWidth: 15, halign: 'right' },
      11: { cellWidth: 20, halign: 'right' }
    },
    margin: { left: m, right: m }
  });

  const finalY = doc.lastAutoTable.finalY;

  // Legend bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('T:axable  P:Pure Agent  E:Exemption  R:Reverse Charge  N:Non Taxable', 9, finalY + 3.5);

  const botY = finalY + 5;
  doc.setLineWidth(0.3);
  doc.line(m, botY, pageWidth - m, botY);
  doc.line(110, botY, 110, 290); // Vertical divider for bottom section

  // Left Bottom Section: Bank Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Bank Details', 9, botY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Bank Name', 9, botY + 8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(': Kotak Mahindra Bank Ltd.', 32, botY + 8.5);

  doc.setFont('helvetica', 'bold');
  doc.text('A/c No.', 9, botY + 12);
  doc.text(': 8611785699', 32, botY + 12);

  doc.text('IFSC', 9, botY + 15.5);
  doc.text(': KKBK0000812', 32, botY + 15.5);

  doc.text('Branch', 9, botY + 19);
  doc.setFont('helvetica', 'normal');
  doc.text(': Chandan House, Ahmedabad', 32, botY + 19);

  // Amount in Words
  doc.line(m, botY + 22, 110, botY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Amount in Word :', 9, botY + 26);
  doc.text(numberToIndianWords(totalINR, 'INR'), 32, botY + 26, { maxWidth: 76 });

  // HSN Breakdown Mini Table
  doc.line(m, botY + 29, 110, botY + 29);
  doc.autoTable({
    startY: botY + 30,
    head: [['HSN/SAC', 'Taxable Value', 'Rate', 'Amount', 'Rate', 'Amount', 'Tax Amount']],
    body: [
      [
        '996713',
        totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        '9%',
        totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        '9%',
        totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        (totalCGST + totalSGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 5, fontStyle: 'bold', lineWidth: 0.15, cellPadding: 0.8 },
    bodyStyles: { textColor: [0, 0, 0], fontSize: 5, lineWidth: 0.15, cellPadding: 0.8 },
    margin: { left: m },
    tableWidth: 100
  });

  const termsY = doc.lastAutoTable.finalY + 3;
  doc.line(m, termsY, 110, termsY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Remarks :', 9, termsY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(quote.terms?.notes || '—', 25, termsY + 4, { maxWidth: 83 });

  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions :', 9, termsY + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  const termsList = [
    '* In case of any discrepancy in the invoice, please bring the same to our attention',
    '  within 7 days of receipt of invoice; else the same would be treated as correct.',
    '* Delay in payment beyond the agreed credit period will attract interest @ 18% p.a.',
    '* Government Taxes applied as per the prevailing rates.',
    '* All disputes are subject to AHMEDABAD Jurisdiction.',
    'E & O.E'
  ];
  termsList.forEach((t, i) => {
    doc.text(t, 9, termsY + 13 + i * 3.2);
  });

  // Right Bottom Section: Financial Totals Box
  const totalBoxX = 110;
  const totalBoxW = pageWidth - m - totalBoxX; // 93mm

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Total Amount Before Tax', totalBoxX + 3, botY + 5);
  doc.text(totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), pageWidth - m - 3, botY + 5, { align: 'right' });
  doc.line(totalBoxX, botY + 7, pageWidth - m, botY + 7);

  doc.text('Add:GST', totalBoxX + 3, botY + 11.5);
  doc.text((totalCGST + totalSGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), pageWidth - m - 3, botY + 11.5, { align: 'right' });
  doc.line(totalBoxX, botY + 13.5, pageWidth - m, botY + 13.5);

  doc.text('Total Invoice Value', totalBoxX + 3, botY + 18);
  doc.text(totalINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), pageWidth - m - 3, botY + 18, { align: 'right' });
  doc.line(totalBoxX, botY + 20, pageWidth - m, botY + 20);

  doc.setFont('helvetica', 'normal');
  doc.text('Less : Advance Received', totalBoxX + 3, botY + 24.5);
  doc.text('—', pageWidth - m - 3, botY + 24.5, { align: 'right' });
  doc.line(totalBoxX, botY + 26.5, pageWidth - m, botY + 26.5);

  const roundOff = Math.round(totalINR) - totalINR;
  doc.text('Round Off', totalBoxX + 3, botY + 31);
  doc.text(roundOff.toFixed(2), pageWidth - m - 3, botY + 31, { align: 'right' });
  doc.line(totalBoxX, botY + 33, pageWidth - m, botY + 33);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Net Payable', totalBoxX + 3, botY + 38);
  doc.text(Math.round(totalINR).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), pageWidth - m - 3, botY + 38, { align: 'right' });
  doc.line(totalBoxX, botY + 41, pageWidth - m, botY + 41);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Tax Payable on Reverse Charges', totalBoxX + 3, botY + 45.5);
  doc.line(totalBoxX, botY + 48, pageWidth - m, botY + 48);

  // Authorised Signatory Block
  const sigY = botY + 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('for SURAJ FORWARDERS PVT. LTD.', totalBoxX + totalBoxW / 2, sigY, { align: 'center' });

  // Stylized Signature
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(totalBoxX + 25, sigY + 14, totalBoxX + 65, sigY + 14);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('Agam', totalBoxX + 45, sigY + 12, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Authorised Signatory', totalBoxX + totalBoxW / 2, sigY + 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Page: 1/1', pageWidth - m - 3, 287, { align: 'right' });
};

const buildTransportQuotePDF = (doc, quote) => {
  const pw = 210;
  const m = 12;
  const cw = pw - 2 * m;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(m, m, cw, 275);

  // Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text('SR CONTAINER CARRIERS', m + 2, m + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(22);
  doc.setTextColor(0, 112, 192); // Blue
  doc.text('QUOTATION', pw - m - 2, m + 8, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Address
  doc.setFontSize(9);
  doc.text('A-206 Wall Street II, Opp. Orient Club', m + 2, m + 14);
  doc.text('Ellisbridge, Ahmedabad-380006', m + 2, m + 18);
  doc.text('Mobile No. 9924304441', m + 2, m + 22);
  doc.text('Email Id: ceo@srcontainercarriers.com, accounts@srcontainercarriers.com', m + 2, m + 26);

  // Right side Date/PO
  doc.line(130, m + 10, pw - m, m + 10);
  doc.text('DATE', 132, m + 14);
  doc.text(new Date(quote.createdAt || Date.now()).toLocaleDateString('en-GB').replace(/\//g, '.'), 160, m + 14);
  doc.line(130, m + 15, pw - m, m + 15);
  doc.text('PO #', 132, m + 19);
  doc.text(quote.quoteNumber || 'SRCC/001', 160, m + 19);
  doc.line(130, m + 20, pw - m, m + 20);

  // Vendor Section
  doc.setFillColor(0, 112, 192);
  doc.rect(m, m + 32, cw, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('VENDOR', m + 2, m + 36.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  const customerName = quote.accountId?.name || 'Customer Name';
  doc.text(customerName, m + 2, m + 42);
  doc.text(quote.billToAddress || 'Address', m + 2, m + 46);

  // Middle Blue Bar
  doc.setFillColor(0, 112, 192);
  doc.rect(m, m + 60, cw, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('REQUISITIONER', m + 15, m + 64, { align: 'center' });
  doc.text('SHIP VIA', m + 60, m + 64, { align: 'center' });
  doc.text('F.O.B.', m + 110, m + 64, { align: 'center' });
  doc.text('SHIPPING TERMS', m + 160, m + 64, { align: 'center' });

  // Empty row below blue bar
  doc.setDrawColor(0, 0, 0);
  doc.line(m, m + 66, pw - m, m + 66);
  doc.line(m, m + 72, pw - m, m + 72);
  doc.line(40, m + 60, 40, m + 72);
  doc.line(90, m + 60, 90, m + 72);
  doc.line(130, m + 60, 130, m + 72);

  // Table Header
  doc.setFillColor(0, 112, 192);
  doc.rect(m, m + 76, cw, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Sr. No.', m + 6, m + 80);
  doc.text('Description', m + 60, m + 80);
  doc.text('20FT', 150, m + 80);
  doc.text('40FT', 180, m + 80);

  // Table Body
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  const items = quote.lineItems || [];
  let currentY = m + 86;

  items.forEach((it, idx) => {
    doc.text(String(idx + 1), m + 6, currentY);
    
    // Split description
    const lines = doc.splitTextToSize(it.productName || '', 100);
    lines.forEach(line => {
      doc.text(line, m + 22, currentY);
      currentY += 4;
    });

    const is40 = (it.productName || '').includes('40HC') || (it.productName || '').includes('40FT');
    const qty = it.quantity || 1;
    if (is40) {
      doc.text('-', 150, currentY - 4);
      doc.text(String(qty), 180, currentY - 4);
    } else {
      doc.text(String(qty), 150, currentY - 4);
      doc.text('-', 180, currentY - 4);
    }
    currentY += 2;
  });

  // Vertical lines for table
  doc.setLineWidth(0.2);
  doc.line(m + 16, m + 76, m + 16, currentY + 30);
  doc.line(140, m + 76, 140, currentY + 30);
  doc.line(170, m + 76, 170, currentY + 30);

  // Bottom Table Line
  doc.line(m, currentY + 30, pw - m, currentY + 30);

  // Footer Terms
  const footerY = currentY + 34;
  doc.setFont('helvetica', 'bold');
  doc.text('Terms and Conditions:', m + 2, footerY);
  doc.setFont('helvetica', 'normal');
  doc.text('1) Weighment Extra As per Actual', m + 2, footerY + 6);
  doc.text('2) Handling Charges Extra As per Actual', m + 2, footerY + 12);
  doc.text('3) 12% GST Transportation and Detention', m + 2, footerY + 18);
  doc.text(`4) Payment Terms ${quote.terms?.paymentTerms || '30 Days'}`, m + 2, footerY + 24);

  // Total Box
  doc.line(140, footerY - 4, 140, footerY + 16);
  doc.line(170, footerY - 4, 170, footerY + 16);
  doc.text('GST EXTRA', 155, footerY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 155, footerY + 12, { align: 'center' });
  doc.line(m, footerY + 16, pw - m, footerY + 16);
};

const buildParamountQuotePDF = (doc, quote) => {
  buildParamountEstimatePDF(doc, quote);
};

const buildElockQuotePDF = (doc, quote) => {
  const pw = 210;
  const m = 14;
  const cw = pw - 2 * m;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('QUOTATION', m, m + 10);
  doc.text('SOFTWARE & E-LOCK SERVICES', m, m + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Quotation No.: ${quote.quoteNumber || '_______'}`, m, m + 28);
  doc.text(`Date: ${new Date(quote.createdAt || Date.now()).toLocaleDateString('en-IN')}`, m, m + 33);

  doc.text('To,', m, m + 43);
  doc.text(`M/s. ${quote.accountId?.name || '_________________________'}`, m, m + 48);
  doc.text(`Address: ${quote.billToAddress || '_________________________'}`, m, m + 53);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Subject: Quotation for Software Deployment, Subscription & E-Lock Services', m, m + 63);

  doc.setFont('helvetica', 'normal');
  doc.text('Dear Sir/Madam,', m, m + 73);
  doc.text('We are pleased to submit our quotation for providing Transport Management Software, E-Lock Tracking Services and related features.', m, m + 83, { maxWidth: cw });

  let curY = m + 95;
  
  const sectionHeader = (title) => {
    if (curY > 260) { doc.addPage(); curY = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, m, curY);
    curY += 8;
  };

  sectionHeader('1. ONE-TIME SOFTWARE DEPLOYMENT / IMPLEMENTATION CHARGES');
  doc.autoTable({
    startY: curY,
    head: [['Sr. No.', 'Particulars', 'Charges']],
    body: [
      ['1', 'Software Installation & Initial Deployment', 'Rs ______'],
      ['2', 'Company / Branch Setup', 'Rs ______'],
      ['3', 'User & Role Configuration', 'Rs ______'],
      ['4', 'Customer / Vendor / Vehicle Master Setup', 'Rs ______'],
      ['5', 'Integration / API Configuration', 'Rs ______'],
      ['6', 'E-Lock Device Integration', 'Rs ______'],
      ['7', 'GPS / Tracking Integration', 'Rs ______'],
      ['8', 'Initial Data Migration', 'Rs ______'],
      ['9', 'Dashboard & Report Configuration', 'Rs ______'],
      ['10', 'User Training & Go-Live Support', 'Rs ______']
    ],
    theme: 'plain',
    headStyles: { fontStyle: 'bold', textColor: [0,0,0] },
    bodyStyles: { textColor: [0,0,0] },
    margin: { left: m }
  });
  curY = doc.lastAutoTable.finalY + 5;
  doc.text('Total One-Time Deployment Charges: Rs ______', m, curY);
  curY += 15;

  sectionHeader('2. MONTHLY SOFTWARE SUBSCRIPTION');
  doc.autoTable({
    startY: curY,
    head: [['Plan', 'Coverage', 'Monthly Charges']],
    body: [
      ['Basic', '____ Users / ____ Vehicles', 'Rs ______ / Month'],
      ['Standard', '____ Users / ____ Vehicles', 'Rs ______ / Month'],
      ['Enterprise', '____ Users / ____ Vehicles', 'Rs ______ / Month']
    ],
    theme: 'plain',
    headStyles: { fontStyle: 'bold', textColor: [0,0,0] },
    bodyStyles: { textColor: [0,0,0] },
    margin: { left: m }
  });
  curY = doc.lastAutoTable.finalY + 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Our Proposed Plan', m, curY);
  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Monthly Software Subscription: Rs ______ / Month', m, curY);
  curY += 10;
  
  doc.text('The subscription includes:', m, curY);
  curY += 6;
  const features = ['Transport / Trip Management', 'Vehicle Master', 'Customer & Vendor Master', 'Trip Creation & Monitoring', 'E-Lock Tracking Integration', 'GPS Tracking Integration', 'Trip Status Dashboard', 'Vehicle / Driver Tracking', 'E-Lock Status', 'Reports & MIS', 'User Management', 'Basic Technical Support'];
  features.forEach(f => {
    if (curY > 280) { doc.addPage(); curY = 20; }
    doc.text(`- ${f}`, m + 5, curY);
    curY += 5;
  });
  curY += 10;

  sectionHeader('3. E-LOCK – PER TRIP CHARGES');
  doc.autoTable({
    startY: curY,
    head: [['Sr. No.', 'Particulars', 'Charges']],
    body: [
      ['1', 'E-Lock Usage / Rental - Per Trip', 'Rs ______ / Trip'],
      ['2', 'E-Lock Installation / Fitment', 'Rs ______'],
      ['3', 'E-Lock Removal / Unfitment', 'Rs ______'],
      ['4', 'E-Lock Activation & Tracking', 'Included'],
      ['5', 'Live Tracking During Trip', 'Included'],
      ['6', 'Lock / Unlock Event Monitoring', 'Included'],
      ['7', 'Trip Closure / E-Lock Release', 'Included'],
      ['8', 'Device Damage / Loss', 'At Actual / Rs ______'],
      ['9', 'Emergency / Special Handling', 'Rs ______']
    ],
    theme: 'plain',
    headStyles: { fontStyle: 'bold', textColor: [0,0,0] },
    bodyStyles: { textColor: [0,0,0] },
    margin: { left: m }
  });
  curY = doc.lastAutoTable.finalY + 5;
  doc.setFont('helvetica', 'bold');
  doc.text('E-Lock Commercial Model', m, curY);
  curY += 5;
  doc.text('E-Lock Charges: Rs ______ per trip', m, curY);
  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('The above per trip charges include the E-Lock device, activation, tracking and normal trip monitoring for the agreed trip duration.', m, curY, { maxWidth: cw });
  curY += 15;

  sectionHeader('4. TERMS & CONDITIONS');
  const tcs = [
    '1. One-time deployment charges will be payable at the time of implementation/order confirmation.',
    '2. Monthly subscription will be billed monthly/quarterly/annually as mutually agreed.',
    '3. E-Lock charges will be calculated based on the number of trips activated/used during the billing period.',
    '4. E-Lock device remains the property of the service provider unless specifically sold to the customer.',
    '5. Loss or physical damage to the E-Lock device will be charged separately.',
    '6. Normal software support and updates are included in the subscription unless otherwise specified.',
    '7. Network availability is required for real-time tracking and communication.',
    '8. GST will be charged as applicable.',
    `9. Payment Terms: ${quote.terms?.paymentTerms || '________________________'}`,
    '10. Quotation validity: 30 days from the date of quotation.'
  ];
  tcs.forEach(t => {
    if (curY > 280) { doc.addPage(); curY = 20; }
    doc.splitTextToSize(t, cw).forEach(line => {
      doc.text(line, m, curY);
      curY += 5;
    });
  });

  curY += 10;
  if (curY > 250) { doc.addPage(); curY = 20; }
  doc.text('We look forward to providing reliable software, e-lock and trip monitoring services to your organization.', m, curY);
  curY += 15;
  doc.text('For eLock Solutions Pvt Ltd', m, curY);
  curY += 20;
  doc.text('Authorized Signatory', m, curY);
};

// ─── Format Zoho: Dynamic Company & Custom Columns Quotation PDF (ZOHO Inspired) ───
const buildZohoCompanyQuotePDF = (doc, quote) => {
  const pageWidth = 210;
  const pageHeight = 297;
  const m = 10;
  const cw = pageWidth - 2 * m;

  const comp = quote.companyId || {};
  const temp = quote.templateId || {};
  const zohoStyle = temp.zohoStyle || {};

  const hexToRgb = (hex) => {
    let clean = (hex || '#1e3a8a').replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  const primaryRgb = hexToRgb(zohoStyle.themeColor || '#1e3a8a');

  // Outer Border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.rect(m, m, cw, pageHeight - 2 * m);

  // Top Accent Banner
  doc.setFillColor(...primaryRgb);
  doc.rect(m, m, cw, 4, 'F');

  let curY = 18;

  const logoUrl = comp.logoUrl;
  let logoOffset = 14;

  if (logoUrl && (logoUrl.startsWith('data:image') || logoUrl.startsWith('http'))) {
    try {
      doc.addImage(logoUrl, 'PNG', 14, curY - 2, 28, 20);
      logoOffset = 46;
    } catch (e) {
      console.warn('Could not render logo image in PDF:', e);
    }
  }

  const compName = comp.name || 'EXIM LOGISTICS SOLUTION';
  const compTagline = comp.tagline || '';
  const compAddressStr = [
    comp.address?.street,
    comp.address?.city,
    comp.address?.state,
    comp.address?.pincode,
    comp.address?.country
  ].filter(Boolean).join(', ');
  const compGstin = comp.gstin ? `GSTIN: ${comp.gstin}` : '';
  const compContact = [comp.phone ? `Ph: ${comp.phone}` : '', comp.email ? `Email: ${comp.email}` : ''].filter(Boolean).join(' | ');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryRgb);
  doc.text(compName, logoOffset, curY);

  if (compTagline) {
    curY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(compTagline, logoOffset, curY);
  }

  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  if (compAddressStr) {
    doc.text(compAddressStr, logoOffset, curY, { maxWidth: 110 });
    curY += 4.5;
  }
  if (compGstin || compContact) {
    doc.text([compGstin, compContact].filter(Boolean).join(' • '), logoOffset, curY, { maxWidth: 110 });
  }

  // Right Top: QUOTATION Title & Meta Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...primaryRgb);
  doc.text('QUOTATION', pageWidth - m - 4, 22, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Quote #: ${quote.quoteNumber || 'QT-2026-00001'}`, pageWidth - m - 4, 29, { align: 'right' });

  const qDate = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');
  const validUntilStr = quote.terms?.validUntil ? new Date(quote.terms.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '30 Days';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${qDate}`, pageWidth - m - 4, 34, { align: 'right' });
  doc.text(`Valid Until: ${validUntilStr}`, pageWidth - m - 4, 38.5, { align: 'right' });

  // Divider Line
  curY = 44;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(m, curY, pageWidth - m, curY);

  // Customer / Bill To Section
  curY += 6;
  doc.setFillColor(248, 250, 252);
  doc.rect(m, curY, cw, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryRgb);
  doc.text('BILL TO / CLIENT DETAILS', 14, curY + 4.2);

  curY += 9;
  const accName = quote.accountId?.name || 'Valued Customer';
  const contactName = quote.contactId ? `${quote.contactId.firstName || ''} ${quote.contactId.lastName || ''}`.trim() : '';
  const billAddr = quote.billToAddress || 'As per records';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(accName, 14, curY);

  curY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  if (contactName) {
    doc.text(`Attn: ${contactName}`, 14, curY);
    curY += 4;
  }
  doc.text(billAddr, 14, curY, { maxWidth: 170 });
  curY += 8;

  // Dynamic Custom Columns & Items Table Setup
  const customCols = quote.templateColumns || temp.customColumns || [];

  const headCols = [
    { content: '#', styles: { halign: 'center', width: 8 } },
    { content: 'Product / Service Description', styles: { halign: 'left' } },
    { content: 'HSN/SAC', styles: { halign: 'center' } }
  ];

  customCols.forEach(col => {
    headCols.push({
      content: col.label,
      styles: { halign: col.align || 'center' }
    });
  });

  headCols.push(
    { content: 'Qty', styles: { halign: 'center' } },
    { content: 'Rate (₹)', styles: { halign: 'right' } },
    { content: 'Disc %', styles: { halign: 'center' } },
    { content: 'Tax %', styles: { halign: 'center' } },
    { content: 'Total (₹)', styles: { halign: 'right' } }
  );

  const rawItems = quote.lineItems || [];
  let calcSubtotal = 0;
  let calcTax = 0;
  let calcDiscount = 0;

  const tableBody = rawItems.map((it, idx) => {
    const qty = Number(it.quantity || 1);
    const price = Number(it.unitPrice || 0);
    const disc = Number(it.discount || 0);
    const tax = Number(it.tax || 0);

    const lineSub = qty * price;
    const lineDisc = lineSub * (disc / 100);
    const lineTax = (lineSub - lineDisc) * (tax / 100);
    const lineTotal = it.lineTotal || (lineSub - lineDisc + lineTax);

    calcSubtotal += lineSub;
    calcDiscount += lineDisc;
    calcTax += lineTax;

    const row = [
      String(idx + 1),
      it.productName || 'Service Item',
      it.hsnSac || '9967'
    ];

    customCols.forEach(col => {
      const val = (it.customFields && it.customFields[col.key] !== undefined)
        ? String(it.customFields[col.key])
        : (col.defaultValue || '—');
      row.push(val);
    });

    row.push(
      String(qty),
      price.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      disc ? `${disc}%` : '—',
      tax ? `${tax}%` : '—',
      Math.round(lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    );

    return row;
  });

  doc.autoTable({
    startY: curY,
    head: [headCols],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: primaryRgb,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 3
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: m, right: m }
  });

  curY = doc.lastAutoTable.finalY + 6;

  const calcGrandTotal = quote.total || (calcSubtotal - calcDiscount + calcTax);

  if (curY > pageHeight - 65) {
    doc.addPage();
    curY = 20;
  }

  const totX = pageWidth - m - 75;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Subtotal:', totX, curY);
  doc.text(`₹ ${Math.round(calcSubtotal).toLocaleString('en-IN')}`, pageWidth - m - 4, curY, { align: 'right' });
  curY += 4.5;

  if (calcDiscount > 0) {
    doc.text('Discount:', totX, curY);
    doc.text(`- ₹ ${Math.round(calcDiscount).toLocaleString('en-IN')}`, pageWidth - m - 4, curY, { align: 'right' });
    curY += 4.5;
  }

  if (calcTax > 0) {
    doc.text('Tax (GST):', totX, curY);
    doc.text(`+ ₹ ${Math.round(calcTax).toLocaleString('en-IN')}`, pageWidth - m - 4, curY, { align: 'right' });
    curY += 4.5;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(totX, curY, pageWidth - m, curY);
  curY += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryRgb);
  doc.text('Total Amount:', totX, curY);
  doc.text(`₹ ${Math.round(calcGrandTotal).toLocaleString('en-IN')}`, pageWidth - m - 4, curY, { align: 'right' });
  curY += 8;

  doc.setFillColor(248, 250, 252);
  doc.rect(m, curY - 24, totX - m - 10, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('AMOUNT IN WORDS', m + 4, curY - 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(numberToIndianWords(calcGrandTotal), m + 4, curY - 12, { maxWidth: totX - m - 18 });

  if (comp.bankDetails?.bankName) {
    if (curY > pageHeight - 55) { doc.addPage(); curY = 20; }
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.rect(m, curY, cw, 18, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryRgb);
    doc.text('BANK ACCOUNT DETAILS FOR REMITTANCE:', 14, curY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    const bStr = `Bank: ${comp.bankDetails.bankName} | A/C Name: ${comp.bankDetails.accountName || compName} | A/C No: ${comp.bankDetails.accountNumber} | IFSC: ${comp.bankDetails.ifscCode} ${comp.bankDetails.branch ? `| Branch: ${comp.bankDetails.branch}` : ''}`;
    doc.text(bStr, 14, curY + 11, { maxWidth: cw - 8 });

    curY += 24;
  }

  const termsText = quote.terms?.notes || zohoStyle.termsAndConditions || 'Standard terms apply.';
  if (termsText) {
    if (curY > pageHeight - 45) { doc.addPage(); curY = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('TERMS & CONDITIONS:', m, curY);

    curY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const splitTerms = doc.splitTextToSize(termsText, cw);
    doc.text(splitTerms, m, curY);
    curY += (splitTerms.length * 4) + 6;
  }

  if (curY > pageHeight - 30) { doc.addPage(); curY = 20; }
  const sigName = comp.authorizedSignatory?.name || 'Authorized Signatory';
  const sigTitle = comp.authorizedSignatory?.designation || compName;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`For ${compName}`, pageWidth - m - 4, curY, { align: 'right' });
  curY += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(sigName, pageWidth - m - 4, curY, { align: 'right' });
  curY += 4;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(sigTitle, pageWidth - m - 4, curY, { align: 'right' });
};

export const buildQuotePDF = (doc, quote) => {
  if (quote?.companyId || quote?.templateId || (quote?.templateColumns && quote.templateColumns.length > 0)) {
    buildZohoCompanyQuotePDF(doc, quote);
    return;
  }

  const tradeType = quote?.tradeType || 'import';
  const isParamount = tradeType === 'pfp' || 
    quote?.businessVertical === 'Paramount' || 
    quote?.companyTemplate === 'paramount' ||
    String(quote?.title || '').toLowerCase().includes('paramount') ||
    String(quote?.title || '').toLowerCase().includes('crate');

  if (tradeType === 'transport') {
    buildTransportQuotePDF(doc, quote);
  } else if (isParamount) {
    buildParamountEstimatePDF(doc, quote);
  } else if (tradeType === 'software_elock') {
    buildElockQuotePDF(doc, quote);
  } else {
    buildSurajQuotePDF(doc, quote);
  }
};

export { 
  buildSurajQuotePDF, 
  buildParamountEstimatePDF, 
  buildTransportQuotePDF, 
  buildElockQuotePDF, 
  buildParamountQuotePDF 
};

export const generateQuotePDF = (quote) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  buildQuotePDF(doc, quote);
  doc.save(`Quotation_${quote.quoteNumber}.pdf`);
};

export const getQuotePDFBase64 = (quote) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  buildQuotePDF(doc, quote);
  return doc.output('datauristring');
};

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Helper: Convert number to Indian currency words
function numberToIndianWords(num) {
  const integerPart = Math.floor(num);
  if (integerPart === 0) return 'Rupees Zero Only';

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

  return 'Rupees ' + result.trim() + ' Only';
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

// ─── Paramount Propack Estimate PDF (GST Invoice-style) ───
const buildParamountEstimatePDF = (doc, quote) => {
  const pw = 210; // page width
  const ph = 297; // page height
  const m = 8;    // margin
  const cw = pw - 2 * m; // content width (194)
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Page Border ──
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(m, m, cw, ph - 2 * m);

  // ── HEADER: Logo + Company Info + "ESTIMATE" ──
  // Logo placeholder (left) — replace with doc.addImage() when logo is provided
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(200, 50, 50);
  doc.text('P', 13, 18);
  doc.setTextColor(30, 30, 30);
  doc.text('PARAMOUNT', 18, 18);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 100, 100);
  doc.text('PROPACK PVT. LTD.', 18, 21.5);

  // Company details (center)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Paramount Propack Pvt Ltd', 62, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  const hdrLines = [
    'A-306, Wall Street 2, Opp. Orient Club,',
    'Nr. Gujarat College, Ellis Bridge,',
    'Ahmedabad, Gujarat 380006',
    'India. Phone : 9924304363,',
    'Mo.9924330777',
    'GSTIN 24AAHCP4599D1Z8'
  ];
  hdrLines.forEach((l, i) => doc.text(l, 62, 19.5 + i * 3.5));

  // "ESTIMATE" title (top-right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.text('ESTIMATE', pw - m - 2, 24, { align: 'right' });

  // ── Divider below header ──
  doc.setDrawColor(180, 180, 180);
  doc.line(m, 42, pw - m, 42);

  // ── INFO ROW: # / Estimate Date | Place Of Supply ──
  const infoY = 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('#', 12, infoY + 5);
  doc.text('Estimate Date', 12, infoY + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.quoteNumber || 'EST-000'}`, 38, infoY + 5);
  doc.text(`: ${new Date(quote.createdAt || Date.now()).toLocaleDateString('en-IN')}`, 38, infoY + 9);

  // Vertical divider
  doc.line(108, infoY, 108, infoY + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Place Of Supply', 113, infoY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.placeOfSupply || 'Gujarat (24)'}`, 140, infoY + 5);

  doc.line(m, infoY + 13, pw - m, infoY + 13); // bottom line

  // ── BILL TO ──
  const billStartY = infoY + 13;
  doc.setFillColor(245, 245, 245);
  doc.rect(m + 0.15, billStartY + 0.15, cw - 0.3, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Bill To', 12, billStartY + 4);

  const custName = quote.accountId?.name || 'Customer Name';
  const contactName = quote.contactId
    ? `${quote.contactId.firstName || ''} ${quote.contactId.lastName || ''}`.trim()
    : '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(custName, 12, billStartY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  let bY = billStartY + 15;
  if (contactName) { doc.text(contactName, 12, bY); bY += 3.5; }
  if (quote.billToAddress) {
    doc.splitTextToSize(quote.billToAddress, 110).forEach(ln => { doc.text(ln, 12, bY); bY += 3.5; });
  }

  const billEndY = Math.max(bY + 2, billStartY + 22);
  doc.line(m, billEndY, pw - m, billEndY);

  // ── LINE ITEMS TABLE ──
  const items = quote.lineItems || [];

  const tableBody = items.map((it, idx) => {
    const qty = it.quantity || 0;
    const rate = it.unitPrice || 0;
    const disc = it.discount || 0;
    const base = qty * rate * (1 - disc / 100);
    const halfTax = (it.tax || 0) / 2;
    const cgst = base * halfTax / 100;
    const sgst = base * halfTax / 100;
    return [
      String(idx + 1),
      it.productName || '',
      it.hsnSac || '392310',
      fmt(qty),
      fmt(rate),
      halfTax ? `${halfTax}%` : '0%',
      fmt(cgst),
      halfTax ? `${halfTax}%` : '0%',
      fmt(sgst),
      fmt(base)
    ];
  });

  doc.autoTable({
    startY: billEndY,
    head: [
      [
        { content: '#', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Item & Description', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'HSN\n/SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Qty', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Rate', rowSpan: 2, styles: { halign: 'right', valign: 'middle' } },
        { content: 'CGST', colSpan: 2, styles: { halign: 'center' } },
        { content: 'SGST', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Amount', rowSpan: 2, styles: { halign: 'right', valign: 'middle' } }
      ],
      [
        { content: '%', styles: { halign: 'center' } },
        { content: 'Amt', styles: { halign: 'right' } },
        { content: '%', styles: { halign: 'center' } },
        { content: 'Amt', styles: { halign: 'right' } }
      ]
    ],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [30, 41, 59],
      fontSize: 7,
      fontStyle: 'bold',
      lineWidth: 0.2,
      lineColor: [180, 180, 180]
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      lineWidth: 0.2,
      lineColor: [180, 180, 180],
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 17, halign: 'center' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 10, halign: 'center' },
      8: { cellWidth: 20, halign: 'right' },
      9: { cellWidth: 23, halign: 'right' }
    },
    margin: { left: m, right: m },
    tableLineWidth: 0.2,
    tableLineColor: [180, 180, 180]
  });

  // ── TOTALS CALCULATION ──
  let subTotal = 0, totalCGST = 0, totalSGST = 0;
  items.forEach(it => {
    const base = (it.quantity || 0) * (it.unitPrice || 0) * (1 - (it.discount || 0) / 100);
    const half = (it.tax || 0) / 2;
    subTotal += base;
    totalCGST += base * half / 100;
    totalSGST += base * half / 100;
  });
  const grandTotal = subTotal + totalCGST + totalSGST;
  const taxLabel = items.length > 0 ? ((items[0].tax || 0) / 2) : 0;

  // ── FOOTER: Total In Words (left) | Totals (right) ──
  const tblEnd = doc.lastAutoTable.finalY;
  const midX = 120;

  doc.setDrawColor(180, 180, 180);
  doc.line(m, tblEnd, pw - m, tblEnd);
  doc.line(midX, tblEnd, midX, tblEnd + 30);

  // Left: Total In Words
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Total In Words', 12, tblEnd + 5);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  const words = numberToIndianWords(Math.round(grandTotal));
  doc.splitTextToSize(words, midX - 16).forEach((ln, i) => doc.text(ln, 12, tblEnd + 10 + i * 3.5));

  // Left: Notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Notes', 12, tblEnd + 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(quote.terms?.notes || 'Looking forward for your business.', 12, tblEnd + 23, { maxWidth: midX - 16 });

  // Right: Totals breakdown
  const rx = midX + 4;
  const rv = pw - m - 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);

  doc.text('Sub Total', rx, tblEnd + 5);
  doc.text(fmt(subTotal), rv, tblEnd + 5, { align: 'right' });

  doc.text(`CGST${taxLabel || ''}  (${taxLabel || 0}%)`, rx, tblEnd + 10);
  doc.text(fmt(totalCGST), rv, tblEnd + 10, { align: 'right' });

  doc.text(`SGST${taxLabel || ''}  (${taxLabel || 0}%)`, rx, tblEnd + 15);
  doc.text(fmt(totalSGST), rv, tblEnd + 15, { align: 'right' });

  doc.line(midX, tblEnd + 17, pw - m, tblEnd + 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Total', rx, tblEnd + 22);
  doc.text(`\u20B9${fmt(grandTotal)}`, rv, tblEnd + 22, { align: 'right' });

  doc.line(m, tblEnd + 30, pw - m, tblEnd + 30);

  // ── TERMS & CONDITIONS + BANK DETAILS ──
  const tcY = tblEnd + 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Terms & Conditions', 12, tcY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(40, 40, 40);
  const tcLines = [
    `Payment Terms: ${quote.terms?.paymentTerms || '100% Advance'}.`,
    'Freight charges will be extra.',
    `Delivery Within ${quote.terms?.deliveryTerms || '10 -12 Working Days'}.`,
    'Prices: The price is quoted in INR.',
    'Bank Detail: Kotak Mahindra Bank,',
    'Branch: Chandan House, Opp.Abhijit 3, Ahmedabad.',
    'A/c. No.1512264287, IFSC Code : KKBK0000812',
    'Other Detail: PAN No. AAHCP4599D',
    'GSTIN No.- 24AAHCP4599D1Z8'
  ];
  tcLines.forEach((l, i) => doc.text(l, 12, tcY + 4.5 + i * 3.5));

  // Authorized Signature (bottom-right)
  const sigY = tcY + 28;
  doc.setDrawColor(100, 100, 100);
  doc.line(150, sigY, pw - 12, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Authorized Signature', (150 + pw - 12) / 2, sigY + 4, { align: 'center' });
};

export const buildQuotePDF = (doc, quote) => {
  // Page width and height limits
  const pageWidth = 210;
  const pageHeight = 297;
  const customRows = getTradeChargeRows(quote?.tradeType || 'import');

  // Company Template Branding Selection
  const template = (quote?.companyTemplate || 'paramount').toLowerCase();

  // Paramount uses a dedicated GST estimate layout
  if (template === 'paramount') {
    buildParamountEstimatePDF(doc, quote);
    return;
  }

  // Draw Page Border (8mm margins)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  if (template === 'elock' || template === 'e-lock') {
    // eLock Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(14, 165, 233); // Cyan/sky blue
    doc.text('e', 14, 18);
    doc.setTextColor(30, 41, 59);
    doc.text('LOCK', 18, 18);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('ELECTRONIC CARGO SECURITY', 14, 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('eLock Solutions Pvt Ltd', 65, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Cargo Tracking & Smart Security Division,', 65, 20.5);
    doc.text('301-304, Navrangpura Business Hub,', 65, 24.5);
    doc.text('Ahmedabad, Gujarat 380009', 65, 28.5);
    doc.text('India. Phone: +91 79 4000 5566, Email: ops@elock.in', 65, 32.5);
    doc.text('GSTIN 24AABCE1234F1Z5', 65, 36.5);
  } else if (template === 'exim' || template === 'standard') {
    // Exim Logistics / Freight Forwarding Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); // Royal Blue
    doc.text('EXIM', 14, 18);
    doc.setTextColor(30, 41, 59);
    doc.text('LOGISTICS', 32, 18);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('GLOBAL FREIGHT & EXIM SOLUTIONS', 14, 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Exim Logistics Pvt Ltd', 68, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('International Freight & Customs Broking Division,', 68, 20.5);
    doc.text('Mundra Port Road, Sector 8, Gandhidham,', 68, 24.5);
    doc.text('Kutch, Gujarat 370201', 68, 28.5);
    doc.text('India. Phone: +91 2836 234567, Email: quotes@eximlogistics.com', 68, 32.5);
    doc.text('GSTIN 24AABCE9876G1Z2', 68, 36.5);
  } else {
    // Default: Paramount Propack Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(239, 68, 68); // Red logo highlight
    doc.text('P', 14, 18);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('PARAMOUNT', 19, 18);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('PROPACK PVT. LTD.', 19, 21.5);

    // Corporate details next to logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Paramount Propack Pvt Ltd', 58, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('A-306, Wall Street 2, Opp. Orient Club,', 58, 20.5);
    doc.text('Nr. Gujarat College, Ellis Bridge,', 58, 24.5);
    doc.text('Ahmedabad, Gujarat 380006', 58, 28.5);
    doc.text('India. Phone : 9924304363, Mo.9924330777', 58, 32.5);
    doc.text('GSTIN 24AAHCP4599D1Z8', 58, 36.5);
  }

  // --- Document Title (Top Right) ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.text('ESTIMATE', 196, 26, { align: 'right' });

  // Divider below header
  doc.setDrawColor(200, 200, 200);
  doc.line(8, 40, 202, 40);

  // --- Info Section Row ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('#', 14, 45);
  doc.text('Estimate Date', 14, 49);

  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.quoteNumber}`, 38, 45);
  doc.text(`: ${new Date(quote.createdAt).toLocaleDateString('en-IN')}`, 38, 49);

  doc.setFont('helvetica', 'bold');
  doc.text('Place Of Supply', 110, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.placeOfSupply || 'Gujarat (24)'}`, 136, 45);

  // Divider below info row
  doc.line(8, 52, 202, 52);

  // --- Addresses (Bill To / Ship To) Title background ---
  doc.setFillColor(241, 245, 249); // slate-100 gray
  doc.rect(8.2, 52.2, 193.6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Bill To', 14, 56.5);
  doc.text('Ship To', 110, 56.5);

  // Vertical line divider for addresses
  doc.line(106, 52, 106, 80);

  // Address text content
  const customerName = quote.accountId?.name || 'Customer Name';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(customerName, 14, 63);
  doc.text(customerName, 110, 63);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  // Wrap address text lines cleanly
  doc.text(quote.billToAddress || '', 14, 67, { maxWidth: 85 });
  doc.text(quote.shipToAddress || quote.billToAddress || '', 110, 67, { maxWidth: 85 });

  // Divider below addresses
  doc.line(8, 80, 202, 80);

  // --- Line Items Table ---
  const customsTableHeaders = [
    [
      { content: 'Customs Clearance Cost', colSpan: 2, styles: { halign: 'center', fillColor: [191, 219, 254], textColor: [15, 23, 42], fontStyle: 'bold' } },
      { content: 'Amount (Rs)', styles: { halign: 'center', fillColor: [191, 219, 254], textColor: [15, 23, 42], fontStyle: 'bold' } },
      { content: 'Remarks', styles: { halign: 'center', fillColor: [191, 219, 254], textColor: [15, 23, 42], fontStyle: 'bold' } }
    ]
  ];

  const customsTableRows = customRows.map((row) => [
    row.label,
    '',
    Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    quote?.tradeType === 'export' ? 'Container / port related export charges' : 'Per container / GST as applicable'
  ]);

  doc.autoTable({
    startY: 80,
    head: customsTableHeaders,
    body: customsTableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [191, 219, 254],
      textColor: [15, 23, 42],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      lineWidth: 0.15,
      lineColor: [200, 200, 200]
    },
    columnStyles: {
      0: { cellWidth: 94 },
      1: { cellWidth: 15 },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 42 }
    },
    margin: { left: 8, right: 8 }
  });

  const shippingLineRows = [
    ['Ocean Freight', 118800, 211300],
    ['Terminal Handling Charge (THC)', 18500, 23500],
    ['Bill of Lading Charges (BL)', 4500, 4500],
    ['Seal Charges', 1500, 1500],
    ['Mandatory User Charges', 170, 170],
    ['VTS Charges', 500, 500]
  ];

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 6,
    head: [[{ content: 'Shipping Line Cost', colSpan: 3, styles: { halign: 'center', fillColor: [147, 197, 253], textColor: [15, 23, 42], fontStyle: 'bold' } }, { content: 'Amount (Rs)', styles: { halign: 'center', fillColor: [147, 197, 253], textColor: [15, 23, 42], fontStyle: 'bold' } }]],
    body: shippingLineRows.map((row) => [row[0], Number(row[1]).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), Number(row[2]).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })]),
    theme: 'grid',
    headStyles: {
      fillColor: [147, 197, 253],
      textColor: [15, 23, 42],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      lineWidth: 0.15,
      lineColor: [200, 200, 200]
    },
    columnStyles: {
      0: { cellWidth: 94 },
      1: { cellWidth: 42, halign: 'right' },
      2: { cellWidth: 42, halign: 'right' }
    },
    margin: { left: 8, right: 8 }
  });

  const totalA = customRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalB = shippingLineRows.reduce((sum, row) => sum + Number(row[2] || 0), 0);
  const grandTotal = totalA + totalB;

  doc.setFillColor(140, 92, 180);
  doc.rect(8, doc.lastAutoTable.finalY + 4, 194, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL', 14, doc.lastAutoTable.finalY + 10.5);
  doc.text(`₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 176, doc.lastAutoTable.finalY + 10.5, { align: 'right' });

  // --- Footer summary area ---
  const footerY = doc.lastAutoTable.finalY + 8;
  doc.setDrawColor(200, 200, 200);
  doc.line(8, footerY, 202, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Total In Words', 12, footerY + 6);

  doc.setFont('helvetica', 'italic');
  doc.setTextColor(15, 23, 42);
  doc.text(numberToIndianWords(Number(grandTotal || 0)), 12, footerY + 12, { maxWidth: 110 });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Payment Terms', 135, footerY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(quote.terms?.paymentTerms || '100% Advance', 135, footerY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Authorized Signature', 155, 276, { align: 'center' });

  const defaultTerms = [
    '>>> Payment: 100% Advance',
    '>>> The above terms are subject to local conditions on both sides',
    '>>> The above terms are subject to space availability, equipment, rate approval, and acceptance.',
    '>>> Booking cancellation fees as per liner tariff.',
    '>>> The above terms apply to only hazarodus cargo only.',
    '>>> Exchange rate taken only for calculation purpose. (Final exchange rate will be differ)',
    '>>> Wooden Packaging: If wooden packaging is used, fumigation with an ISPM-15 stamp is mandatory. This will be the responsibility of the exporter.',
    '>>> Additional Services: Any landing, chocking, greasing, forklift, or crane services required will incur extra charges.',
    '>>> Hidden Charges: Any hidden charges incurred at the time of clearance and forwarding will be charged at actual costs, subject to prior approval.',
    '>>> GST: Extra, as applicable.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  defaultTerms.forEach((term, idx) => {
    doc.text(term, 12, footerY + 20 + idx * 4.2, { maxWidth: 185 });
  });
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

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

export const buildQuotePDF = (doc, quote) => {
  // Page width and height limits
  const pageWidth = 210;
  const pageHeight = 297;
  const customRows = getTradeChargeRows(quote?.tradeType || 'import');

  // Draw Page Border (8mm margins)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // --- Company Header Details (Top Left) ---
  // Logo placeholder text logo matching PARAMOUNT branding
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

  // --- Calculations & Notes Footer Block ---
  const finalY = doc.lastAutoTable.finalY;
  
  // Calculate average tax percentage for labels
  const avgTaxRate = quote.lineItems.length > 0 ? (quote.lineItems[0].tax || 0) : 0;
  const avgCgstRate = avgTaxRate / 2;
  const avgSgstRate = avgTaxRate / 2;

  const roundedTotal = Math.round(quote.total || 0);
  const roundingDiff = roundedTotal - (quote.total || 0);

  // Main vertical block separation line
  doc.line(116, finalY, 116, 281);

  // --- Right side calculations box ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  let rightY = finalY + 6;
  doc.text('Sub Total', 148, rightY);
  doc.text(`CGST${avgCgstRate} (${avgCgstRate}%)`, 148, rightY + 6);
  doc.text(`SGST${avgSgstRate} (${avgSgstRate}%)`, 148, rightY + 12);
  doc.text('Rounding', 148, rightY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Total', 148, rightY + 26);

  // Print values right-aligned
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(Number(quote.subtotal || 0).toFixed(2), 196, rightY, { align: 'right' });
  doc.text(Number(calculatedCgstSum || 0).toFixed(2), 196, rightY + 6, { align: 'right' });
  doc.text(Number(calculatedSgstSum || 0).toFixed(2), 196, rightY + 12, { align: 'right' });
  doc.text(Number(roundingDiff || 0).toFixed(2), 196, rightY + 18, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Rs.${Number(roundedTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 196, rightY + 26, { align: 'right' });

  // Divider lines inside calculations box
  doc.setDrawColor(200, 200, 200);
  doc.line(116, rightY + 21, 202, rightY + 21);
  doc.line(116, rightY + 29, 202, rightY + 29);

  // Authorized Signature bottom box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Authorized Signature', 159, 276, { align: 'center' });

  // --- Left side notes & terms ---
  let leftY = finalY + 6;
  
  // Total in Words
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Total In Words', 12, leftY);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(numberToIndianWords(roundedTotal), 12, leftY + 5, { maxWidth: 100 });

  // Notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Notes', 12, leftY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(quote.terms?.notes || 'Looking forward for your business.', 12, leftY + 19, { maxWidth: 100 });

  // Terms and conditions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Terms & Conditions', 12, leftY + 28);

  const defaultTerms = [
    `Payment Terms: ${quote.terms?.paymentTerms || '100% Advance.'}`,
    'Freight charges will be extra.',
    'Delivery Within 10 -12 Working Days.',
    'Prices: The price is quoted in INR.',
    'Bank Detail: Kotak Mahindra Bank,',
    'Branch: Chandan House, Opp.Abhijit 3, Ahmedabad.',
    'A/c. No.1512264287, IFSC Code : KKBK0000812',
    'Other Detail: PAN No. AAHCP4599D',
    'GSTIN No.- 24AAHCP4599D1Z8'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  
  let currentTermY = leftY + 33;
  defaultTerms.forEach(term => {
    doc.text(term, 12, currentTermY);
    currentTermY += 4;
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

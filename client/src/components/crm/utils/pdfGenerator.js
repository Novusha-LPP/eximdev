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

  // Company Template Branding Selection
  const template = (quote?.companyTemplate || 'paramount').toLowerCase();

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

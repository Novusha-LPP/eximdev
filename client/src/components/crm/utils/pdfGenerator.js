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
};

const buildSurajQuotePDF = (doc, quote) => {
  // Page width and height limits
  const pageWidth = 210;
  const pageHeight = 297;
  const customRows = getTradeChargeRows(quote?.tradeType || 'import');

  // Draw Page Border (8mm margins)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

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

  // --- Document Title (Top Right) ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.text('ESTIMATE', 196, 26, { align: 'right' });

  // Suraj Title Bar
  doc.setFillColor(156, 175, 199);
  doc.rect(8, 41, 194, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('QUOTATION', 105, 45.3, { align: 'center' });
  doc.setDrawColor(200, 200, 200);
  doc.line(8, 48, 202, 48);

  const yOff = 8;

  // --- Info Section Row ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('#', 14, 45 + yOff);
  doc.text('Estimate Date', 14, 49 + yOff);

  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.quoteNumber}`, 38, 45 + yOff);
  doc.text(`: ${new Date(quote.createdAt).toLocaleDateString('en-IN')}`, 38, 49 + yOff);

  doc.setFont('helvetica', 'bold');
  doc.text('Place Of Supply', 110, 45 + yOff);
  doc.setFont('helvetica', 'normal');
  doc.text(`: ${quote.placeOfSupply || 'Gujarat (24)'}`, 136, 45 + yOff);

  // Divider below info row
  doc.line(8, 52 + yOff, 202, 52 + yOff);

  // --- Addresses (Bill To / Ship To) Title background ---
  doc.setFillColor(241, 245, 249); // slate-100 gray
  doc.rect(8.2, 52.2 + yOff, 193.6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Bill To', 14, 56.5 + yOff);
  doc.text('Ship To', 110, 56.5 + yOff);

  // Vertical line divider for addresses
  doc.line(106, 52 + yOff, 106, 80 + yOff);

  // Address text content
  const customerName = quote.accountId?.name || 'Customer Name';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(customerName, 14, 63 + yOff);
  doc.text(customerName, 110, 63 + yOff);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  // Wrap address text lines cleanly
  doc.text(quote.billToAddress || '', 14, 67 + yOff, { maxWidth: 85 });
  doc.text(quote.shipToAddress || quote.billToAddress || '', 110, 67 + yOff, { maxWidth: 85 });

  // Divider below addresses
  doc.line(8, 80 + yOff, 202, 80 + yOff);

  // --- Line Items Table ---
  const startY = 88;
  const tableHeaders = [
    [
      { content: 'Particulars', styles: { halign: 'center', fillColor: [191, 219, 254], textColor: [15, 23, 42], fontStyle: 'bold' } },
      { content: 'Qty', styles: { halign: 'center', fillColor: [191, 219, 254], textColor: [15, 23, 42], fontStyle: 'bold' } },
      { content: 'Unit Price', styles: { halign: 'center', fillColor: [191, 219, 254], textColor: [15, 23, 42], fontStyle: 'bold' } },
      { content: 'Tax %', styles: { halign: 'center', fillColor: [191, 219, 254], textColor: [15, 23, 42], fontStyle: 'bold' } },
      { content: 'Amount (Rs)', styles: { halign: 'center', fillColor: [191, 219, 254], textColor: [15, 23, 42], fontStyle: 'bold' } }
    ]
  ];

  const items = quote.lineItems || [];
  const tableRows = items.map((it) => {
    return [
      it.productName || '',
      it.quantity || 1,
      Number(it.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      it.tax ? `${it.tax}%` : '-',
      Number(it.lineTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ];
  });

  doc.autoTable({
    startY: startY,
    head: tableHeaders,
    body: tableRows,
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
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 40, halign: 'right' }
    },
    margin: { left: 8, right: 8 }
  });

  const grandTotal = quote.total || quote.lineItems?.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0) || 0;

  doc.setFillColor(140, 92, 180);
  doc.rect(8, doc.lastAutoTable.finalY + 4, 194, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL', 14, doc.lastAutoTable.finalY + 10.5);
  doc.text(`Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 196, doc.lastAutoTable.finalY + 10.5, { align: 'right' });

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
  const pw = 210;
  const m = 14;
  const cw = pw - 2 * m;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('QUOTATION FOR PLASTIC CRATES', m, m + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Quotation No.: ${quote.quoteNumber || '_______'}`, m, m + 20);
  doc.text(`Date: ${new Date(quote.createdAt || Date.now()).toLocaleDateString('en-IN')}`, m, m + 25);

  doc.text('To,', m, m + 35);
  doc.text(`M/s. ${quote.accountId?.name || '_________________________'}`, m, m + 40);
  doc.text(`Address: ${quote.billToAddress || '_________________________'}`, m, m + 45);
  doc.text('GSTIN: _________________________', m, m + 50);

  doc.setFont('helvetica', 'bold');
  doc.text('Subject: Quotation for Supply of Plastic Crates', m, m + 60);

  doc.setFont('helvetica', 'normal');
  doc.text('Dear Sir/Madam,', m, m + 70);
  doc.text('We are pleased to submit our quotation for the supply of HDPE/PP Plastic Crates as per the required specifications.', m, m + 80, { maxWidth: cw });

  doc.setFont('helvetica', 'bold');
  doc.text('PLASTIC CRATE PRICE LIST', m, m + 92);

  const sizes = [
    '600 × 400 × 150 mm', '600 × 400 × 200 mm', '600 × 400 × 250 mm', '600 × 400 × 300 mm',
    '600 × 400 × 350 mm', '600 × 400 × 400 mm', '500 × 350 × 150 mm', '500 × 350 × 200 mm',
    '400 × 300 × 150 mm', '400 × 300 × 200 mm', '400 × 300 × 250 mm', '300 × 200 × 150 mm'
  ];

  doc.autoTable({
    startY: m + 95,
    head: [['Sr. No.', 'Crate Size (L × W × H)', 'Approx. Capacity', 'Material', 'Unit Price']],
    body: sizes.map((size, idx) => [
      String(idx + 1),
      size,
      '______ Ltr.',
      'PP / HDPE',
      'Rs ______ / Pc'
    ]),
    theme: 'plain',
    headStyles: { fontStyle: 'bold', textColor: [0, 0, 0] },
    bodyStyles: { textColor: [0, 0, 0] },
    margin: { left: m, right: m }
  });

  const nextY = doc.lastAutoTable.finalY + 10;
  
  doc.setFont('helvetica', 'bold');
  doc.text('SPECIFICATIONS', m + 10, nextY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const specs = [
    'Product: Plastic Crate', 'Material: PP / HDPE', 'Colour: ____________',
    'Crate Type: Open / Closed / Ventilated', 'Loading Capacity: ____________',
    'Weight per Crate: ____________ Kg', 'Stackable: Yes / No', 'Food Grade: Yes / No',
    'Printing / Logo: Available on request', 'Custom Colour: Available subject to MOQ',
    'Custom Size: Available as per mould/design requirements'
  ];
  let sy = nextY + 8;
  specs.forEach(sp => {
    doc.text(sp, m + 15, sy);
    sy += 5;
  });

  doc.addPage();
  let py = 20;
  doc.setFont('helvetica', 'bold');
  doc.text('COMMERCIAL TERMS', m, py);
  
  doc.autoTable({
    startY: py + 5,
    head: [['Particulars', 'Terms']],
    body: [
      ['Price Basis', 'Ex-Works / FOR __________'],
      ['GST', 'Extra as applicable'],
      ['Packing', 'Included / Extra'],
      ['Freight', 'Extra / Included'],
      ['Minimum Order Quantity', '__________ pcs'],
      ['Delivery', '______ days from confirmed order'],
      ['Payment Terms', `${quote.terms?.paymentTerms || '______% Advance / ______ days'}`],
      ['Price Validity', '30 days'],
      ['Mould / Die Charges', 'Extra, if applicable'],
      ['Transportation', 'Extra / At Actual'],
      ['Loading Charges', 'Extra / Included']
    ],
    theme: 'plain',
    headStyles: { fontStyle: 'bold', textColor: [0, 0, 0] },
    bodyStyles: { textColor: [0, 0, 0] },
    margin: { left: m + 10, right: m + 10 }
  });

  let ny = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('NOTE', m, ny);
  doc.setFont('helvetica', 'normal');
  const notes = [
    '1. Final price will depend on crate size, weight, material grade, colour, design and quantity.',
    '2. Any change in raw material or product specification may result in a change in price.',
    '3. GST will be charged as applicable.',
    '4. Freight and transportation charges will be charged separately unless specifically included in the quotation.',
    '5. Custom printing/logo and special colours are subject to MOQ and additional charges.',
    '6. Delivery period will be confirmed at the time of purchase order.'
  ];
  
  ny += 8;
  notes.forEach(n => {
    doc.splitTextToSize(n, cw).forEach(line => {
      doc.text(line, m, ny);
      ny += 5;
    });
    ny += 3;
  });

  ny += 10;
  doc.text('We look forward to receiving your valued order and assure you of quality products and timely delivery.', m, ny);
  
  ny += 15;
  doc.text('For Paramount Propack Pvt Ltd', m, ny);
  ny += 20;
  doc.text('Authorized Signatory', m, ny);
  ny += 10;
  doc.text('Name: ______________________________', m, ny);
  doc.text('Designation: ________________________', m, ny + 5);
  doc.text('Mobile: _____________________________', m, ny + 10);
  doc.text('Email: ______________________________', m, ny + 15);
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

export const buildQuotePDF = (doc, quote) => {
  const tradeType = quote?.tradeType || 'import';
  if (tradeType === 'transport') {
    buildTransportQuotePDF(doc, quote);
  } else if (tradeType === 'pfp') {
    buildParamountQuotePDF(doc, quote);
  } else if (tradeType === 'software_elock') {
    buildElockQuotePDF(doc, quote);
  } else {
    buildSurajQuotePDF(doc, quote);
  }
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

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

export const buildQuotePDF = (doc, quote) => {
  // Page width and height limits
  const pageWidth = 210;
  const pageHeight = 297;

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
  // Double-row header structure to match CGST and SGST subheadings
  const tableHeaders = [
    [
      { content: '#', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'Item & Description', rowSpan: 2, styles: { valign: 'middle' } },
      { content: 'HSN/SAC', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'Qty', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      { content: 'Rate', rowSpan: 2, styles: { valign: 'middle', halign: 'right' } },
      { content: 'CGST', colSpan: 2, styles: { halign: 'center' } },
      { content: 'SGST', colSpan: 2, styles: { halign: 'center' } },
      { content: 'Amount', rowSpan: 2, styles: { valign: 'middle', halign: 'right' } }
    ],
    [
      { content: '%', styles: { halign: 'center' } },
      { content: 'Amt', styles: { halign: 'right' } },
      { content: '%', styles: { halign: 'center' } },
      { content: 'Amt', styles: { halign: 'right' } }
    ]
  ];

  let calculatedCgstSum = 0;
  let calculatedSgstSum = 0;

  const tableRows = quote.lineItems.map((item, index) => {
    const lineSubtotal = item.quantity * item.unitPrice;
    const discountAmt = lineSubtotal * ((item.discount || 0) / 100);
    const baseForTax = lineSubtotal - discountAmt;
    const taxRate = item.tax || 0;
    
    // Split GST equally into CGST & SGST
    const cgstRate = taxRate / 2;
    const sgstRate = taxRate / 2;
    
    const cgstAmt = baseForTax * (cgstRate / 100);
    const sgstAmt = baseForTax * (sgstRate / 100);

    calculatedCgstSum += cgstAmt;
    calculatedSgstSum += sgstAmt;

    return [
      index + 1,
      item.productName + (item.description ? `\n${item.description}` : ''),
      item.hsnSac || '392310',
      Number(item.quantity).toFixed(2),
      Number(item.unitPrice).toFixed(2),
      cgstRate ? `${cgstRate}%` : '0%',
      cgstAmt ? cgstAmt.toFixed(2) : '0.00',
      sgstRate ? `${sgstRate}%` : '0%',
      sgstAmt ? sgstAmt.toFixed(2) : '0.00',
      Number(item.lineTotal).toFixed(2)
    ];
  });

  doc.autoTable({
    startY: 80,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [30, 41, 59],
      fontSize: 7.5,
      fontStyle: 'bold',
      lineWidth: 0.15,
      lineColor: [200, 200, 200]
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      lineWidth: 0.15,
      lineColor: [200, 200, 200]
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 62 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 10, halign: 'center' },
      8: { cellWidth: 18, halign: 'right' },
      9: { cellWidth: 21, halign: 'right' }
    },
    margin: { left: 8, right: 8 }
  });

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

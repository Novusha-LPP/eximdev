import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const printAuthorizationPDF = (row, subData) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  let currentY = 15;

  // --- Title ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DGFT LICENSE REPORT', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // --- Horizontal Line ---
  doc.setDrawColor(30, 41, 59); // Dark blue / slate line
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 8;

  // --- General Info Box ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('General Information', margin, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const drawGeneralInfoCell = (lbl, val, x, y) => {
    doc.setFont('helvetica', 'bold');
    doc.text(lbl + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val || '—'), x + 35, y);
  };

  drawGeneralInfoCell('Firm Name', row.party_name, margin, currentY);
  drawGeneralInfoCell('IEC Number', row.iec_no, margin + (contentWidth / 2), currentY);
  currentY += 5;

  drawGeneralInfoCell('Authorization No', row.licence_no || row.registration_no, margin, currentY);
  drawGeneralInfoCell('Auth Date', row.licence_date || row.auth_date, margin + (contentWidth / 2), currentY);
  currentY += 5;

  drawGeneralInfoCell('Import Validity', subData.import_validity, margin, currentY);
  drawGeneralInfoCell('Export Validity', subData.export_validity, margin + (contentWidth / 2), currentY);
  currentY += 5;

  drawGeneralInfoCell('Scheme Code', subData.scheme_code, margin, currentY);
  drawGeneralInfoCell('Notification No', subData.notification_number, margin + (contentWidth / 2), currentY);
  currentY += 8;

  // --- Compliance & Documents ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Compliance & Documents', margin, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  drawGeneralInfoCell('BG Number', subData.bg_number, margin, currentY);
  drawGeneralInfoCell('BG Expiry Date', subData.bg_expiry_date, margin + (contentWidth / 2), currentY);
  currentY += 5;

  drawGeneralInfoCell('BG Amount', subData.bg_amount, margin, currentY);
  drawGeneralInfoCell('Bond Number', subData.bond_number, margin + (contentWidth / 2), currentY);
  currentY += 5;

  drawGeneralInfoCell('Bond Expiry Date', subData.bond_expiry_date, margin, currentY);
  drawGeneralInfoCell('Bond Amount', subData.bond_amount, margin + (contentWidth / 2), currentY);
  currentY += 5;

  // Suppressed Docs Recv Date and Docs Sent to ICD per request. Display Sent to Accounts.
  drawGeneralInfoCell('Docs to Accounts', subData.documents_send_to_accounts, margin, currentY);
  currentY += 8;

  // --- Summary cards in a table-like structure ---
  const totalLicensedQty = (subData.import_details_array || []).reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
  const totalUtilizedQty = (subData.import_details_array || []).reduce((sum, item) => sum + (parseFloat(item.total_utilized_qty) || 0), 0);
  const totalBalanceQty = Math.max(0, totalLicensedQty - totalUtilizedQty);

  const totalLicensedUSD = (subData.import_details_array || []).reduce((sum, item) => sum + (parseFloat(item.value_usd) || 0), 0);
  const totalUtilizedUSD = (subData.import_details_array || []).reduce((sum, item) => sum + (parseFloat(item.total_utilized_usd) || 0), 0);
  const totalBalanceUSD = Math.max(0, totalLicensedUSD - totalUtilizedUSD);

  const totalLicensedINR = (subData.import_details_array || []).reduce((sum, item) => sum + (parseFloat(item.value_rs) || 0), 0);
  const totalUtilizedINR = (subData.import_details_array || []).reduce((sum, item) => sum + (parseFloat(item.total_utilized_inr) || 0), 0);
  const totalBalanceINR = Math.max(0, totalLicensedINR - totalUtilizedINR);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary Cards (Import)', margin, currentY);
  currentY += 4;

  doc.autoTable({
    startY: currentY,
    head: [['Metric', 'Licensed', 'Utilized', 'Balance']],
    body: [
      [
        'Quantity',
        totalLicensedQty.toLocaleString('en-IN', { maximumFractionDigits: 3 }),
        totalUtilizedQty.toLocaleString('en-IN', { maximumFractionDigits: 3 }),
        totalBalanceQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })
      ],
      [
        'CIF Value (USD)',
        `$${totalLicensedUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
        `$${totalUtilizedUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
        `$${totalBalanceUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
      ],
      [
        'CIF Value (INR)',
        `₹${totalLicensedINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
        `₹${totalUtilizedINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
        `₹${totalBalanceINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, textColor: [0, 0, 0], font: 'helvetica' },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: margin, right: margin }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // --- Item Table (Import) ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Item Details (Import)', margin, currentY);
  currentY += 4;

  const itemBody = (subData.import_details_array || []).map((item, index) => {
    const qtyVal = parseFloat(item.qty) || 0;
    const utilizedQtyVal = parseFloat(item.total_utilized_qty) || 0;
    const balanceQtyVal = Math.max(0, qtyVal - utilizedQtyVal);
    const utilPct = qtyVal > 0 ? Math.round((utilizedQtyVal / qtyVal) * 100) : 0;
    return [
      index + 1,
      item.hs_code || '—',
      item.item_description || '—',
      `${qtyVal.toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${item.unit || ''}`,
      `${utilizedQtyVal.toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${item.unit || ''}`,
      `${balanceQtyVal.toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${item.unit || ''}`,
      `${utilPct}%`
    ];
  });

  doc.autoTable({
    startY: currentY,
    head: [['Sr No', 'HS Code', 'Description', 'Licensed Qty', 'Utilized Qty', 'Balance Qty', 'Utilization %']],
    body: itemBody,
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0] },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 20 },
      2: { cellWidth: 50 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'center' }
    },
    margin: { left: margin, right: margin }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // --- Item Table (Export) ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Item Details (Export)', margin, currentY);
  currentY += 4;

  const exportBody = (subData.export_details_array || []).map((item, index) => {
    const qtyVal = parseFloat(item.qty) || 0;
    const usdVal = parseFloat(item.value_usd) || 0;
    const inrVal = parseFloat(item.value_rs) || 0;
    return [
      index + 1,
      item.hs_code || '—',
      item.item_description || '—',
      `${qtyVal.toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${item.unit || ''}`,
      `$${usdVal.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
      `₹${inrVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    ];
  });

  doc.autoTable({
    startY: currentY,
    head: [['Sr No', 'HS Code', 'Description', 'Export Qty', 'FOB USD', 'FOB Rs']],
    body: exportBody.length > 0 ? exportBody : [['No export details found', '', '', '', '', '']],
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0] },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 20 },
      2: { cellWidth: 50 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // --- Utilization Transactions ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Utilization Transactions', margin, currentY);
  currentY += 4;

  const formatDate = (val) => {
    if (!val) return '—';
    const str = String(val).trim();
    if (str.includes('/')) return str;
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }
    } catch (e) {}
    return str;
  };

  const txBody = (subData.utilization_records || []).map((item, index) => {
    return [
      item.be_no || '—',
      formatDate(item.be_date),
      item.job_no || '—',
      `${(item.qty || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${item.unit || ''}`,
      `$${(item.cif_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `₹${(item.cif_inr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ];
  });

  doc.autoTable({
    startY: currentY,
    head: [['BE No', 'BE Date', 'Job No', 'Qty Utilized', 'CIF USD', 'CIF INR']],
    body: txBody.length > 0 ? txBody : [['No utilization records found', '', '', '', '', '']],
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0] },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 22 },
      2: { cellWidth: 32 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });

  const authClean = String(row.licence_no || row.registration_no || 'Unknown').replace(/\//g, '-');
  doc.save(`DGFT_Authorization_Utilization_Report_${authClean}.pdf`);
};

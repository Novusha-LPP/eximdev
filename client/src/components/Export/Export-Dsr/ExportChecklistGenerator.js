import React from 'react';
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from 'axios';
import { IconButton, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

const ExportChecklistGenerator = ({ jobNo, renderAsIcon = false }) => {

  // ==================== CONSTANTS ====================
  const PAGE_CONFIG = {
    width: 595.28,
    height: 841.89,
    margins: {
      left: 20,
      right: 20,
      top: 25,
      bottom: 30
    }
  };

  const FONT_SIZES = {
    title: 14,
    sectionHeader: 11,
    fieldLabel: 8,
    fieldValue: 9,
    footer: 8,
    declaration: 10,
    tableHeader: 9,
    tableContent: 8
  };

  // ==================== HELPER FUNCTIONS ====================

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const createPDFHelpers = (pdf) => {
    const centerX = PAGE_CONFIG.width / 2;
    const rightX = PAGE_CONFIG.width - PAGE_CONFIG.margins.right;
    const leftX = PAGE_CONFIG.margins.left;

    return {
      drawLine: (x1, y, x2, lineWidth = 0.6) => {
        pdf.setLineWidth(lineWidth);
        pdf.line(x1, y, x2, y);
      },

      drawField: (label, value, x, y, labelWidth = 90, maxWidth = 250) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(`${label}:`, x, y);

        if (value) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(FONT_SIZES.fieldValue);

          const valueStr = value.toString();
          const valueX = x + labelWidth;
          const availableWidth = maxWidth - labelWidth;

          const textLines = pdf.splitTextToSize(valueStr, availableWidth);
          pdf.text(textLines, valueX, y);
          return y + (textLines.length * 13);
        }

        return y + 13;
      },

      addHeader: (pageNum, totalPages, customStation, aeoRegistrationNo, aeoRole, currentDate) => {
        let y = PAGE_CONFIG.margins.top;

        // Line 1: Firm Name Center
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(FONT_SIZES.title);
        pdf.text('SURAJ FORWARDERS & SHIPPING AGENCIES', centerX, y, { align: 'center' });

        // Left below firm name, Custom Station
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(`Custom stn: ${customStation || ''}`, leftX, y + 13);

        // Center below firm name, Section Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(FONT_SIZES.sectionHeader);
        pdf.text('Checklist for Shipping Bill', centerX, y + 13, { align: 'center' });

        // Right, Page Number
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(`${pageNum}/${totalPages}`, rightX, y + 13, { align: 'right' });

        // --- Next Line: Printed On (Left), AEO Reg. No (Center), AEO Role (Right)
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(`Printed On : ${currentDate || ''}`, leftX, y + 40);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(FONT_SIZES.fieldValue);
        pdf.text(`AEO Registration No. ${aeoRegistrationNo || ''}`, centerX, y + 40, { align: 'center' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(FONT_SIZES.fieldLabel);
        pdf.text(`AEO Role : ${aeoRole || ''}`, rightX, y + 40, { align: 'right' });
      },

      centerX,
      rightX,
      leftX
    };
  };

  // ==================== PAGE RENDERERS ====================

const renderPage1 = (pdf, helpers, data) => {
  const { drawLine, drawField, leftX, rightX, centerX } = helpers;
  let yPos = 80;

  const leftColX = leftX;
  const rightColX = centerX + 20;
  const colWidth = 250;

  // First horizontal line
  drawLine(leftX, yPos, rightX);
  yPos += 8;

  // First row: SB No./Date and Party Ref on same line
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.fieldLabel);
  pdf.text('SB No. / Date', leftColX, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONT_SIZES.fieldValue);
  pdf.text(`${data.sbNumber} dt ${data.sbDate}`, leftColX + 85, yPos);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Party Ref', rightColX, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.partyRef, rightColX + 60, yPos);

  yPos += 12;

  // Second row: Job No and CONSIGNEE on same line
  pdf.setFont('helvetica', 'bold');
  pdf.text('Job No', leftColX, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.jobNumber, leftColX + 50, yPos);

  yPos += 12;

  // Third row: CHA only on left side
  pdf.setFont('helvetica', 'bold');
  pdf.text('CHA', leftColX, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.chaCode, leftColX + 35, yPos);

  yPos += 15;

  // EXPORTER DETAILS (Left Column) and CONSIGNEE details (Right Column)
  // Left Column: EXPORTER DETAILS
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.fieldLabel);
  pdf.text('EXPORTER DETAILS', leftColX, yPos);

  pdf.setFont('helvetica', 'bold');
  pdf.text('CONSIGNEE', rightColX, yPos);
  pdf.setFont('helvetica', 'normal');
 
  let exporterY = yPos + 10;
  const exporterLines = [
    data.exporterGstin || "AATCA3129J",
    data.exporterGstinFull || "GSTIN: 24AATCA3129J2ZH",
    data.exporterPan || "PAN No: AATCA3129J",
    data.exporterType || "Exporter Type: Merchant Exporter",
    data.exporterName || "ANEETA PACKAGING PRIVATE LIMITED",
    data.exporterBranch || "Branch Ser #1",
    data.exporterAddress1 || "1103 - 1104, Parshwanath Business Park,",
    data.exporterAddress2 || "Near Auda, Garden,",
    data.exporterAddress3 || "Prahladnagar"
  ];

  exporterLines.forEach(line => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(FONT_SIZES.fieldValue);
    pdf.text(line, leftColX, exporterY);
    exporterY += 9;
  });

  // Right Column: CONSIGNEE details - start from same Y position as exporter
  let consigneeY = yPos + 10; // Start at same Y as exporter details
  const consigneeLines = [
    data.consigneeName || "TO ORDER",
    data.consigneeCountry1 || "UK", 
    data.consigneeCountry2 || "United Kingdom"
  ];

  consigneeLines.forEach(line => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(FONT_SIZES.fieldValue);
    pdf.text(line, rightColX, consigneeY);
    consigneeY += 9;
  });

  // Move yPos to the bottom of whichever column is longer
  yPos = Math.max(exporterY, consigneeY) + 8;

  // Continue with the rest of the code...
  const leftFields = [
    { label: 'Port Of Loading', value: data.portOfLoading },
    { label: 'Port Of Discharge', value: data.portOfDischarge },
    { label: 'Port Of Destination', value: data.portOfDestination },
    { label: 'Discharge Country', value: data.dischargeCountry },
    { label: 'Country of Dest', value: data.countryOfDest },
    { label: 'Master BL No.', value: data.masterBlNo },
    { label: 'House BL No.', value: data.houseBlNo },
    { label: 'Rotation No/Dt.', value: data.rotationNo },
    { label: 'State of Origin', value: data.stateOfOrigin },
    { label: 'Ad. Code', value: data.adCode },
    { label: 'Forex Bank A/c No', value: data.forexBankAcNo },
    { label: 'RBI Waiver No/Dt', value: data.rbiWaiverNo },
    { label: 'DBK Bank A/c No', value: data.dbkBankAcNo }
  ];

  const rightFields = [
    { label: 'Nature of Cargo', value: data.natureOfCargo },
    { label: 'Total Packages', value: data.totalPackages },
    { label: 'No Of Cntnrs', value: data.numberOfContainers },
    { label: 'Loose pkts.', value: data.loosePackets },
    { label: 'Gross Weight', value: data.grossWeight },
    { label: 'Net Weight', value: data.netWeight },
    { label: 'Total FOB (INR)', value: data.totalFobInr },
    { label: 'IGST Taxable Value(INR)', value: data.igstTaxableValue },
    { label: 'IGST Amount(INR)', value: data.igstAmount },
    { label: 'Comp. Cess (INR)', value: data.compCess },
    { label: 'DBK+STR (INR)', value: data.dbkStr },
    { label: 'STR Amount (INR)', value: data.strAmount },
    { label: 'Total DBK (INR)', value: data.totalDbk },
    { label: 'RODTEP Amount(INR)', value: data.rodtepAmount }
  ];

  let leftY = yPos;
  let rightY = yPos;

  // Draw both columns of main data
  const maxRows = Math.max(leftFields.length, rightFields.length);
  for (let i = 0; i < maxRows; i++) {
    if (leftFields[i]) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(FONT_SIZES.fieldLabel);
      pdf.text(leftFields[i].label, leftColX, leftY);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(FONT_SIZES.fieldValue);
      pdf.text(leftFields[i].value, leftColX + 100, leftY);
    }

    if (rightFields[i]) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(FONT_SIZES.fieldLabel);
      pdf.text(rightFields[i].label, rightColX, rightY);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(FONT_SIZES.fieldValue);
      pdf.text(rightFields[i].value, rightColX + 100, rightY);
    }

    leftY += 12;
    rightY += 12;
  }

  yPos = leftY + 8;

  // Invoice Details section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.fieldValue);
  pdf.text('Invoice Details: Invoice 1 / 1', leftColX, yPos);
  yPos += 12;

  // Invoice fields in two columns
  const invoiceLeftFields = [
    { label: 'Inv. No', value: data.invoiceNo },
    { label: 'Inv. Date', value: data.invoiceDate },
    { label: 'Nature of contract', value: data.natureOfContract },
    { label: 'Unit Price Includes', value: data.unitPriceIncludes },
    { label: 'Inv. Currency', value: data.invoiceCurrency }
  ];

  const invoiceRightFields = [
    { label: 'Inv. Value', value: data.invoiceValue },
    { label: 'FOB Value', value: data.fobValue },
    { label: 'Exp Contract No.', value: data.expContractNo },
    { label: 'Exp Contract Date', value: data.expContractDate },
    { label: 'Exch. Rate', value: data.exchangeRate }
  ];

  let invoiceLeftY = yPos;
  let invoiceRightY = yPos;

  for (let i = 0; i < 5; i++) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(FONT_SIZES.fieldLabel);
    pdf.text(invoiceLeftFields[i].label, leftColX, invoiceLeftY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(FONT_SIZES.fieldValue);
    pdf.text(invoiceLeftFields[i].value, leftColX + 80, invoiceLeftY);

    pdf.setFont('helvetica', 'bold');
    pdf.text(invoiceRightFields[i].label, rightColX, invoiceRightY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(invoiceRightFields[i].value, rightColX + 80, invoiceRightY);

    invoiceLeftY += 12;
    invoiceRightY += 12;
  }

  yPos = invoiceLeftY + 8;

  // Rate table header
  yPos += 12;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.tableHeader);
  pdf.text('Rate', leftColX + 80, yPos);
  pdf.text('Currency', leftColX + 150, yPos);
  pdf.text('Amount', leftColX + 220, yPos);
  yPos += 10;

  // Rate items - empty values as shown in first image
  const rateItems = ['Insurance', 'Freight', 'Discount', 'Commission', 'Other Deduction', 'Packing Charges'];
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONT_SIZES.tableContent);

  rateItems.forEach(item => {
    pdf.text(item, leftColX , yPos);
    yPos += 10;
  });

  yPos += 5;
  yPos += 12;

  // Nature Of Payment and Period Of Payment on same line - exactly like first image
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.fieldLabel);
  pdf.text('Nature Of Payment', leftColX, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONT_SIZES.fieldValue);
  pdf.text(data.natureOfPayment || 'AP', leftColX + 100, yPos);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Period Of Payment', rightColX, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.periodOfPayment || '0 days', rightColX + 90, yPos);

  yPos += 12;

  // Marks & Nos - exactly like first image
  pdf.setFont('helvetica', 'bold');
  pdf.text('Marks & Nos', leftColX, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.marksAndNos || 'WE INTEND TO CLAIM BENEFIT UNDER RODTEP SCHEME AS APPLICABLE.', leftColX + 70, yPos);
  yPos += 12;

  yPos += 5;
  yPos += 12;

  // Buyer's Name & Address section - exactly like first image
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.fieldLabel);
  pdf.text("Buyer's Name & Address", leftColX, yPos);
  yPos += 12;

  // Buyer address on left side
  const buyerLines = pdf.splitTextToSize(data.buyerName || "FARRAG PACKAGING\n3 SHELDON AVENUE\nVICARS CROSS\nCHESTER CH3 5LF UNITED KINGDOM", colWidth - 20);
  buyerLines.forEach(line => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(FONT_SIZES.fieldValue);
    pdf.text(line, leftColX, yPos);
    yPos += 10;
  });

  // AEO details and Third Party on right side - exactly like first image
  let rightDetailsY = yPos - (buyerLines.length * 10) - 5; // Align with buyer details start

  const rightDetails = [
    { label: 'AEO Code', value: data.buyerAeoCode || '' },
    { label: 'AEO Country', value: data.buyerAeoCountry || '' },
    { label: 'AEO Role', value: data.buyerAeoRole || '' },
    { label: 'Third Party Name & Addr.', value: data.thirdPartyDetails || "STAINGARD LTD\nUNIT 7 - 9, BURNELL ROAD\nELLESMERE PORT CH65 5EX" }
  ];

  rightDetails.forEach(detail => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(FONT_SIZES.fieldLabel);
    pdf.text(detail.label, rightColX, rightDetailsY);
    
    if (detail.value) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(FONT_SIZES.fieldValue);
      const valueLines = pdf.splitTextToSize(detail.value, colWidth - 20);
      valueLines.forEach((line, index) => {
        pdf.text(line, rightColX, rightDetailsY + 10 + (index * 9));
      });
      rightDetailsY += (valueLines.length * 9) + 12;
    } else {
      rightDetailsY += 12;
    }
  });

  yPos = Math.max(yPos, rightDetailsY) + 8;

  // EOU Details - exactly like first image
  pdf.setFont('helvetica', 'bold');
  pdf.text('EOU', leftColX, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.eou || '', leftColX + 30, yPos);

  pdf.setFont('helvetica', 'bold');
  pdf.text('IEC', leftColX + 100, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.iec || '', leftColX + 130, yPos);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Branch Sno', leftColX + 200, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.branchSno || '0', leftColX + 260, yPos);

  yPos += 12;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Factory Address', leftColX, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.factoryAddress || '', leftColX + 80, yPos);

  return yPos + 20;
};

// ==================== NEW PAGE FOR ITEM DETAILS ====================

const renderItemDetailsPage = (pdf, helpers, data) => {
  const { drawLine, leftX, rightX } = helpers;
  let yPos = 80;

  // ITEM DETAILS Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.sectionHeader);
  pdf.text('ITEM DETAILS', leftX, yPos);
  yPos += 10;
  drawLine(leftX, yPos, rightX);
  yPos += 15;

  // Process each item
  if (data.products && data.products.length > 0) {
    data.products.forEach((product, index) => {
      // Item Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      const itemHeader = `Item #${index + 1} - Sl No: ${product.slNo || (index + 1)} | RITC Code: ${product.ritc || '80198-5789'}`;
      pdf.text(itemHeader, leftX, yPos);
      yPos += 10;

      // Define grid layout
      const col1X = leftX + 5;
      const col2X = col1X + 80;
      const col3X = col2X + 100;
      const col4X = col3X + 80;
      const lineHeight = 7;
      
      pdf.setFontSize(9);
      
      // Row 1: Qty and Unit
      pdf.setFont('helvetica', 'bold');
      pdf.text('Qty', col1X, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(product.quantity || '27'), col2X, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Unit', col3X, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(product.per || '419'), col4X, yPos);
      yPos += lineHeight;

      // Row 2: Exim Scheme Code
      pdf.setFont('helvetica', 'bold');
      pdf.text('Exim Scheme Code', col1X, yPos);
      pdf.setFont('helvetica', 'normal');
      const eximText = product.eximCode || 'NFEI Catg Edward Item';
      pdf.text(eximText, col2X, yPos);
      yPos += lineHeight;

      // Row 3: Unit Price and FOB Value
      pdf.setFont('helvetica', 'bold');
      pdf.text('Unit Price (FOB Val(FC))', col1X, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(product.unitPrice || '365'), col2X, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('FOB Value (INR)', col3X, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(product.fobValueINR || '583104.96'), col4X, yPos);
      yPos += lineHeight;

      // Row 4: IGST Payment Status and IGST Taxable Value
      pdf.setFont('helvetica', 'bold');
      pdf.text('IGST Pymt Status', col1X, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text((product.igstPaymentStatus || 'P') + ' (18%)', col2X, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('IGST Taxable Value', col3X, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(product.taxableValueINR || '529'), col4X, yPos);
      yPos += lineHeight;

      // Row 5: Total Value and Total PMV
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total Value (FQM/Unit)', col1X, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(product.amount || '575'), col2X, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total PMV (INR)', col3X, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(product.totalPMV || '108'), col4X, yPos);
      yPos += lineHeight;

      // Row 6: IGST Amount and Total
      pdf.setFont('helvetica', 'bold');
      pdf.text('IGST Amount', col1X, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(product.igstAmountINR || '415'), col2X, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total', col3X, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(product.total || '338'), col4X, yPos);
      yPos += lineHeight + 3;

      // Description
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      const description = product.description || 'Pellentesque quidem totam. Aperiam quod excepturi eligendi quia molestiae delectus reprehenderit tempora laudantium cupiditate aut est. Sapiente totam illum cumque quas eligendi ipsum. Etus at officiis eveniet ratione totam accusamus doloremque etus ipsa. Culpa architecto ex ipsum beatae doloremque cumque tempora fuga consequatur eaque. Tenetur laboriosam optio veritatis porro. Voluptatum omnis quidem similique nulla recusandae corrupti. Laudantium sequi atque expedita distinctio. Volutpat quia neque dolor nostrum placeat quo.';
      const descriptionLines = pdf.splitTextToSize(description, rightX - col1X - 10);
      
      descriptionLines.forEach(line => {
        pdf.text(line, col1X, yPos);
        yPos += 5;
      });

      yPos += 10;
      drawLine(leftX, yPos, rightX);
      yPos += 15;
    });
  } else {
    // Default item 1
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Item #1 - Sl No: 17 | RITC Code: 80198-5789', leftX, yPos);
    yPos += 10;

    const col1X = leftX + 5;
    const col2X = col1X + 80;
    const col3X = col2X + 100;
    const col4X = col3X + 80;
    const lineHeight = 7;
    
    pdf.setFontSize(9);
    
    // Row 1
    pdf.setFont('helvetica', 'bold');
    pdf.text('Qty', col1X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('27', col2X, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Unit', col3X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('419', col4X, yPos);
    yPos += lineHeight;

    // Row 2
    pdf.setFont('helvetica', 'bold');
    pdf.text('Exim Scheme Code', col1X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('NFEI Catg Edward Item', col2X, yPos);
    yPos += lineHeight;

    // Row 3
    pdf.setFont('helvetica', 'bold');
    pdf.text('Unit Price (FOB Val(FC))', col1X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('365', col2X, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FOB Value (INR)', col3X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('583104.96', col4X, yPos);
    yPos += lineHeight;

    // Row 4
    pdf.setFont('helvetica', 'bold');
    pdf.text('IGST Pymt Status', col1X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('P (18%)', col2X, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text('IGST Taxable Value', col3X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('529', col4X, yPos);
    yPos += lineHeight;

    // Row 5
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total Value (FQM/Unit)', col1X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('575', col2X, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total PMV (INR)', col3X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('108', col4X, yPos);
    yPos += lineHeight;

    // Row 6
    pdf.setFont('helvetica', 'bold');
    pdf.text('IGST Amount', col1X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('415', col2X, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total', col3X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('338', col4X, yPos);
    yPos += lineHeight + 3;

    // Description
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const description = 'Pellentesque quidem totam. Aperiam quod excepturi eligendi quia molestiae delectus reprehenderit tempora laudantium cupiditate aut est. Sapiente totam illum cumque quas eligendi ipsum. Etus at officiis eveniet ratione totam accusamus doloremque etus ipsa. Culpa architecto ex ipsum beatae doloremque cumque tempora fuga consequatur eaque. Tenetur laboriosam optio veritatis porro. Voluptatum omnis quidem similique nulla recusandae corrupti. Laudantium sequi atque expedita distinctio. Volutpat quia neque dolor nostrum placeat quo.';
    const descriptionLines = pdf.splitTextToSize(description, rightX - col1X - 10);
    
    descriptionLines.forEach(line => {
      pdf.text(line, col1X, yPos);
      yPos += 5;
    });

    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 15;

    // Default item 2
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Item #2 - Sl No: 341 | RITC Code: 93889-46887', leftX, yPos);
    yPos += 10;

    pdf.setFontSize(9);
    
    // Row 1
    pdf.setFont('helvetica', 'bold');
    pdf.text('Qty', col1X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('341', col2X, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Unit', col3X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Suscipit', col4X, yPos);
    yPos += lineHeight;

    // Row 2
    pdf.setFont('helvetica', 'bold');
    pdf.text('Exim Scheme Code', col1X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Maxime sufficient sapiente hit maxime MOT item', col2X, yPos);
    yPos += lineHeight;

    // Row 3
    pdf.setFont('helvetica', 'bold');
    pdf.text('Unit Price (FOB Val(FC))', col1X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('388', col2X, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FOB Value (INR)', col3X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('583104.96', col4X, yPos);
    yPos += lineHeight;

    // Row 4
    pdf.setFont('helvetica', 'bold');
    pdf.text('IGST Pymt Status', col1X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('P (18%)', col2X, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text('IGST Taxable Value', col3X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('263', col4X, yPos);
    yPos += lineHeight;

    // Row 5
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total Value (FQM/Unit)', col1X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('62', col2X, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total PMV (INR)', col3X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('95', col4X, yPos);
    yPos += lineHeight;

    // Row 6
    pdf.setFont('helvetica', 'bold');
    pdf.text('IGST Amount', col1X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('95', col2X, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total', col3X, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text('570', col4X, yPos);
    yPos += lineHeight + 3;

    // Description
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const description2 = 'Omnis unde odit facilis temporibus numquam. Similique tempore cum reprehenderit vix aspernatur aliquam. Similique unde iste. Molestiae beatae ullam labore et culpa iusto ratione. Aliquam quibusdam sed vel dolore excepturi incidunt alias. Alias esse minima vel facere unde. Perferendis ducimus tempore illo eum iste ipsum inventore assumenda. Quisquam similique nostrum ea quod quasi. Beatae quae voluptates fugiat dignissimos at. Occaecati nisi rerum architecto ipsam excepturi reprehenderit aspernatur accusamus soluta cum volutpas non voluptatius.';
    const descriptionLines2 = pdf.splitTextToSize(description2, rightX - col1X - 10);
    
    descriptionLines2.forEach(line => {
      pdf.text(line, col1X, yPos);
      yPos += 5;
    });

    yPos += 10;
    drawLine(leftX, yPos, rightX);
    yPos += 15;
  }

  // Summary Totals Section
  yPos += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.sectionHeader);
  pdf.text('SUMMARY TOTALS', leftX, yPos);
  yPos += 10;
  drawLine(leftX, yPos, rightX);
  yPos += 15;

  // Summary table with clean grid layout
  const summaryCol1X = leftX + 80;
  const summaryCol2X = summaryCol1X + 120;
  const summaryLineHeight = 10;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  
  // Headers with black background
  pdf.setFillColor(0, 0, 0);
  pdf.rect(summaryCol1X - 2, yPos - 7, 122, 10, 'F');
  pdf.rect(summaryCol2X - 2, yPos - 7, 102, 10, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.text('Description', summaryCol1X + 2, yPos);
  pdf.text('Amount (INR)', summaryCol2X + 2, yPos);
  yPos += summaryLineHeight + 2;

  // Reset text color
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  // Total PMV row
  pdf.text('Total PMV', summaryCol1X + 2, yPos);
  pdf.text(data.totalPmv || '641900.16', summaryCol2X + 95, yPos, { align: 'right' });
  yPos += summaryLineHeight;

  // Total IGST row
  pdf.text('Total IGST', summaryCol1X + 2, yPos);
  pdf.text(data.totalIgst || '104958.83', summaryCol2X + 95, yPos, { align: 'right' });
  yPos += summaryLineHeight;

  // Total PMV (Gross) row
  pdf.text('Total PMV (Gross)', summaryCol1X + 2, yPos);
  pdf.text(data.totalPmvGross || '641900.16', summaryCol2X + 95, yPos, { align: 'right' });
  yPos += summaryLineHeight;

  // Total IGST (Gross) row with black background
  pdf.setFillColor(0, 0, 0);
  pdf.rect(summaryCol1X - 2, yPos - 7, 122, 10, 'F');
  pdf.rect(summaryCol2X - 2, yPos - 7, 102, 10, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.text('Total IGST (Gross)', summaryCol1X + 2, yPos);
  pdf.text(data.totalIgstGross || '104958.83', summaryCol2X + 95, yPos, { align: 'right' });

  // Reset text color for future content
  pdf.setTextColor(0, 0, 0);

  return yPos + 20;
};

// Update the renderPage2 function to remove ITEM DETAILS and keep only DBK, VESSEL, CONTAINER details
const renderPage2 = (pdf, helpers, data) => {
  const { drawLine, drawField, leftX, rightX } = helpers;
  let yPos = 80;

  // DBK DETAILS SECTION
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.sectionHeader);
  pdf.text('DBK DETAILS', leftX, yPos);
  yPos += 10;
  drawLine(leftX, yPos, rightX);
  yPos += 17;

  // AutoTable for DBK Details
  const dbkHeaders = [
    'Inv No', 'Item No', 'DBK SI No', 'Custom Rate', 'DBK Rate', 
    'DBK Qty / Unit', 'DBK Amount', 'Custom SPE', 'DBK SPE'
  ];

  const dbkRows = Array.isArray(data.dbkData) ? data.dbkData : [data.dbkData];

  pdf.autoTable({
    head: [dbkHeaders],
    body: dbkRows.map(row => [
      row.invNo || '1',
      row.itemNo || '1',
      row.dbkSlNo || '392399B',
      row.customRate || '',
      row.dbkRate || '1.20',
      row.dbkQtyUnit || '209088.000 / PCS',
      row.dbkAmount || '6997.26',
      row.customSPE || '',
      row.dbkSPE || '0.00'
    ]),
    startY: yPos,
    styles: { 
      fontSize: FONT_SIZES.tableContent, 
      cellPadding: 2, 
      overflow: 'linebreak'
    },
    headStyles: { 
      fillColor: [220, 220, 220], 
      textColor: 0, 
      fontStyle: 'bold', 
      fontSize: FONT_SIZES.tableHeader 
    },
    margin: { left: leftX },
    tableWidth: rightX - leftX
  });

  yPos = pdf.lastAutoTable.finalY + 18;

  // VESSEL DETAILS
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.sectionHeader);
  pdf.text('VESSEL DETAILS', leftX, yPos);
  yPos += 10;
  drawLine(leftX, yPos, rightX);
  yPos += 17;

  const vesselFields = [
    { label: 'Factory Stuffed', value: data.factoryStuffed },
    { label: 'Seal Type', value: data.sealType },
    { label: 'Sample Acc.', value: data.sampleAcc },
    { label: 'Vessel Name', value: data.vesselName },
    { label: 'Voyage Number', value: data.voyageNumber }
  ];

  vesselFields.forEach(field => {
    yPos = drawField(field.label, field.value, leftX, yPos, 160);
    yPos += 9;
  });

  yPos += 9;

  // CONTAINER DETAILS
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.sectionHeader);
  pdf.text('CONTAINER DETAILS', leftX, yPos);
  yPos += 10;
  drawLine(leftX, yPos, rightX);
  yPos += 17;

  const containerHeaders = [
    'Container No', 'Size', 'Type', 'Seal No', 'Seal Type', 'Seal Date', 'Seal Device ID'
  ];

  const containerRows = Array.isArray(data.containerData) ? data.containerData : [data.containerData];

  pdf.autoTable({
    head: [containerHeaders],
    body: containerRows.map(container => [
      container.containerNo || 'FTAU1600308',
      container.size || '20',
      container.type || 'GP',
      container.sealNo || '',
      container.sealType || 'BTSL - Bottle Seal',
      container.sealDate || '',
      container.sealDeviceID || ''
    ]),
    startY: yPos,
    styles: { 
      fontSize: FONT_SIZES.tableContent, 
      cellPadding: 2 
    },
    headStyles: { 
      fillColor: [220, 220, 220], 
      textColor: 0, 
      fontStyle: 'bold' 
    },
    margin: { left: leftX },
    tableWidth: rightX - leftX
  });

  yPos = pdf.lastAutoTable.finalY + 18;

  // Additional Details
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.sectionHeader);
  pdf.text('Additional Details', leftX, yPos);
  yPos += 10;
  drawLine(leftX, yPos, rightX);
  yPos += 17;

  const additionalFields = [
    { label: 'Inv/Item SLN', value: data.invItemSln || '1/1' },
    { label: 'SQC Qty/Unit', value: data.sqcQtyUnit || '1890.000000 KGS' },
    { label: 'Origin District', value: data.originDistrict || '446 - GANDHINAGAR' },
    { label: 'Origin State', value: data.originState || 'GUJARAT' },
    { label: 'Comp. Cess Amount(INR)', value: data.compCessAmount || '0.00' },
    { label: 'PTA/FTA', value: data.ptaFta || 'NCPTI - Preferential Trade Benefit not claimed at Importing Country' }
  ];

  additionalFields.forEach(field => {
    yPos = drawField(field.label, field.value, leftX, yPos, 160);
    yPos += 9;
  });

  return yPos + 8;
};

// Update renderPage3 to start from where Page 2 left off
const renderPage3 = (pdf, helpers, data) => {
  const { drawLine, drawField, leftX, rightX } = helpers;
  let yPos = 80;

  // SINGLE WINDOW - Additional Product Information
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.sectionHeader);
  pdf.text('SINGLE WINDOW - Additional Product Information', leftX, yPos);
  yPos += 10;
  drawLine(leftX, yPos, rightX);
  yPos += 17;

  const singleWindowHeaders = [
    'Inv No', 'Item No', 'Info Type', 'Info Qualifier', 'Info Code', 'Information', 'Measurement', 'Unit'
  ];

  const singleWindowRows = Array.isArray(data.singleWindowData) ? data.singleWindowData : [data.singleWindowData];

  pdf.autoTable({
    head: [singleWindowHeaders],
    body: singleWindowRows.map(row => [
      row.invNo || '1',
      row.itemNo || '1',
      row.infoType || 'Duty',
      row.infoQualifier || 'Remission of Duty',
      row.infoCode || 'RODTEPY',
      row.information || 'Claimed',
      row.measurement || '1890.000000',
      row.unit || 'KGS'
    ]),
    startY: yPos,
    styles: { 
      fontSize: FONT_SIZES.tableContent - 1, 
      cellPadding: 1 
    },
    headStyles: { 
      fillColor: [220, 220, 220], 
      textColor: 0, 
      fontStyle: 'bold' 
    },
    margin: { left: leftX },
    tableWidth: rightX - leftX
  });

  yPos = pdf.lastAutoTable.finalY + 18;

  // END USE INFORMATION
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.sectionHeader);
  pdf.text('END USE INFORMATION', leftX, yPos);
  yPos += 10;
  drawLine(leftX, yPos, rightX);
  yPos += 17;

  yPos = drawField('Code', data.endUseCode || 'GNX200', leftX, yPos, 160);
  yPos += 9;
  yPos = drawField('Inv / Item Sr.No.', data.endUseInvItem || '1/1', leftX, yPos, 160);
  yPos += 15;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Code Description', leftX, yPos);
  yPos += 10;
  pdf.setFont('helvetica', 'normal');
  const codeDesc = data.endUseDescription || 'Generic - For Commercial Assembly or processing (For Manufacture/Actual use)';
  const descLines = pdf.splitTextToSize(codeDesc, rightX - leftX);
  descLines.forEach(line => {
    pdf.text(line, leftX, yPos);
    yPos += 10;
  });

  yPos += 10;

  // RODTEP Info
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.sectionHeader);
  pdf.text('RODTEP Info', leftX, yPos);
  yPos += 10;
  drawLine(leftX, yPos, rightX);
  yPos += 17;

  const rodtepHeaders = [
    'Inv/Item Sr', 'Claim Status', 'Quantity', 'Rate (in %)', 'Cap Value', 'No. of Units', 'RODTEP Amount (INR)'
  ];

  const rodtepRows = Array.isArray(data.rodtepData) ? data.rodtepData : [data.rodtepData];

  pdf.autoTable({
    head: [rodtepHeaders],
    body: rodtepRows.map(row => [
      row.invItemSr || '1/1',
      row.claimStatus || 'RODTEPY',
      row.quantity || '1890.000000',
      row.rate || '0.900',
      row.capValue || '',
      row.noOfUnits || '1',
      row.rodtepAmount || '5247.94'
    ]),
    startY: yPos,
    styles: { 
      fontSize: FONT_SIZES.tableContent, 
      cellPadding: 2 
    },
    headStyles: { 
      fillColor: [220, 220, 220], 
      textColor: 0, 
      fontStyle: 'bold' 
    },
    margin: { left: leftX },
    tableWidth: rightX - leftX
  });

  yPos = pdf.lastAutoTable.finalY + 18;

  // DECLARATIONS
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.sectionHeader);
  pdf.text('DECLARATIONS', leftX, yPos);
  yPos += 10;
  drawLine(leftX, yPos, rightX);
  yPos += 17;

  const declarationHeaders = ['Decl. Typ', 'Decl. Cod', 'Inv / Item Sr.No.'];
  const declarationRows = Array.isArray(data.declarationData) ? data.declarationData : [data.declarationData];

  pdf.autoTable({
    head: [declarationHeaders],
    body: declarationRows.map(decl => [
      decl.declType || 'DEC',
      decl.declCode || 'RD001',
      decl.invItemSrNo || '1/1'
    ]),
    startY: yPos,
    styles: { 
      fontSize: FONT_SIZES.tableContent, 
      cellPadding: 2 
    },
    headStyles: { 
      fillColor: [220, 220, 220], 
      textColor: 0, 
      fontStyle: 'bold' 
    },
    margin: { left: leftX },
    tableWidth: 200
  });

  yPos = pdf.lastAutoTable.finalY + 15;

  // Declaration Text
  pdf.setFont('helvetica', 'bold');
  pdf.text('Decl. Cod', leftX, yPos);
  pdf.text('Declaration', leftX + 50, yPos);
  yPos += 10;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONT_SIZES.declaration);
  const declarationLines = pdf.splitTextToSize(data.declarationText, rightX - leftX - 50);
  declarationLines.forEach(line => {
    pdf.text(line, leftX + 50, yPos);
    yPos += FONT_SIZES.declaration * 1.2;
  });

  return yPos + 8;
};

// Update renderPage4 for SUPPORTING DOCUMENTS
const renderPage4 = (pdf, helpers, data) => {
  const { drawLine, leftX, rightX } = helpers;
  let yPos = 80;

  // SUPPORTING DOCUMENTS
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.sectionHeader);
  pdf.text('SUPPORTING DOCUMENTS', leftX, yPos);
  yPos += 10;
  drawLine(leftX, yPos, rightX);
  yPos += 17;

  // AutoTable for Supporting Documents
  const supportHeaders = [
    'Inv/Item/StNo.', 'Image Ref.No.(IRN)', 'ICEGATE ID', 'Issuing Party Name', 
    'Beneficiary Party Name', 'Doc Issue Date', 'Doc Ref.No.', 'File Type',
    'Issuing Party Add1', 'Beneficiary Party Add1', 'Doc Expiry Date',
    'Doc Uploaded On', 'Place of Issue', 'Issuing Party Add2', 'Beneficiary Party Add2',
    'Doc Type Code', 'Doc Name', 'Issuing Party Code', 'Issuing Party City', 
    'Beneficiary Party City', 'Beneficiary Party Code', 'Issuing Party Pin Code',
    'Beneficiary Party Pin Code'
  ];

  const supportBody = Array.isArray(data.supportingDocs) ? data.supportingDocs : [data.supportingDocs];

  pdf.autoTable({
    startY: yPos,
    head: [supportHeaders],
    body: supportBody.map(doc => [
      doc.invItemSrNo || '1/0/1',
      doc.imageRefNo || '2025092200042373',
      doc.icegateId || 'RAJANSPPL',
      doc.issuingPartyName || 'ANEETA PACKAGING PRIVATE LIMITED',
      doc.beneficiaryPartyName || 'TO ORDER',
      doc.docIssueDate || '20-Sep-2025',
      doc.docRefNo || 'APG/EXP/25-26/03',
      doc.fileType || 'pdf',
      doc.issuingPartyAdd1 || '1103 - 1104, Parshwanath Business Park, Near Auda, Garden, Ahmedabad 380015',
      doc.beneficiaryPartyAdd1 || 'UK, United Kingdom',
      doc.docExpiryDate || '',
      doc.docUploadedOn || '',
      doc.placeOfIssue || '',
      doc.issuingPartyAdd2 || '',
      doc.beneficiaryPartyAdd2 || '',
      doc.docTypeCode || '',
      doc.docName || '',
      doc.issuingPartyCode || '',
      doc.issuingPartyCity || '',
      doc.beneficiaryPartyCity || '',
      doc.beneficiaryPartyCode || '',
      doc.issuingPartyPinCode || '',
      doc.beneficiaryPartyPinCode || ''
    ]),
    styles: { 
      fontSize: FONT_SIZES.tableContent - 1, 
      cellPadding: 1,
      overflow: 'linebreak'
    },
    headStyles: { 
      fillColor: [220, 220, 220], 
      textColor: 0, 
      fontStyle: 'bold',
      fontSize: FONT_SIZES.tableHeader - 1
    },
    margin: { left: leftX },
    tableWidth: rightX - leftX
  });

  yPos = pdf.lastAutoTable.finalY + 25;

  // FINAL DECLARATION
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(FONT_SIZES.sectionHeader);
  pdf.text('DECLARATION', leftX, yPos);
  yPos += 10;
  drawLine(leftX, yPos, rightX);
  yPos += 17;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONT_SIZES.declaration);
  const declarationLines = pdf.splitTextToSize(data.finalDeclaration, rightX - leftX);
  declarationLines.forEach(line => {
    pdf.text(line, leftX, yPos);
    yPos += FONT_SIZES.declaration * 1.3;
  });

  yPos += 20;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Signature of Exporter/CHA with date', leftX, yPos);
  yPos += 8;
  drawLine(leftX, yPos, rightX - 200);

  return yPos;
};

  // ==================== MAIN GENERATOR ====================
  const generateExportChecklist = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-export-job/${jobNo}`
      );

      const exportJob = response.data;
      const currentDate = formatDate(new Date());

      // Prepare comprehensive data object with all fields from PDF
      const data = {
        // Basic Information
        sbNumber: exportJob.shippingbillnumber || exportJob.sbNo || "5550031",
        sbDate: formatDate(exportJob.shippingbilldate || exportJob.sb_date) || "22-Sep-2025",
        jobNumber: exportJob.job_no || "AMD/EXP/SEA/01546/25-26",
        customStation: exportJob.customStation || "ICD Sabarmati, Ahmedabad",
        aeoRegistrationNo: exportJob.aeoRegistrationNo || "INABOFS1766L0F191",
        aeoRole: exportJob.aeoRole || "CUSTOMS",
        partyRef: exportJob.partyRef || exportJob.partyReference || "APG/EXP/25-26/03",
        chaCode: exportJob.chaCode || "ABOFS1766LCH005 SURAJ FORWARDERS & SHIPPING AGENCIES",
        
        // Exporter & Consignee Details
        exporterDetails: exportJob.exporterName || exportJob.exporter || "ANEETA PACKAGING PRIVATE LIMITED\nBranch Ser #1\n1103 - 1104, Parshwanath Business Park,\nNear Auda, Garden,\nPrahladnagar",
        consigneeDetails: exportJob.consigneename || exportJob.consigneeName || exportJob.consigneeId || "TO ORDER",
        
        // Shipping Details
        portOfLoading: exportJob.portofloading || "ICD Sabarmati, Ahmedabad(INSBIf6)",
        natureOfCargo: exportJob.natureOfCargo || "C - Containerised",
        portOfDischarge: exportJob.portofdischarge || "Southampton(GBSOU)",
        totalPackages: `${exportJob.totalPackages || "726"} BOX`,
        portOfDestination: exportJob.portOfDestination || exportJob.portofdischarge || "Southampton(GBSOU)",
        numberOfContainers: exportJob.numberOfContainers || "1",
        dischargeCountry: exportJob.dischargeCountry || exportJob.countryoffinaldestination || "United Kingdom",
        loosePackets: exportJob.loosePackets || "",
        countryOfDest: exportJob.countryoffinaldestination || "United Kingdom",
        grossWeight: `${exportJob.grossweightkg || "2330"}.000 KGS`,
        masterBlNo: exportJob.masterblno || "",
        netWeight: `${exportJob.netweightkg || "1890"}.000 KGS`,
        houseBlNo: exportJob.houseblno || "",
        rotationNo: exportJob.rotationNo || "",
        stateOfOrigin: exportJob.stateOfOrigin || "GUJARAT",
        adCode: exportJob.adCode || "0510052",
        
        // Financial Details
        totalFobInr: exportJob.totalFOBINR || exportJob.fobValINR || "583104.96",
        igstTaxableValue: exportJob.igstTaxableValue || "583104.61",
        igstAmount: exportJob.igstAmount || "104958.83",
        compCess: exportJob.compCess || "0.00",
        forexBankAcNo: exportJob.forexBankAcNo || "",
        dbkStr: exportJob.dbkStr || "6997.26",
        rbiWaiverNo: exportJob.rbiWaiverNo || "",
        strAmount: exportJob.strAmount || "",
        dbkBankAcNo: exportJob.dbkBankAcNo || "",
        totalDbk: exportJob.totalDBKINR || "6997.26",
        rodtepAmount: exportJob.rodtepAmount || "5247.94",
        
        // Invoice Details
        invoiceNo: exportJob.invoiceNo || "APG/EXP/25-26/03",
        invoiceValue: exportJob.invoiceValue || "USD 6690.82 (INR 583104.96)",
        invoiceDate: formatDate(exportJob.invoiceDate) || "20-Sep-2025",
        fobValue: exportJob.fobValue || "USD 6690.82 (INR 583104.96)",
        natureOfContract: exportJob.natureOfContract || "FOB",
        expContractNo: exportJob.expContractNo || "",
        expContractDate: formatDate(exportJob.expContractDate) || "",
        unitPriceIncludes: exportJob.unitPriceIncludes || "",
        invoiceCurrency: exportJob.invoiceCurrency || "USD",
        exchangeRate: exportJob.exchangeRate || "1 USD = 87.1500 INR",
        
        // Rate Details
        insurance: exportJob.insurance || "",
        freight: exportJob.freight || "",
        discount: exportJob.discount || "",
        commission: exportJob.commission || "",
        otherDeduction: exportJob.otherDeduction || "",
        packingCharges: exportJob.packingCharges || "",
        
        // Payment & Buyer Details
        natureOfPayment: exportJob.natureOfPayment || "",
        periodOfPayment: exportJob.periodOfPayment || "0 days",
        buyerName: exportJob.buyerName || "FARRAG PACKAGING\n3 SHELDON AVENUE\nVICARS CROSS\nCHESTER CH3 5LF UNITED KINGDOM",
        buyerAeoCode: exportJob.buyerAeoCode || "",
        buyerAeoCountry: exportJob.buyerAeoCountry || "",
        buyerAeoRole: exportJob.buyerAeoRole || "",
        thirdPartyDetails: exportJob.thirdPartyDetails || "",
        
        // EOU Details
        eou: exportJob.eou || "",
        iec: exportJob.iec || "",
        branchSno: exportJob.branchSno || "1",
        factoryAddress: exportJob.factoryAddress || "",
        
        // Marks & Nos
        marksAndNos: exportJob.marksAndNos || "WE INTEND TO CLAIM BENEFIT UNDER RODTEP SCHEME AS APPLICABLE.",
        
        // Item Details
        products: exportJob.products || [
   // In the data preparation section, add these product fields:
  {
    ritc: "39233090",
    description: "EMPTY HDPE BOTTLES - HDPE BOTTLES 60 ML AS PER INVOICE",
    quantity: "209088.000",
    per: "PCS",
    unitPrice: "0.032000/PCS",
    amount: "6690.82",
    pmvPerUnit: "3.07",
    totalPMV: "641900.16",
    eximCode: "19 (Drawback (DBK))",
    nfeiCategory: "",
    rewardItem: true,
    fobValueFC: "6690.82",
    fobValueINR: "583104.96",
    igstPaymentStatus: "P",
    taxableValueINR: "583104.61",
    igstAmountINR: "104958.83"
  }
],

// Also add these total fields:
totalPmv: exportJob.totalPmv || "641900.16",
totalIgst: exportJob.totalIgst || "104958.83",
totalPmvGross: exportJob.totalPmvGross || "641900.16",
totalIgstGross: exportJob.totalIgstGross || "104958.83",
        
        // DBK Details
        dbkData: exportJob.dbkData || [
          {
            invNo: "1",
            itemNo: "1", 
            dbkSlNo: "392399B",
            customRate: "",
            dbkRate: "1.20",
            dbkQtyUnit: "209088.000 / PCS",
            dbkAmount: "6997.26",
            customSPE: "",
            dbkSPE: "0.00"
          }
        ],
        
        // Vessel & Container Details
        factoryStuffed: exportJob.factoryStuffed || "No",
        sealType: exportJob.sealType || "BTSL - Bottle Seal",
        sampleAcc: exportJob.sampleAcc || "No",
        vesselName: exportJob.vesselName || "FTAU1600308",
        voyageNumber: exportJob.voyageNumber || "",
        containerData: exportJob.containerData || [
          {
            containerNo: "FTAU1600308",
            size: "20",
            type: "GP",
            sealNo: "",
            sealType: "BTSL - Bottle Seal",
            sealDate: "",
            sealDeviceID: ""
          }
        ],
        
        // Additional Details
        invItemSln: exportJob.invItemSln || "1/1",
        sqcQtyUnit: exportJob.sqcQtyUnit || "1890.000000 KGS",
        originDistrict: exportJob.originDistrict || "446 - GANDHINAGAR",
        originState: exportJob.originState || "GUJARAT",
        compCessAmount: exportJob.compCessAmount || "0.00",
        ptaFta: exportJob.ptaFta || "NCPTI - Preferential Trade Benefit not claimed at Importing Country",
        
        // Single Window Data
        singleWindowData: exportJob.singleWindowData || [
          {
            invNo: "1",
            itemNo: "1",
            infoType: "Duty",
            infoQualifier: "Remission of Duty",
            infoCode: "RODTEPY",
            information: "Claimed",
            measurement: "1890.000000",
            unit: "KGS"
          }
        ],
        
        // End Use Information
        endUseCode: exportJob.endUseCode || "GNX200",
        endUseInvItem: exportJob.endUseInvItem || "1/1",
        endUseDescription: exportJob.endUseDescription || "Generic - For Commercial Assembly or processing (For Manufacture/Actual use)",
        
        // RODTEP Data
        rodtepData: exportJob.rodtepData || [
          {
            invItemSr: "1/1",
            claimStatus: "RODTEPY",
            quantity: "1890.000000",
            rate: "0.900",
            capValue: "",
            noOfUnits: "1",
            rodtepAmount: "5247.94"
          }
        ],
        
        // Declaration Data
        declarationData: exportJob.declarationData || [
          {
            declType: "DEC",
            declCode: "RD001",
            invItemSrNo: "1/1"
          }
        ],
        declarationText: `I/We, in regard to my/our claim under RoDTEP scheme made in this Shipping Bill or Bill of Export, hereby declare that:

1. I/ We undertake to abide by the provisions, including conditions, restrictions, exclusions and time-limits as provided under RoDTEP scheme, and relevant notifications, regulations, etc., as amended from time to time.

2. Any claim made in this shipping bill or bill of export is not with respect to any duties or taxes or levies which are exempted or remitted or credited under any other mechanism outside RoDTEP.

3. I/We undertake to preserve and make available relevant documents relating to the exported goods for the purposes of audit in the manner and for the time period prescribed in the Customs Audit Regulations, 2018.`,
        
        // Supporting Documents
        supportingDocs: exportJob.supportingDocs || [
          {
            invItemSrNo: "1/0/1",
            imageRefNo: "2025092200042373",
            icegateId: "RAJANSPPL",
            issuingPartyName: "ANEETA PACKAGING PRIVATE LIMITED",
            beneficiaryPartyName: "TO ORDER", 
            docIssueDate: "20-Sep-2025",
            docRefNo: "APG/EXP/25-26/03",
            fileType: "pdf",
            issuingPartyAdd1: "1103 - 1104, Parshwanath Business Park, Near Auda, Garden, Ahmedabad 380015",
            beneficiaryPartyAdd1: "UK, United Kingdom",
            docExpiryDate: "",
            docUploadedOn: "",
            placeOfIssue: "",
            issuingPartyAdd2: "",
            beneficiaryPartyAdd2: "",
            docTypeCode: "",
            docName: "",
            issuingPartyCode: "",
            issuingPartyCity: "",
            beneficiaryPartyCity: "",
            beneficiaryPartyCode: "",
            issuingPartyPinCode: "",
            beneficiaryPartyPinCode: ""
          }
        ],

        
        
        // Final Declaration
        finalDeclaration: `1. I/We declare that the particulars given herein are true and are correct.

2. I/We undertake to abide by the provisions of Foreign Exchange Management Act, 1999, as amended from time to time, including realisation or repatriation of foreign exchange to or from India.

Signature of Exporter/CHA with date`
      };

      // Create PDF
      const pdf = new jsPDF("p", "pt", "a4");
      const helpers = createPDFHelpers(pdf);

     helpers.addHeader(1, 4, data.customStation, data.aeoRegistrationNo, data.aeoRole, currentDate);
    renderPage1(pdf, helpers, data);

    // PAGE 2 - ITEM DETAILS
    pdf.addPage();
    helpers.addHeader(2, 4, data.customStation, data.aeoRegistrationNo, data.aeoRole, currentDate);
    renderItemDetailsPage(pdf, helpers, data);

    // PAGE 3 - DBK, VESSEL, CONTAINER details
    pdf.addPage();
    helpers.addHeader(3, 4, data.customStation, data.aeoRegistrationNo, data.aeoRole, currentDate);
    renderPage2(pdf, helpers, data);

    // PAGE 4 - SINGLE WINDOW, RODTEP, DECLARATIONS, SUPPORTING DOCS
    pdf.addPage();
    helpers.addHeader(4, 4, data.customStation, data.aeoRegistrationNo, data.aeoRole, currentDate);
    renderPage3(pdf, helpers, data);

      // Generate filename and display
      const filename = `Export-CheckList-${data.jobNumber.replace(/\//g, '-')}-${currentDate.replace(/ /g, '-')}.pdf`;
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      const newTab = window.open('', '_blank');
      if (newTab) {
        newTab.document.write(
          `<html>
            <head>
              <title>${filename}</title>
              <style>
                body, html { margin: 0; padding: 0; height: 100%; font-family: Arial, sans-serif; }
                .header { 
                  background-color: #f5f5f5; 
                  padding: 10px 20px; 
                  border-bottom: 1px solid #ddd;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                .filename { font-weight: bold; color: #333; }
                .download-btn {
                  background-color: #007bff;
                  color: white;
                  border: none;
                  padding: 8px 16px;
                  border-radius: 4px;
                  cursor: pointer;
                  text-decoration: none;
                  font-size: 14px;
                }
                .download-btn:hover { background-color: #0056b3; }
                .pdf-container { height: calc(100% - 50px); }
                iframe { border: none; width: 100%; height: 100%; }
              </style>
            </head>
            <body>
              <div class="header">
                <span class="filename">${filename}</span>
                <a href="${blobUrl}" download="${filename}" class="download-btn">Download PDF</a>
              </div>
              <div class="pdf-container">
                <iframe src="${blobUrl}" type="application/pdf"></iframe>
              </div>
              <script>
                window.addEventListener('beforeunload', function() {
                  URL.revokeObjectURL('${blobUrl}');
                });
              </script>
            </body>
          </html>`
        );

        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 300000);
      }

    } catch (error) {
      console.error('Error generating export checklist PDF:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  return (
    <>
      {renderAsIcon ? (
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            generateExportChecklist();
          }}
        >
          <abbr title="Download Export Checklist">
            <DownloadIcon fontSize="inherit" />
          </abbr>
        </IconButton>
      ) : (
        <Button 
          onClick={generateExportChecklist}
          type="button"
          sx={{  
            backgroundColor: "#111B21",
            color: "white",
            "&:hover": {
              backgroundColor: "#333",
            },
          }}
        >
          Generate Export Checklist
        </Button>
      )}
    </>
  );
};

export default ExportChecklistGenerator;
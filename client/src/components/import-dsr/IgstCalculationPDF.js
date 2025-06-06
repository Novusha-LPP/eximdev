import React from 'react';
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from 'axios';
import { IconButton, Button, Box } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

const IgstCalculationPDF = ({ year, jobNo, containerIndex = 0, renderAsIcon = false }) => {
  
  const generateIgstCalculationPdf = async () => {
    try {
      // Fetch job data from API
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-job/${year}/${jobNo}`
      );
      
      const jobData = response.data;
      
      // Get container data for the specified index
      const container = jobData.container_nos && jobData.container_nos[containerIndex] 
        ? jobData.container_nos[containerIndex] 
        : {};
<<<<<<< HEAD
          // Calculate values based on the formula
      const netWeightAsPerPL = parseFloat(container.net_weight_as_per_PL_document) || 0;
      const assessableAmount = parseFloat(jobData.assessable_ammount) || 0;
      const igstAmount = parseFloat(jobData.igst_ammount) || 0;
      const netWeight = parseFloat(jobData.job_net_weight) || parseFloat(container.net_weight) || 1; // Fallback to 1 to avoid division by zero

=======
        // Enhanced validation for required fields
      const assessableAmount = parseFloat(jobData.assessable_ammount);
      const igstAmount = parseFloat(jobData.igst_ammount);
      const netWeightAsPerPL = parseFloat(container.net_weight_as_per_PL_document);
      const netWeight = parseFloat(jobData.job_net_weight) || parseFloat(container.net_weight);
      
      // Comprehensive validation with specific error messages
      const missingFields = [];
      
      if (isNaN(assessableAmount) || assessableAmount <= 0) {
        missingFields.push("Assessable Amount");
      }
      
      if (isNaN(igstAmount) || igstAmount <= 0) {
        missingFields.push("IGST Amount");
      }
      
      if (isNaN(netWeight) || netWeight <= 0) {
        missingFields.push("Net Weight (Job or Container)");
      }
      
      if (isNaN(netWeightAsPerPL) || netWeightAsPerPL <= 0) {
        missingFields.push("Net Weight as per PL Document");
      }
      
      if (missingFields.length > 0) {
        const errorMessage = `Cannot generate PDF. The following required fields are missing or invalid:\n\n${missingFields.map(field => `• ${field}`).join('\n')}\n\nPlease ensure all duty payment details are properly filled before generating the PDF.`;
        alert(errorMessage);
        return;
      }
      
      console.log("Job Data:", assessableAmount, igstAmount, netWeightAsPerPL, netWeight);
      // Ensure netWeight is not zero to avoid division by zero errors
      // Calculate values based on the formula
     
>>>>>>> origin/Testing
      // Convert netWeightAsPerPL from KGS to MTS if not already in MTS
      const netWeightAsPerPLInMTS = netWeightAsPerPL / 1000; 
      
      // Calculate assessable value and IGST value
      const assessableValue = (assessableAmount / netWeight) * netWeightAsPerPL;
      const igstValue = (igstAmount / netWeight) * netWeightAsPerPL;

      // Log the calculation results
      console.log('Calculation - assessableValue:', assessableValue);
      console.log('Calculation - igstValue:', igstValue);
      console.log('Calculation formula used:');
      console.log(`assessableValue = (${assessableAmount} / ${netWeight}) * ${netWeightAsPerPL}`);
      console.log(`igstValue = (${igstAmount} / ${netWeight}) * ${netWeightAsPerPL}`);
      
      // Format values for display
      const formattedAssessableValue = assessableValue.toFixed(2);
      const formattedIgstValue = igstValue.toFixed(2);
      const igstRate = parseFloat(jobData.igst_rate) || 18; // Default to 18% if not available
      
      // Create PDF document
      const pdf = new jsPDF("p", "pt", "a4", true);
      
      // Page dimensions - A4 size
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Margins (reduced for less spacing)
      const margin = 30;
      
      // Set default font to Times Roman and make everything bold
      pdf.setFont("times", "bold");
      
      // Helper function to draw borders
      const drawBorders = (x, y, w, h) => {
        pdf.setLineWidth(0.5);
        pdf.rect(x, y, w, h);
      };
      
      // Helper function to add a cell with text and borders
      const addCell = (x, y, w, h, text, align = 'center', fontSize = 12) => {
        drawBorders(x, y, w, h);
        pdf.setFontSize(fontSize);
        // Always use bold font
        pdf.setFont("times", "bold");
        pdf.text(text, align === 'center' ? x + w/2 : (align === 'right' ? x + w - 5 : x + 5), y + h/2 + 5, { align: align });
      };
      
      // Helper function to format date
      const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
      };
      
      // Start drawing the table - adjusted positions for less spacing
      let yPos = margin;
      
      // First row - CONSIGNEE
      const consigneeWidth = pageWidth - (2 * margin);
      const labelWidth = 150;
      const colonWidth = 30; // Reduced width
      
      addCell(margin, yPos, labelWidth, 35, "CONSIGNEE", 'center', 12);
      addCell(margin + labelWidth, yPos, colonWidth, 35, ":", 'center', 12);
      addCell(margin + labelWidth + colonWidth, yPos, consigneeWidth - labelWidth - colonWidth, 35, jobData.importer || "AIA ENGINEERING LTD", 'center', 12);
      
      // Second row - B/E No & DATE
      yPos += 40; // Reduced spacing between rows
      const dataWidth = (consigneeWidth - labelWidth - colonWidth) / 2;
      
      addCell(margin, yPos, labelWidth, 35, "B/E No & DATE", 'center', 12);
      addCell(margin + labelWidth, yPos, colonWidth, 35, ":", 'center', 12);
      addCell(margin + labelWidth + colonWidth, yPos, dataWidth, 35, jobData.be_no || "", 'center', 12);
      addCell(margin + labelWidth + colonWidth + dataWidth, yPos, dataWidth, 35, formatDate(jobData.be_date) || "", 'center', 12);
      
      // Third row - Container No & Size
      yPos += 35; // Reduced spacing
      
      addCell(margin, yPos, labelWidth, 35, "Container No & Size", 'center', 12);
      addCell(margin + labelWidth, yPos, colonWidth, 35, ":", 'center', 12);
      addCell(margin + labelWidth + colonWidth, yPos, dataWidth, 35, container.container_number || "", 'center', 12);
      addCell(margin + labelWidth + colonWidth + dataWidth, yPos, dataWidth, 35, container.size || "", 'center', 12);
      
      // Fourth row - Net QTY
      yPos += 35; // Reduced spacing
      
      addCell(margin, yPos, labelWidth, 35, "Net QTY", 'center', 12);
      addCell(margin + labelWidth, yPos, colonWidth, 35, ":", 'center', 12);
      addCell(margin + labelWidth + colonWidth, yPos, dataWidth, 35, netWeightAsPerPLInMTS.toFixed(3), 'center', 12);
      addCell(margin + labelWidth + colonWidth + dataWidth, yPos, dataWidth, 35, "MTS", 'center', 12);
      
      // Skip a row for spacing (but less than before)
      yPos += 45; // Reduced spacing
      
      // Assessable Value row
      const fullWidth = pageWidth - (2 * margin);
      const valueWidth = 100;
      const decimalWidth = 50;
      
      addCell(margin, yPos, fullWidth - valueWidth - decimalWidth, 35, "ASSESSABLE VALUE - INR", 'center', 12);
      addCell(margin + fullWidth - valueWidth - decimalWidth, yPos, valueWidth, 35, Math.floor(assessableValue).toString(), 'right', 12);
      addCell(margin + fullWidth - decimalWidth, yPos, decimalWidth, 35, "00", 'center', 12);
      
      // IGST row
      yPos += 35; // Reduced spacing
      
      addCell(margin, yPos, (fullWidth - valueWidth - decimalWidth) / 2, 35, "IGST", 'center', 12);
      addCell(margin + (fullWidth - valueWidth - decimalWidth) / 2, yPos, (fullWidth - valueWidth - decimalWidth) / 2, 35, igstRate + "%", 'center', 12);
      addCell(margin + fullWidth - valueWidth - decimalWidth, yPos, valueWidth, 35, Math.floor(igstValue).toString(), 'right', 12);
      addCell(margin + fullWidth - decimalWidth, yPos, decimalWidth, 35, "00", 'center', 12);
      
      // Total IGST row
      yPos += 35; // Reduced spacing
      
      addCell(margin, yPos, fullWidth - valueWidth - decimalWidth, 35, "Total IGST", 'center', 12);
      addCell(margin + fullWidth - valueWidth - decimalWidth, yPos, valueWidth, 35, Math.floor(igstValue).toString(), 'right', 12);
      addCell(margin + fullWidth - decimalWidth, yPos, decimalWidth, 35, "00", 'center', 12);
      
      // Generate filename
      const containerNumber = container.container_number || `Container${containerIndex + 1}`;
      const filename = `${containerNumber}(${jobData.job_no})-IGST-Calculation.pdf`;
      
      // Generate PDF as blob
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Open in new tab with download functionality
      const newTab = window.open('', '_blank');
      if (newTab) {
        newTab.document.write(`
         <html>
            <head>
              <title>${filename}</title>
              <style>
                body, html { margin: 0; padding: 0; height: 100%; font-family: Times New Roman, serif; font-weight: bold; }
                .header { 
                  background-color: #f5f5f5; 
                  padding: 8px 16px; 
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
                  padding: 6px 12px;
                  border-radius: 4px;
                  cursor: pointer;
                  text-decoration: none;
                  font-size: 14px;
                }
                .download-btn:hover { background-color: #0056b3; }
                .pdf-container { height: calc(100% - 40px); }
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
                // Clean up blob URL when tab is closed
                window.addEventListener('beforeunload', function() {
                  URL.revokeObjectURL('${blobUrl}');
                });
              </script>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Error generating IGST calculation PDF:', error);
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
            generateIgstCalculationPdf();
          }}
        >
          <abbr title="Download IGST Calculation">
            <DownloadIcon fontSize="inherit" />
          </abbr>
        </IconButton>
      ) : (
        <Button 
          onClick={generateIgstCalculationPdf}
          type="button"
          sx={{
            fontWeight: 'bold',
            backgroundColor: "#111B21",
            color: "white",
            "&:hover": {
              backgroundColor: "#333",
            },
          }}
        >
          Generate IGST Calculation
        </Button>
      )}
    </>
  );
};

export default IgstCalculationPDF;
import React from 'react';
import jsPDF from "jspdf";
import "jspdf-autotable";
import axios from 'axios';
import { IconButton,
   Button,
  Box,} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

const DeliveryChallanPdf = ({ year, jobNo, containerIndex = 0, renderAsIcon = false }) => {
  
  const generateDeliveryChallan = async () => {
    try {
      // Fetch job data from API
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-job/${year}/${jobNo}`
      );
      
      const jobData = response.data;
      
      const pdf = new jsPDF("p", "pt", "a4", true);
      
      // Page dimensions - A4 size with custom margins
      const pageWidth = pdf.internal.pageSize.getWidth(); // 595.28 pts
      const pageHeight = pdf.internal.pageSize.getHeight(); // 841.89 pts
      
      // Convert margins from cm to points (1 cm = 28.35 pts)
      const leftMargin = 2.96 * 28.35; // 72.13 pts
      const rightMargin = 2.96 * 28.35; // 72.13 pts
      const topMargin = 0.5 * 28.35; // 14.18 pts
      const bottomMargin = 1.5 * 28.35; // 42.53 pts
      
      const contentWidth = pageWidth - leftMargin - rightMargin;
        // Helper function to format date
      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
      };

      // Helper function to wrap text
      const wrapText = (text, maxWidth) => {
        if (!text) return [''];
        
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = pdf.getTextWidth(testLine);
          
          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              // If single word is too long, break it
              const chars = word.split('');
              let charLine = '';
              chars.forEach(char => {
                const testCharLine = charLine + char;
                if (pdf.getTextWidth(testCharLine) <= maxWidth) {
                  charLine = testCharLine;
                } else {
                  if (charLine) lines.push(charLine);
                  charLine = char;
                }
              });
              if (charLine) currentLine = charLine;
            }
          }
        });
        
        if (currentLine) {
          lines.push(currentLine);
        }
        
        return lines.length > 0 ? lines : [''];
      };

      // Helper function to add wrapped text and return new Y position
      const addWrappedText = (text, x, y, maxWidth, lineHeight = 15) => {
        const lines = wrapText(text, maxWidth);
        lines.forEach((line, index) => {
          pdf.text(line, x, y + (index * lineHeight));
        });
        return y + (lines.length * lineHeight);
      };

      // Header Section - Company Name (28pt font size as per MS Word)
      pdf.setFontSize(28);
      pdf.setFont('Times New Roman', 'bold');
      pdf.text('SURAJ FORWARDERS PVT LTD', pageWidth / 2, topMargin + 35, { align: 'center' });
      
      // Registered Office heading (smaller, bold)
      pdf.setFontSize(10);
      pdf.setFont('Arial', 'bold');
      pdf.text('Regd. Office :', pageWidth / 2, topMargin + 50, { align: 'center' });
        // Company address details (normal font, not bold)
      pdf.setFont('Arial', 'normal');
      pdf.setFontSize(10);
      
      // Center align address with word wrapping
      const address = 'A – 306, Wall Street – II, Opp. Orient Club, Ellis Bridge, Ahmedabad –380006(India)';
      const addressLines = wrapText(address, contentWidth);
      let addressY = topMargin + 60;
      addressLines.forEach((line, index) => {
        pdf.text(line, pageWidth / 2, addressY + (index * 12), { align: 'center' });
      });
      
      const phone = 'Phone : (079) 30082020 / 21 / 22  Fax: (079) 26401929  E-mail:surajahd@eth.net';
      const phoneLines = wrapText(phone, contentWidth);
      let phoneY = addressY + (addressLines.length * 12);
      phoneLines.forEach((line, index) => {
        pdf.text(line, pageWidth / 2, phoneY + (index * 12), { align: 'center' });
      });
      
      const websiteY = phoneY + (phoneLines.length * 12);
      pdf.text('Website : www.surajforwarders.com', pageWidth / 2, websiteY, { align: 'center' });
        // Line break after website (adding extra space)
      pdf.setLineWidth(0.5);
      pdf.line(leftMargin, websiteY + 10, pageWidth - rightMargin, websiteY + 10);
      
      // Clearing agents line (centered, smaller, normal font)
      pdf.setFontSize(10);
      pdf.setFont('Arial', 'normal');
      pdf.text('Clearing – Forwarding – Shipping Agents', leftMargin, websiteY + 20, { align: 'left' });
      
      // TO section
      const toSectionY = websiteY + 40;
      pdf.setFontSize(11);
      pdf.setFont('Times New Roman', 'bold');
      pdf.text('TO', leftMargin, toSectionY);
      pdf.setFont('Times New Roman', 'bold');
      pdf.text(':', leftMargin + 50, toSectionY);
      pdf.setFont('Times New Roman', 'bold');
      
      // Handle long importer names with wrapping
      const importerName = `M/S. ${jobData.importer || 'AIA ENGINEERING LTD.'}`;
      const importerMaxWidth = pageWidth - rightMargin - (leftMargin + 60);
      const importerLines = wrapText(importerName, importerMaxWidth);
      let importerY = toSectionY;
      importerLines.forEach((line, index) => {
        pdf.text(line, leftMargin + 60, importerY + (index * 15));
      });
      
      const ahmedabadY = importerY + (importerLines.length * 15);
      pdf.text('AHMEDABAD', leftMargin + 60, ahmedabadY);
        // Line break after TO section with 1px bold line
      const afterToY = ahmedabadY + 5;
      pdf.setLineWidth(1);
      pdf.line(leftMargin, afterToY, pageWidth - rightMargin, afterToY);
      
      // Job No and Date on the same line (right aligned date)
      const jobDetailsY = afterToY + 15;
      pdf.setFontSize(12);
      pdf.setFont('Times New Roman', 'bold');
      pdf.text(`Job No. ${jobData.job_no || ''}`, leftMargin, jobDetailsY);
      pdf.text(`Date: ${formatDate(new Date())}`, pageWidth - rightMargin, jobDetailsY, { align: 'right' });
      
      // Dear Sir
      pdf.setFontSize(12);
      pdf.setFont('Times New Roman', 'bold');
      pdf.text('Dear Sir,', leftMargin, jobDetailsY + 30);
      
      // Subject line - Bold "Sub:" then normal text
      const subjectY = jobDetailsY + 45;
      pdf.setFont('Times New Roman', 'bold');
      pdf.text('Sub: Import clearance of', leftMargin, subjectY);
      pdf.setFont('Times New Roman', 'bold');
      
      // Description continues on same line with wrapping
      const description = jobData.description || '';
      const subjectMaxWidth = pageWidth - rightMargin - (leftMargin + 145);
      const descriptionLines = wrapText(description.toUpperCase(), subjectMaxWidth);
      let descriptionY = subjectY;
      descriptionLines.forEach((line, index) => {
        pdf.text(line, leftMargin + 145, descriptionY + (index * 15));
      });
      
      // Add "FOR MELTING PURPOSE" on next line if commodity description
      let nextSectionY = descriptionY + (descriptionLines.length * 15);
      if (description.toLowerCase().includes('scrap') || description.toLowerCase().includes('steel')) {
        // pdf.text('FOR MELTING PURPOSE', leftMargin + 145, nextSectionY);
        nextSectionY += 15;
      }
        // Reference paragraph
      const refY = nextSectionY + 10;
      pdf.setFontSize(12);
      pdf.text('With reference to the above subject, we are sending herewith the following goods, the', leftMargin, refY);
      pdf.text('details given below for your references.', leftMargin, refY + 20);
      
      // Details section - formatted exactly as in screenshot
      const detailsStartY = refY + 50;
      pdf.setFontSize(12);      // Get container details (specific container by index)
      const container = jobData.container_nos && jobData.container_nos[containerIndex] ? jobData.container_nos[containerIndex] : {};
      
      // Create details array with conditional formatting based on consignment type
      const details = [
        { label: 'B/E  No. & DATE', value: `${jobData.be_no || ''} DATE ${formatDate(jobData.be_date)}` },
        { space: true },
        { label: 'SUPPLIER NAME', value: jobData.supplier_exporter || '' },
        { space: true },
        { label: 'INV. NO. & DATE', value: `${jobData.invoice_number || ''} Dt. ${formatDate(jobData.invoice_date)}` },
        { space: true },
        // Conditionally include CONTAINER NO. and SEAL NO. only if consignment_type is not LCL
        ...(jobData.consignment_type !== 'LCL' ? [
          { label: 'CONTAINER NO.', value: `${container.container_number || ''} – ${container.size || ''}` },
          { space: true },
          { label: 'SEAL NO.', value: container.seal_number || '' },
          { space: true }
        ] : []),
        { label: 'COMMODITY', value: `${jobData.description || ''}`.toUpperCase() },
        { space: true },
        { label: 'WT. AS PER DOCS', value: `${container.container_gross_weight|| ''} KGS GROSS WT` },
        { space: true },
        { label: 'TRANSPORTER', value: container.transporter || '' },
        { space: true },
        { label: 'VEHICLE NO.', value: container.vehicle_no || '' }
      ];
      
      let currentY = detailsStartY;
      
      details.forEach((detail) => {
        if (detail.space) {
          currentY += 10;
          return;
        }
        
        if (detail.continuation) {
          pdf.setFont('Times New Roman', 'bold');
          pdf.text(detail.continuation, leftMargin + 180, currentY);
          currentY += 18;
          return;
        }
        
        if (detail.label) {
          pdf.setFont('Times New Roman', 'bold');
          pdf.text(`${detail.label}`, leftMargin, currentY);
          pdf.setFont('Times New Roman', 'bold');
          pdf.text(':', leftMargin + 120, currentY);
          
          if (detail.value) {
            // Calculate max width for value field with word wrapping
            const valueMaxWidth = pageWidth - rightMargin - (leftMargin + 130);
            const valueLines = wrapText(detail.value, valueMaxWidth);
            valueLines.forEach((line, index) => {
              pdf.text(line, leftMargin + 130, currentY + (index * 15));
            });
            currentY += (valueLines.length * 15);
          } else {
            currentY += 18;
          }
        }
      });
      
      // Acknowledgment section
      const ackY = currentY + 10;
      pdf.setFontSize(12);
      pdf.text('Kindly acknowledge the receipt by returning the duplicate copy duly stamped & signed', leftMargin, ackY);
      pdf.text('by you.', leftMargin, ackY + 10);
      
      // Closing
      pdf.text('Thanking you,', leftMargin, ackY + 35);
      pdf.text('Yours faithfully,', leftMargin, ackY + 53);
        // Company signature section
      const signatureY = ackY + 100;
      pdf.setFont('Times New Roman', 'bold');
      pdf.text('FOR, SURAJ FORWARDERS PVT LTD', leftMargin, signatureY-10);
      
      // Add signature image
      try {
        const signatureImg = new Image();
        signatureImg.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          signatureImg.onload = () => {
            // Add the signature image
            const imgWidth = 120; // Adjust width as needed
            const imgHeight = 60; // Adjust height as needed
            
            pdf.addImage(
              signatureImg, 
              'JPEG', 
              leftMargin, 
              signatureY + 10, 
              imgWidth, 
              imgHeight
            );
            resolve();
          };
          
          signatureImg.onerror = () => {
            console.warn('Failed to load signature image, continuing without it');
            resolve();
          };
          
          signatureImg.src = 'https://exim-images-p1.s3.ap-south-1.amazonaws.com/Scan_Signature/Screenshot_20250602_111546_Samsung+Notes.jpg';
        });
      } catch (error) {
        console.warn('Error loading signature image:', error);
      }      // Signature line and text
      pdf.setFont('Times New Roman', 'bold');
      pdf.setFontSize(12);
      pdf.text('Authorized Signatory', leftMargin, signatureY + 80);
        // Generate filename in format: {container_number}({job_no})-DC
      const containerNumber = container.container_number || `Container${containerIndex + 1}`;
      const filename = `${containerNumber}(${jobData.job_no})-DC.pdf`;
      
      // Generate PDF as blob
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Create a new tab with custom HTML that includes download functionality
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
                // Clean up blob URL when tab is closed
                window.addEventListener('beforeunload', function() {
                  URL.revokeObjectURL('${blobUrl}');
                });
              </script>
            </body>
          </html>`
        );
        
        // Clean up the blob URL after some time as backup
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 300000); // Clean up after 5 minutes
      }
      
    } catch (error) {
      console.error('Error generating delivery challan PDF:', error);
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
            generateDeliveryChallan();
          }}
        >
          <abbr title="Download Delivery Challan">
            <DownloadIcon fontSize="inherit" />
          </abbr>
        </IconButton>
      ) : (
        <Button 
          onClick={generateDeliveryChallan}
          type="button"
          sx={{  
                // fontWeight: 'bold',
                backgroundColor: "#111B21",
                color: "white",
                "&:hover": {
                  backgroundColor: "#333",
                },
              }}
        >
          Generate Delivery Challan
        </Button>
      )}
    </>
  );
};

export default DeliveryChallanPdf;
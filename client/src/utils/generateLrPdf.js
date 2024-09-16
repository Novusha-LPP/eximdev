import jsPDF from "jspdf";
import "jspdf-autotable";
import logo from "../assets/images/srcc.png";
import axios from "axios";

export const generateLrPdf = async (data, lrData) => {
  console.log(lrData);
  if (data.length === 0) {
    alert("No Container Selected");
    return;
  }

  let address = "";

  async function getAddress() {
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/get-organisation-data`,
        { name: lrData.consignor }
      );
      const defaultBranch = res.data.branches?.find(
        (branch) => branch?.default
      );

      if (defaultBranch) {
        const defaultAddress = defaultBranch.addresses.find(
          (address) => address.default
        );

        if (defaultAddress) {
          address = defaultAddress.address;
        } else {
          console.log("No default address found in the default branch.");
        }
      } else {
        console.log("No default branch found.");
      }
    } catch (error) {
      console.error("Error fetching address:", error);
    }
  }

  await getAddress();

  // Loop through each item in the data array
  data.forEach((item) => {
    const pdf = new jsPDF("p", "pt", "a4", true);

    pdf.setFillColor("#ffffff"); // Set fill color to white

    // Add a white rectangle as background up to 20% from the top
    const headerHeight = pdf.internal.pageSize.getHeight() * 0.15;
    pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), headerHeight, "F");

    const textY = headerHeight / 2;

    // Add the logo
    const headerImgData = logo;
    const headerImgWidth = 150;
    const headerImgHeight = 50;
    pdf.addImage(
      headerImgData,
      "PNG",
      40,
      textY - 10 - 40,
      headerImgWidth,
      headerImgHeight
    );

    // Calculate the x-coordinate for aligning the headings to the right
    const headingX = pdf.internal.pageSize.getWidth() - 40;

    const titleText = "Consignment Note";
    pdf.setFontSize(20);
    pdf.setTextColor("#000000");
    pdf.text(titleText, headingX, textY - 20, null, null, "right");
    pdf.setFontSize(18);
    const subTitleText = item.tr_no;
    pdf.text(subTitleText, headingX, textY + 5, null, null, "right");

    // Body
    const dateText = `Date: ${new Date().toLocaleDateString("en-GB")}`;
    const vehicleNoText = `Vehicle Number: ${item.vehicle_no}`;
    const driverNameText = `Driver Name: ${item.driver_name}`;
    const driverPhoneText = `Driver Phone: ${item.driver_phone}`;
    const doText = `DO Validity: ${lrData.do_validity}`;
    const gstText = "GST: 24ANGPR7652E1ZV";

    pdf.setFontSize(12);
    pdf.setTextColor("#000000");
    pdf.text(dateText, 40, textY + 30, null, null, "left");
    pdf.text(vehicleNoText, 40, textY + 45, null, null, "left");
    pdf.text(doText, 40, textY + 60, null, null, "left");
    const rightAlignX = pdf.internal.pageSize.getWidth() - 40;
    pdf.text(driverNameText, rightAlignX, textY + 30, null, null, "right");
    pdf.text(driverPhoneText, rightAlignX, textY + 45, null, null, "right");
    pdf.text(gstText, rightAlignX, textY + 60, null, null, "right");

    // Consignor and consignee name and address
    const headers = [
      "Consignor's Name and Address",
      "Consignee Name and Address",
    ];
    const rowsData = [
      [lrData.consignor + "\n" + address, lrData.consignee + "\n" + address],
    ];

    const tableWidth = pdf.internal.pageSize.getWidth() - 80;
    const cellWidth = tableWidth / headers.length;

    // Add the table using
    pdf.autoTable({
      startY: headerHeight + 20,
      head: [headers],
      body: rowsData,
      styles: {
        halign: "center",
        valign: "middle",
        fontSize: 10,
        cellPadding: 5,
        textColor: "#000000",
        cellWidth: cellWidth,
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        fillColor: "#ffffff",
      },
      headStyles: {
        fillColor: "#ffffff",
        textColor: "#000000",
      },
    });

    // Container pickup and destuff
    const firstTableHeight = pdf.previousAutoTable.finalY;
    const headers2 = ["Container Pickup", "Empty Offloading", "Shipping Line"];
    const rowsData2 = [
      [
        lrData.container_loading,
        lrData.container_offloading,
        lrData.shipping_line,
      ],
    ];
    const columnWidth2 = tableWidth / headers2.length;

    // Add the table
    pdf.autoTable({
      startY: firstTableHeight + 10,
      head: [headers2],
      body: rowsData2,
      styles: {
        halign: "center",
        valign: "middle",
        fontSize: 10,
        cellPadding: 5,
        textColor: "#000000",
        cellWidth: columnWidth2,
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: "#ffffff",
        textColor: "#000000",
      },
    });

    // From and To
    const secondTableHeight = pdf.previousAutoTable.finalY;
    const headers3 = ["From", "To"];
    const rowsData3 = [[item.goods_pickup, item.goods_delivery]];
    const columnWidth3 = tableWidth / headers3.length;

    // Add the table
    pdf.autoTable({
      startY: secondTableHeight + 10,
      head: [headers3],
      body: rowsData3,
      styles: {
        halign: "center",
        valign: "middle",
        fontSize: 10,
        cellPadding: 5,
        textColor: "#000000",
        cellWidth: columnWidth3,
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: "#ffffff",
        textColor: "#000000",
      },
    });

    // Container details
    const thirdTableHeight = pdf.previousAutoTable.finalY;

    const headers4 = [
      "Container Number/ Number of Packages",
      "Seal No",
      "Description",
      "Amount To Pay",
    ];

    const rowsData4 = [
      [
        `${item.container_number} (${lrData.container_type})`,
        item.seal_no,
        item.description,
        "As Agreed",
      ],
    ];

    const columnWidth4 = tableWidth / headers4.length;

    // Add the table
    pdf.autoTable({
      startY: thirdTableHeight + 10,
      head: [headers4],
      body: rowsData4,
      styles: {
        halign: "center",
        valign: "middle",
        fontSize: 10,
        cellPadding: 5,
        textColor: "#000000",
        cellWidth: columnWidth4,
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: "#ffffff",
        textColor: "#000000",
      },
    });

    // Checkboxes
    const fourthTableHeight = pdf.previousAutoTable.finalY;
    const checkboxSize = 10;
    const checkboxY = fourthTableHeight + 20;

    // Checkbox 1
    pdf.rect(40, checkboxY, checkboxSize, checkboxSize);
    pdf.text("Tipping", 60, checkboxY + 8);

    // Checkbox 2
    pdf.text("Detention days", 140, checkboxY + 8);
    pdf.rect(230, checkboxY - 6, checkboxSize + 80, checkboxSize + 10);

    // Person liable for service
    const liabilityText = "Person liable for service:";
    pdf.setFontSize(12);
    pdf.setTextColor("#000000");
    const liabilityTextY = checkboxY + 30;
    pdf.text(liabilityText, 40, liabilityTextY, null, null, "left");
    pdf.setFontSize(12);
    pdf.text(vehicleNoText, 40, textY + 45, null, null, "left");
    pdf.rect(180, liabilityTextY - 10, checkboxSize, checkboxSize);
    pdf.text("Consignor", 195, liabilityTextY);
    pdf.rect(265, liabilityTextY - 10, checkboxSize, checkboxSize);
    pdf.text("Consignee", 280, liabilityTextY);
    pdf.rect(345, liabilityTextY - 10, checkboxSize, checkboxSize);
    pdf.text("Transporter", 360, liabilityTextY);

    const footerStartY = liabilityTextY + 120;

    // Footer
    const footerImgData = logo;
    const footerImgWidth = 100; // Adjust the width of the footer image as needed
    const footerImgHeight = 40;
    const footerTextX = 40 + footerImgWidth + 10;

    // Set the line color to light gray (R, G, B values)
    pdf.setDrawColor(200, 200, 200);

    // Calculate the Y-coordinate for the line
    const lineY = footerStartY - 30;

    // Draw the horizontal line
    pdf.line(40, lineY, pdf.internal.pageSize.getWidth() - 40, lineY);

    // Authorised Signatory
    pdf.setDrawColor(0); // Set border color to black
    pdf.rect(40, lineY - 65, pdf.internal.pageSize.getWidth() - 80, 50);
    pdf.text("Authorised Signatory", 50, lineY - 40);

    // Footer Image
    pdf.addImage(
      footerImgData,
      "PNG",
      40,
      footerStartY - 10,
      footerImgWidth,
      footerImgHeight
    );

    pdf.setFontSize(10);

    const footerTextY = footerStartY;
    const companyText =
      "A-206, Wall Sreet 2, Opp Orient Club. Near Gujarat College";
    const addressText = "Ellisbridge, Ahmedabad - 380006";
    const cityText =
      "Operation Address: Krishna Plaza, ICD Khodiyar, SG Highway, Ahmedabad - 382421";
    const contactText =
      "M: 9924304441, 9924304930 Email: ceo@srcontainercarriers.com";

    pdf.setFontSize(8);
    pdf.setTextColor("#000000");
    pdf.text(companyText, footerTextX, footerTextY, null, null, "left");
    pdf.text(addressText, footerTextX, footerTextY + 10, null, null, "left");
    pdf.text(cityText, footerTextX, footerTextY + 20, null, null, "left");
    pdf.text(contactText, footerTextX, footerTextY + 30, null, null, "left");

    // Subject to Ahmedabad Jurisdiction
    pdf.setFontSize(14);
    pdf.text("Subject to Ahmedabad Jurisdiction", 40, footerStartY + 80);

    const pdfDataUri = pdf.output("datauristring");
    // Open the PDF in a new tab
    const newTab = window.open();
    newTab.document.write(
      `<html><head><title>${subTitleText}</title><style>
         body, html { margin: 0; padding: 0; }
         iframe { border: none; width: 100%; height: 100%; }
       </style></head><body><embed width='100%' height='100%' src='${pdfDataUri}'></embed></body></html>`
    );

    ////////////////////////////////////////////////////////////////////////////////
    // Cash Report
    ////////////////////////////////////////////////////////////////////////////////

    const pdf2 = new jsPDF("p", "pt", "a4", true);
    pdf2.setFillColor("#ffffff");

    // Define header height and position logo

    const cashReportHeaderImgWidth = 150;
    const cashReportHeaderImgHeight = 50;

    // Draw header background
    pdf2.rect(0, 0, pdf2.internal.pageSize.getWidth(), headerHeight, "F");

    // Calculate the total height of image and text
    const totalHeight = headerImgHeight + 10 + 4 * 12; // Image height + space + 4 lines of text

    // Calculate the vertical position to center the content within the header
    const contentY = (headerHeight - totalHeight) / 2;

    // Add the logo
    pdf2.addImage(
      headerImgData,
      "PNG",
      40,
      contentY,
      cashReportHeaderImgWidth,
      cashReportHeaderImgHeight
    );

    // Add text to the right of the image
    pdf2.setFontSize(10);
    pdf2.text(40 + cashReportHeaderImgWidth + 10, contentY + 10, [
      "A-206, Wall Sreet 2, Opp Orient Club. Near Gujarat College",
      "Ellisbridge, Ahmedabad - 380006",
      "Operation Address: Krishna Plaza, ICD Khodiyar, SG Highway, Ahmedabad - 382421",
      "M: 9924304441, 9924304930 Email: ceo@srcontainercarriers.com",
    ]);

    // Set startY for the table
    const startY = headerHeight - 30;

    // Define table data
    const cashData = [
      [
        {
          content: "Cash/ Freight Memo",
          colSpan: 3,
          styles: {
            halign: "center",
            fillColor: "#ffffff",
            textColor: "#000000",
            lineWidth: 0.2,
          },
        },
      ],
      [
        {
          content: "",
          colSpan: 3,
          styles: {
            fillColor: "#ffffff",
            lineWidth: 0.2,
          },
        },
      ],
      [
        `LR No: ${item.tr_no}`,
        `Driver Name and Phone: ${item.driver_name} ${item.driver_phone}`,
        `Vehicle No: ${item.vehicle_no}`,
      ],
      [
        `Date: ${new Date().toLocaleDateString()}`,
        `From: ${item.goods_pickup}`,
        `To: ${item.goods_delivery}`,
      ],
      [
        {
          content: "Instructions:",
          colSpan: 1,
          styles: {
            fillColor: "#ffffff",
            lineWidth: 0.2,
          },
        },
        {
          content: lrData.instructions,
          colSpan: 2,
          styles: {
            fillColor: "#ffffff",
            lineWidth: 0.2,
          },
        },
      ],
      [
        {
          content: "",
          colSpan: 3,
          styles: {
            fillColor: "#ffffff",
            lineWidth: 0.2,
          },
        },
      ],
      ["Sr. No", "Description", "Amount Paid (INR)"],
      ["1", "Advance cash against Transportation Charges", ""],
      ["2", "Advance diesel against Transportation Charges", ""],
      ["3", "ICD/Port Weight Expenses", ""],
      ["4", "Empty vehicle movement", ""],
      ["5", "Handling MR expenses", ""],
      ["6", "Damage container expenses", ""],
      ["7", "D.O Validity expenses", ""],
      ["8", "Extra movement", ""],
      ["9", "Extra weight expenses", ""],
      ["10", "Labour Charges", ""],
      ["11", "Miscellaneous expenses", ""],
      ["12", "Vendor Transportation Charges - E", ""],
      ["13", "Detention Days", ""],
      ["14", "Vendor Outstanding Balance", ""],
      ["", "Total Amount", ""],
      ["Transporter Name:", "Passed By", "Driver's Signature"],
      ["", "", ""],
    ];

    // Define options for the table
    const options = {
      startY: startY,
      theme: "grid",
      styles: {
        textColor: [0, 0, 0],
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
      },
    };

    // Add the table to the pdf2
    pdf2.autoTable({
      head: cashData.slice(0, 2),
      body: cashData.slice(2),
      ...options,
    });

    const cashReportPdfUri = pdf2.output("datauristring");

    // Open the PDF in a new tab
    const newTab2 = window.open();
    newTab2.document.write(
      `<html><head><title>${subTitleText} - Cash Memo</title><style>
         body, html { margin: 0; padding: 0; }
         iframe { border: none; width: 100%; height: 100%; }
       </style></head><body><embed width='100%' height='100%' src='${cashReportPdfUri}'></embed></body></html>`
    );
  });
};

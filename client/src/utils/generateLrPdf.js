import jsPDF from "jspdf";
import "jspdf-autotable";
import logo from "../assets/images/srcc.png";
import axios from "axios";
import dayjs from "dayjs";

export const generateLrPdf = async (data, lrData) => {
  if (data.length === 0) {
    alert("No Container Selected");
    return;
  }

  // Check if popup blocker might be active
  let popupBlocked = false;
  const testPopup = window.open('', '_blank', 'width=1,height=1');
  if (!testPopup || testPopup.closed || typeof testPopup.closed === 'undefined') {
    popupBlocked = true;
  } else {
    testPopup.close();
  }
  if (popupBlocked && data.length > 1) {
    const userChoice = window.confirm(
      `You have ${data.length} containers selected. Since popup blocker is active, would you like to:\n` +
      `- Click OK to download all PDFs as files\n` +
      `- Click Cancel to generate only the first container PDF`
    );
    
    if (!userChoice) {
      // User chose to process only first item
      data = data.slice(0, 1);
    }
  }

  let address = "";

  async function getAddress() {
    try {
      // Handle populated consignor object with comprehensive fallback
      const consignorName = (() => {
        if (typeof lrData.consignor === "object" && lrData.consignor !== null) {
          return (
            lrData.consignor.organisation_name ||
            lrData.consignor.name ||
            lrData.consignor.companyName ||
            null
          );
        }
        return lrData.consignor || null;
      })();

      if (!consignorName) {
        return;
      }

      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/get-organisation-data`,
        { name: consignorName }
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
  data.forEach((item, index) => {

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
    const doText = `DO Validity: ${dayjs(lrData.do_validity).format(
      "DD/MM/YYYY, hh:mm A"
    )}`;

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

    // Handle populated objects for consignor and consignee with comprehensive fallback
    const consignorName = (() => {
      if (typeof lrData.consignor === "object" && lrData.consignor !== null) {
        return (
          lrData.consignor.organisation_name ||
          lrData.consignor.name ||
          lrData.consignor.companyName ||
          lrData.consignor.toString() ||
          "Consignor not found"
        );
      }
      return lrData.consignor || "No consignor";
    })();

    const consigneeName = (() => {
      if (typeof lrData.consignee === "object" && lrData.consignee !== null) {
        return (
          lrData.consignee.organisation_name ||
          lrData.consignee.name ||
          lrData.consignee.companyName ||
          lrData.consignee.toString() ||
          "Consignee not found"
        );
      }
      return lrData.consignee || "No consignee";
    })();

    const rowsData = [
      [consignorName + "\n" + address, consigneeName + "\n" + address],
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

    // Handle populated objects for locations and shipping line with comprehensive fallback
    const containerLoading = (() => {
      if (
        typeof lrData.container_loading === "object" &&
        lrData.container_loading !== null
      ) {
        // Backend doesn't populate container_loading/container_offloading in getTrs.mjs
        // These are direct fields in lrData, likely populated by getPrData.mjs which uses different populate
        return (
          lrData.container_loading.name ||
          lrData.container_loading.location_name ||
          lrData.container_loading.locationName ||
          lrData.container_loading.toString() ||
          "Location not found"
        );
      }
      return lrData.container_loading || "No loading location";
    })();

    const containerOffloading = (() => {
      if (
        typeof lrData.container_offloading === "object" &&
        lrData.container_offloading !== null
      ) {
        // Backend doesn't populate container_offloading in getTrs.mjs
        // These are direct fields in lrData, likely populated by getPrData.mjs which uses different populate
        return (
          lrData.container_offloading.name ||
          lrData.container_offloading.location_name ||
          lrData.container_offloading.locationName ||
          lrData.container_offloading.toString() ||
          "Location not found"
        );
      }
      return lrData.container_offloading || "No offloading location";
    })();

    const shippingLine = (() => {
      if (
        typeof lrData.shipping_line === "object" &&
        lrData.shipping_line !== null
      ) {
        // Backend populates ShippingLine with 'name' field
        return (
          lrData.shipping_line.name ||
          lrData.shipping_line.organisation_name ||
          lrData.shipping_line.companyName ||
          lrData.shipping_line.toString() ||
          "Shipping line not found"
        );
      }
      return lrData.shipping_line || "No shipping line";
    })();

    const rowsData2 = [[containerLoading, containerOffloading, shippingLine]];
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

    // Handle populated objects or string values with comprehensive fallback
    const fromLocation = (() => {
      if (typeof item.goods_pickup === "object" && item.goods_pickup !== null) {
        // Backend populates with Location model that has 'name' field
        return (
          item.goods_pickup.name ||
          item.goods_pickup.location_name ||
          item.goods_pickup.locationName ||
          item.goods_pickup.toString() ||
          "Location not found"
        );
      }
      return item.goods_pickup || "No pickup location";
    })();

    const toLocation = (() => {
      if (
        typeof item.goods_delivery === "object" &&
        item.goods_delivery !== null
      ) {
        // Backend populates with Location model that has 'name' field
        return (
          item.goods_delivery.name ||
          item.goods_delivery.location_name ||
          item.goods_delivery.locationName ||
          item.goods_delivery.toString() ||
          "Location not found"
        );
      }
      return item.goods_delivery || "No delivery location";
    })();

    const rowsData3 = [[fromLocation, toLocation]];
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

    // Handle populated container_type object with comprehensive fallback
    const containerType = (() => {
      if (
        typeof lrData.container_type === "object" &&
        lrData.container_type !== null
      ) {
        return (
          lrData.container_type.container_type ||
          lrData.container_type.type ||
          lrData.container_type.name ||
          lrData.container_type.toString() ||
          "Container type not found"
        );
      }
      return lrData.container_type || "No container type";
    })();

    const rowsData4 = [
      [
        `${item.container_number} (${containerType})`,
        item.seal_no,
        lrData.description,
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
    // pdf.text(vehicleNoText, 40, textY + 45, null, null, "left");
    pdf.rect(180, liabilityTextY - 10, checkboxSize, checkboxSize);
    pdf.text("Consignor", 195, liabilityTextY);
    pdf.rect(265, liabilityTextY - 10, checkboxSize, checkboxSize);
    pdf.text("Consignee", 280, liabilityTextY);
    pdf.rect(345, liabilityTextY - 10, checkboxSize, checkboxSize);
    pdf.text("Transporter", 360, liabilityTextY);

    const footerStartY = liabilityTextY + 150;

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

    // Add E-Way Bill Number above the "Authorized Signatory" box
    const eWayBillText = `E-Way Bill Number: ${item.eWay_bill || "N/A"}`;
    pdf.setFontSize(12);
    pdf.setTextColor("#000000");
    pdf.text(eWayBillText, 40, lineY - 100, null, null, "left");

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
    pdf.text("Subject to Ahmedabad Jurisdiction", 40, footerStartY + 80);    const pdfDataUri = pdf.output("datauristring");
    // Open the PDF in a new tab
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(
        `<html><head><title>${subTitleText}</title><style>
           body, html { margin: 0; padding: 0; }
           iframe { border: none; width: 100%; height: 100%; }
         </style></head><body><embed width='100%' height='100%' src='${pdfDataUri}'></embed></body></html>`
      );
    } else {
      // Fallback: Download the PDF if popup is blocked
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = `${subTitleText || 'LR-Report'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

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
        `From: ${(() => {
          if (
            typeof item.goods_pickup === "object" &&
            item.goods_pickup !== null
          ) {
            // Backend populates with Location model that has 'name' field
            return (
              item.goods_pickup.name ||
              item.goods_pickup.location_name ||
              item.goods_pickup.locationName ||
              "Location not found"
            );
          }
          return item.goods_pickup || "No pickup location";
        })()}`,
        `To: ${(() => {
          if (
            typeof item.goods_delivery === "object" &&
            item.goods_delivery !== null
          ) {
            // Backend populates with Location model that has 'name' field
            return (
              item.goods_delivery.name ||
              item.goods_delivery.location_name ||
              item.goods_delivery.locationName ||
              "Location not found"
            );
          }
          return item.goods_delivery || "No delivery location";
        })()}`,
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
    });    const cashReportPdfUri = pdf2.output("datauristring");

    // Open the PDF in a new tab
    const newTab2 = window.open();
    if (newTab2) {
      newTab2.document.write(
        `<html><head><title>${subTitleText} - Cash Memo</title><style>
           body, html { margin: 0; padding: 0; }
           iframe { border: none; width: 100%; height: 100%; }
         </style></head><body><embed width='100%' height='100%' src='${cashReportPdfUri}'></embed></body></html>`
      );
    } else {
      // Fallback: Download the PDF if popup is blocked
      const link = document.createElement('a');
      link.href = cashReportPdfUri;
      link.download = `${subTitleText || 'LR-Report'}-Cash-Memo.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  });
};

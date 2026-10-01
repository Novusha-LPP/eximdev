import React, { useRef, useState } from "react";
import { Button, CircularProgress, IconButton, Tooltip } from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { SR_LOGO_BASE64 } from "./srLogoBase64";

const fmtPoDate = (d) => {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const day = String(dt.getDate()).padStart(2, "0");
    const month = dt.toLocaleString("en-GB", { month: "long" });
    const year = dt.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(d);
  }
};

const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];

  function inWords(n) {
    if ((n = n.toString()).length > 9) return 'Overflow';
    let n_arr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_arr) return '';
    let str = '';
    str += (Number(n_arr[1]) !== 0) ? (a[Number(n_arr[1])] || b[n_arr[1][0]] + a[n_arr[1][1]]) + 'Crore ' : '';
    str += (Number(n_arr[2]) !== 0) ? (a[Number(n_arr[2])] || b[n_arr[2][0]] + a[n_arr[2][1]]) + 'Lakh ' : '';
    str += (Number(n_arr[3]) !== 0) ? (a[Number(n_arr[3])] || b[n_arr[3][0]] + a[n_arr[3][1]]) + 'Thousand ' : '';
    str += (Number(n_arr[4]) !== 0) ? (a[Number(n_arr[4])] || b[n_arr[4][0]] + a[n_arr[4][1]]) + 'Hundred ' : '';
    str += (Number(n_arr[5]) !== 0) ? (a[Number(n_arr[5])] || b[n_arr[5][0]] + a[n_arr[5][1]]) : '';
    return str.trim();
  }

  const val = Math.round(Number(num) || 0);
  if (val === 0) return 'INR Zero Only';
  return 'INR ' + inWords(val) + ' Only';
};

const cleanDeliveryAddress = (str) => {
  if (!str) return "-";
  return str
    .replace(/,\s*,+/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
};

function PoLandscapePdfGenerator({
  globalData,
  stage3Data,
  targetSupplier,
  buttonLabel,
  size = "small",
  iconOnly = false,
  tooltipTitle,
  customColor,
  customBgColor,
  customHoverBg,
  icon,
}) {
  const [downloading, setDownloading] = useState(false);
  const [activeVendorIndex, setActiveVendorIndex] = useState(0);
  const pdfRef = useRef(null);

  // Common Identifiers
  const prNumber = globalData?.prNumber || globalData?.stage1?.prNumber || "-";
  const rawPoNumber = globalData?.poNumber || globalData?.stage3?.poNumber || globalData?.stage2?.poNumber || "-";
  const prDate = fmtPoDate(globalData?.createdAt || globalData?.stage1?.prDate || globalData?.stage1?.routingChecklist?.[0]?.date);
  const poDate = fmtPoDate(globalData?.stage3?.poDate || globalData?.stage2?.poDate || globalData?.stage3?.signOff?.dateOfApproval || new Date());
  const prRaisedBy = globalData?.stage1?.preparedBy || globalData?.stage1?.requesterName || globalData?.stage2?.purchaseOfficerName || "-";
  const checkedByName = globalData?.stage1?.hodValidation?.validatedBy || "-";
  const approvedByName = globalData?.stage3?.signOff?.financeManagerName || globalData?.stage3?.decision?.approvedBy || "-";

  // Company / Buyer Details
  const buyerName = globalData?.companyName || globalData?.buyerName || "S R CONTAINER CARRIERS";
  const buyerAddress1 = globalData?.companyAddress || globalData?.buyerAddress || "A/206, WALL STREET II,";
  const buyerAddress2 = globalData?.buyerAddress2 || "OPP. ORIENT CLUB, ELLISBRIDGE,";
  const buyerCityState = globalData?.buyerCityState || "AHMEDABAD - 380006, Gujarat";
  const buyerGstin = globalData?.companyGstin || globalData?.gstin || "24ANGPR7652E1ZV";
  const buyerStateCode = globalData?.buyerStateCode || "State: Gujarat, Code: 24";
  const buyerEmail = globalData?.companyEmail || "purchase@surajgroupofcompanies.com";

  // Items / Products List
  const rawItems = globalData?.stage1?.itemsRequired || globalData?.stage1?.items || [];

  // Stage 2 Suppliers
  const stage2Suppliers = globalData?.stage2?.suppliers || [];
  const stage2Selected = globalData?.stage2?.selectedSuppliers || [];

  let awardedSuppliers = [];
  if (targetSupplier) {
    const sName = typeof targetSupplier === "string" ? targetSupplier : (targetSupplier.selectedSupplier || targetSupplier.supplierName);
    const full = stage2Suppliers.find(
      (s) =>
        s.supplierName === sName ||
        s._id === sName ||
        s.supplierNameInBank === sName ||
        (sName && s.supplierName && s.supplierName.trim().toUpperCase() === sName.trim().toUpperCase())
    ) || {};
    awardedSuppliers = [{
      supplierName: sName || full.supplierName || full.supplierNameInBank || "-",
      totalOrderValue: Number(targetSupplier.totalOrderValue) || full.totalOrderValue || 0,
      priceQuoted: Number(targetSupplier.priceQuoted) || full.unitPriceNew || full.priceQuoted || 0,
      reasonForSelection: targetSupplier.reasonForSelection || full.reasonForSelection || "",
      poNumber: targetSupplier.poNumber || globalData?.poNumber || rawPoNumber,
      ...full,
      ...(typeof targetSupplier === "object" ? targetSupplier : {}),
    }];
  } else if (stage2Selected && stage2Selected.length > 0) {
    awardedSuppliers = stage2Selected.map((sel) => {
      const sName = sel.selectedSupplier || sel.supplierName;
      const full = stage2Suppliers.find(
        (s) =>
          s.supplierName === sName ||
          s._id === sName ||
          s.supplierNameInBank === sName ||
          (sName && s.supplierName && s.supplierName.trim().toUpperCase() === sName.trim().toUpperCase())
      ) || {};
      return {
        supplierName: sName || full.supplierName || full.supplierNameInBank || "-",
        totalOrderValue: Number(sel.totalOrderValue) || full.totalOrderValue || 0,
        priceQuoted: Number(sel.priceQuoted) || full.unitPriceNew || full.priceQuoted || 0,
        reasonForSelection: sel.reasonForSelection || "",
        poNumber: sel.poNumber || globalData?.poNumber || rawPoNumber,
        ...full,
        ...sel,
      };
    });
  } else if (stage2Suppliers.length > 0) {
    awardedSuppliers = stage2Suppliers;
  } else if (globalData?.stage2?.selectedSupplierL1) {
    awardedSuppliers = [{
      supplierName: globalData.stage2.selectedSupplierL1,
      totalOrderValue: Number(globalData.stage2.totalOrderValue) || 0,
      poNumber: globalData.poNumber || rawPoNumber,
    }];
  } else {
    awardedSuppliers = [{
      supplierName: "-",
      totalOrderValue: 0,
      poNumber: rawPoNumber,
    }];
  }

  const currentVendor = awardedSuppliers[activeVendorIndex] || awardedSuppliers[0] || {};
  const vendorName = currentVendor.supplierName || currentVendor.supplierNameInBank || "-";
  const vendorAddress = currentVendor.supplierAddress || currentVendor.address || "-";
  const vendorGst = currentVendor.gstNumber || currentVendor.gstin || "-";
  const vendorEmail = (currentVendor.emailWhatsApp && currentVendor.emailWhatsApp.includes("@"))
    ? currentVendor.emailWhatsApp
    : (currentVendor.email || "-");
  const vendorBank = currentVendor.bankName || "-";
  const vendorAccNo = currentVendor.bankAccountNo || currentVendor.accountNumber || "-";
  const vendorIfsc = currentVendor.bankIfscCode || currentVendor.ifscCode || "-";
  const vendorBranch = currentVendor.bankBranchCode || currentVendor.branch || "-";
  const vendorPaymentTerms = currentVendor.paymentTerms || globalData?.stage2?.paymentTerms || "-";
  const vendorDeliveryTerms = currentVendor.deliveryTimeline || globalData?.stage2?.deliveryTimeline || "-";
  const poNumberToDisplay = currentVendor.poNumber || rawPoNumber || "-";
  const refQuotationNo = currentVendor.quotationNo || currentVendor.refQuotationNo || prNumber || "-";
  const quotationDateFormatted = currentVendor.quotationDate
    ? fmtPoDate(currentVendor.quotationDate)
    : (globalData?.createdAt ? fmtPoDate(globalData.createdAt) : "-");

  const rawDeliveryLocation =
    currentVendor.deliveryLocation ||
    globalData?.stage2?.deliveryLocation ||
    globalData?.stage1?.deliveryLocation ||
    globalData?.stage1?.departmentLocation ||
    globalData?.stage1?.deliveryLocationSite ||
    buyerAddress1 ||
    "-";
  const finalDeliveryLocation = cleanDeliveryAddress(rawDeliveryLocation);

  // Compute Items
  let totalQtySum = 0;
  rawItems.forEach((it) => {
    totalQtySum += Number(it.qty || it.quantityRequested || it.quantity || 0);
  });
  const prTotalQuantity = totalQtySum > 0 ? totalQtySum : 1;

  const vendorTotalOrderValue = Number(currentVendor.totalOrderValue) || 0;
  const vendorUnitPrice = Number(currentVendor.unitPriceNew || currentVendor.priceQuoted || 0);

  const explicitVendorQty = Number(
    currentVendor.allocatedQty ||
    currentVendor.orderQty ||
    currentVendor.qty ||
    currentVendor.quantity ||
    0
  );

  let vendorAllocatedTotalQty =
    explicitVendorQty ||
    (vendorTotalOrderValue > 0 && vendorUnitPrice > 0
      ? Math.round(vendorTotalOrderValue / vendorUnitPrice)
      : prTotalQuantity) ||
    1;

  let calculatedSubTotal = 0;
  let calculatedTotalGst = 0;

  const itemsList = rawItems.length > 0 ? rawItems : [];

  const computedItems = itemsList.map((item, idx) => {
    let itemQty = 0;
    if (rawItems.length <= 1) {
      itemQty = vendorAllocatedTotalQty;
    } else {
      const rawItemQty = Number(item.qty || item.quantityRequested || item.quantity || 1);
      const ratio = prTotalQuantity > 0 ? rawItemQty / prTotalQuantity : 1 / rawItems.length;
      itemQty = Math.round(vendorAllocatedTotalQty * ratio) || rawItemQty;
    }

    const itemRate = Number(
      vendorUnitPrice ||
      item.rate ||
      item.estUnitCost ||
      item.unitPrice ||
      (vendorAllocatedTotalQty ? Math.round(vendorTotalOrderValue / vendorAllocatedTotalQty) : 0)
    );
    const itemBase = itemQty * itemRate;

    let itemGst = 0;
    if (currentVendor.gstAmount !== undefined && currentVendor.gstAmount !== null && Number(currentVendor.gstAmount) > 0) {
      itemGst = rawItems.length > 1 ? Math.round(Number(currentVendor.gstAmount) / rawItems.length) : Number(currentVendor.gstAmount);
    } else if (currentVendor.gstRate) {
      const rateVal = parseFloat(String(currentVendor.gstRate).replace("%", "")) || 0;
      itemGst = Math.round((itemBase * rateVal) / 100);
    } else if (item.gstAmount) {
      itemGst = Number(item.gstAmount) || 0;
    }

    calculatedSubTotal += itemBase;
    calculatedTotalGst += itemGst;

    const productName = item.productName || item.tyreType || item.description || currentVendor.selectedProduct || "Item";
    const brand = item.brandPreference || item.tyreBrand || currentVendor.tyreBrand || "";
    const spec = item.sizeSpec || item.sizeSpecification || item.specification || currentVendor.sizeSpecification || "";
    const fullDescription = [productName, brand, spec].filter(Boolean).join(" - ");

    return {
      srNo: idx + 1,
      description: fullDescription || "Goods Specification as per Purchase Order",
      hsnCode: item.hsnCode || item.hsn || currentVendor.hsnCode || "-",
      unit: item.unit || (itemQty ? `${itemQty} NOS` : "NOS"),
      itemQty,
      itemRate,
      discPercent: currentVendor.discountOffered ? `${currentVendor.discountOffered}%` : "-",
      itemTotal: itemBase,
    };
  });

  const grandTotal = vendorTotalOrderValue > 0 ? vendorTotalOrderValue : (calculatedSubTotal + calculatedTotalGst);
  const gstRateDisplay = currentVendor.gstRate
    ? String(currentVendor.gstRate).replace(/%/g, '')
    : (calculatedTotalGst > 0 && calculatedSubTotal > 0
        ? String(Math.round((calculatedTotalGst / calculatedSubTotal) * 100))
        : "18");
  const amountInWordsText = numberToWords(grandTotal);

  const handleGeneratePdf = async () => {
    if (!pdfRef.current) return;
    setDownloading(true);
    try {
      const element = pdfRef.current;
      element.style.display = "block";

      const poClean = poNumberToDisplay !== "-" ? String(poNumberToDisplay).replace(/[\/\\]/g, "_") : "PO";

      if (targetSupplier) {
        setActiveVendorIndex(0);
        await new Promise((resolve) => setTimeout(resolve, 200));

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.82);
        const pdf = new jsPDF("portrait", "pt", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth - 30;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "JPEG", 15, 15, imgWidth, Math.min(imgHeight, pdfHeight - 30), undefined, "FAST");
        const suppNameClean = (awardedSuppliers[0].supplierName || "Supplier").replace(/[^a-zA-Z0-9_-]/g, "_");
        pdf.save(`Purchase_Order_${suppNameClean}_${poClean}.pdf`);
      } else {
        const pdf = new jsPDF("portrait", "pt", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < awardedSuppliers.length; i++) {
          setActiveVendorIndex(i);
          await new Promise((resolve) => setTimeout(resolve, 200));

          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.82);
          const imgWidth = pdfWidth - 30;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (i > 0) {
            pdf.addPage();
          }

          pdf.addImage(imgData, "JPEG", 15, 15, imgWidth, Math.min(imgHeight, pdfHeight - 30), undefined, "FAST");
        }

        pdf.save(`Combined_Purchase_Orders_${poClean}.pdf`);
      }

      element.style.display = "none";
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
      setActiveVendorIndex(0);
    }
  };

  const labelText =
    buttonLabel ||
    (downloading
      ? "Generating PO..."
      : `DOWNLOAD PO PDF (${awardedSuppliers.length})`);

  // Shared Border and Navy Blue Color Palette
  const NAVY = "#0f3b6c";
  const BORDER_STYLE = `1px solid ${NAVY}`;
  const HEADER_BG = "#f0f4f8";

  return (
    <>
      {iconOnly ? (
        <Tooltip title={`Download Purchase Order PDF (${awardedSuppliers.length} PO${awardedSuppliers.length > 1 ? "s" : ""})`}>
          <span>
            <IconButton
              size="small"
              onClick={handleGeneratePdf}
              disabled={downloading}
              sx={{
                color: "#0f3b6c",
                bgcolor: "#f0f4f8",
                "&:hover": { bgcolor: "#e2e8f0" },
              }}
            >
              {downloading ? <CircularProgress size={16} sx={{ color: "#0f3b6c" }} /> : <PictureAsPdfIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <Button
          variant="contained"
          startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
          onClick={handleGeneratePdf}
          disabled={downloading}
          size={size}
          sx={{
            fontWeight: "bold",
            backgroundColor: "#0f3b6c",
            "&:hover": { backgroundColor: "#092545" },
          }}
        >
          {labelText}
        </Button>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Hidden PO Printable Template Matching Exactly the PO Format */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        ref={pdfRef}
        style={{
          display: "none",
          width: "780px",
          minWidth: "780px",
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
          fontSize: "11px",
          padding: "24px 28px",
          boxSizing: "border-box",
          border: "2px solid #000000",
        }}
      >
        {/* Header: Logo (Left) & PURCHASE ORDER Navy Bar (Right) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <img
              src={SR_LOGO_BASE64}
              alt="SR Container Carriers - Delivering Prosperity..."
              style={{ height: "54px", maxWidth: "220px", width: "auto", display: "block", objectFit: "contain" }}
            />
          </div>
          <div
            style={{
              backgroundColor: NAVY,
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "18px",
              letterSpacing: "1px",
              textAlign: "center",
              padding: "8px 36px",
              borderRadius: "2px",
              textTransform: "uppercase",
              minWidth: "300px",
            }}
          >
            PURCHASE ORDER
          </div>
        </div>

        {/* 1. BUYER (Bill to / Ship to) & VENDOR Boxes */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: BORDER_STYLE, marginBottom: "12px" }}>
          <thead>
            <tr>
              <th
                style={{
                  width: "50%",
                  borderRight: BORDER_STYLE,
                  borderBottom: BORDER_STYLE,
                  padding: "6px 10px",
                  textAlign: "left",
                  color: NAVY,
                  fontWeight: 800,
                  fontSize: "11.5px",
                  backgroundColor: HEADER_BG,
                }}
              >
                BUYER (Bill to / Ship to)
              </th>
              <th
                style={{
                  width: "50%",
                  borderBottom: BORDER_STYLE,
                  padding: "6px 10px",
                  textAlign: "left",
                  color: NAVY,
                  fontWeight: 800,
                  fontSize: "11.5px",
                  backgroundColor: HEADER_BG,
                }}
              >
                VENDOR
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ borderRight: BORDER_STYLE, padding: "8px 10px", verticalAlign: "top", fontSize: "10.5px", lineHeight: "1.45" }}>
                <div style={{ fontWeight: 800, color: "#000000", fontSize: "11.5px" }}>{buyerName}</div>
                <div>{buyerAddress1}</div>
                <div>{buyerAddress2}</div>
                <div>{buyerCityState}</div>
                <div><strong>GSTIN:</strong> {buyerGstin}</div>
                <div>{buyerStateCode}</div>
                <div><strong>Email:</strong> {buyerEmail}</div>
              </td>
              <td style={{ padding: "8px 10px", verticalAlign: "top", fontSize: "10.5px", lineHeight: "1.45" }}>
                <div style={{ fontWeight: 800, color: "#000000", fontSize: "11.5px" }}>{vendorName}</div>
                <div>{vendorAddress}</div>
                <div><strong>GSTIN:</strong> {vendorGst}</div>
                <div><strong>Email:</strong> {vendorEmail}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 2. PO Details Grid (4 Columns, 3 Rows) */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: BORDER_STYLE, marginBottom: "12px", fontSize: "11px" }}>
          <tbody>
            <tr>
              <td style={{ width: "22%", padding: "6px 10px", borderRight: BORDER_STYLE, borderBottom: BORDER_STYLE, color: NAVY, fontWeight: 700, backgroundColor: HEADER_BG }}>
                PO Number
              </td>
              <td style={{ width: "28%", padding: "6px 10px", borderRight: BORDER_STYLE, borderBottom: BORDER_STYLE, fontWeight: 600 }}>
                {poNumberToDisplay}
              </td>
              <td style={{ width: "22%", padding: "6px 10px", borderRight: BORDER_STYLE, borderBottom: BORDER_STYLE, color: NAVY, fontWeight: 700, backgroundColor: HEADER_BG }}>
                PO Date
              </td>
              <td style={{ width: "28%", padding: "6px 10px", borderBottom: BORDER_STYLE, fontWeight: 600 }}>
                {poDate}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "6px 10px", borderRight: BORDER_STYLE, borderBottom: BORDER_STYLE, color: NAVY, fontWeight: 700, backgroundColor: HEADER_BG }}>
                Ref. Quotation No.
              </td>
              <td style={{ padding: "6px 10px", borderRight: BORDER_STYLE, borderBottom: BORDER_STYLE, fontWeight: 600 }}>
                {refQuotationNo}
              </td>
              <td style={{ padding: "6px 10px", borderRight: BORDER_STYLE, borderBottom: BORDER_STYLE, color: NAVY, fontWeight: 700, backgroundColor: HEADER_BG }}>
                Quotation Date
              </td>
              <td style={{ padding: "6px 10px", borderBottom: BORDER_STYLE, fontWeight: 600 }}>
                {quotationDateFormatted}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "6px 10px", borderRight: BORDER_STYLE, color: NAVY, fontWeight: 700, backgroundColor: HEADER_BG }}>
                Mode of Payment
              </td>
              <td style={{ padding: "6px 10px", borderRight: BORDER_STYLE, fontWeight: 600 }}>
                {vendorPaymentTerms}
              </td>
              <td style={{ padding: "6px 10px", borderRight: BORDER_STYLE, color: NAVY, fontWeight: 700, backgroundColor: HEADER_BG }}>
                Delivery Terms
              </td>
              <td style={{ padding: "6px 10px", fontWeight: 600 }}>
                {vendorDeliveryTerms}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 3. Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: BORDER_STYLE, marginBottom: "8px", fontSize: "11px" }}>
          <thead>
            <tr style={{ backgroundColor: NAVY, color: "#ffffff", fontWeight: 700 }}>
              <th style={{ width: "6%", padding: "6px 4px", borderRight: "1px solid #ffffff", textAlign: "center" }}>Sr.</th>
              <th style={{ width: "40%", padding: "6px 8px", borderRight: "1px solid #ffffff", textAlign: "left" }}>Description of Goods</th>
              <th style={{ width: "13%", padding: "6px 6px", borderRight: "1px solid #ffffff", textAlign: "center" }}>HSN/SAC</th>
              <th style={{ width: "9%", padding: "6px 4px", borderRight: "1px solid #ffffff", textAlign: "center" }}>Unit</th>
              <th style={{ width: "14%", padding: "6px 8px", borderRight: "1px solid #ffffff", textAlign: "right" }}>Rate/Unit (INR)</th>
              <th style={{ width: "6%", padding: "6px 4px", borderRight: "1px solid #ffffff", textAlign: "center" }}>Disc.%</th>
              <th style={{ width: "12%", padding: "6px 8px", textAlign: "right" }}>Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            {computedItems.map((cItem, idx) => (
              <tr key={idx} style={{ borderBottom: BORDER_STYLE }}>
                <td style={{ padding: "6px 4px", borderRight: BORDER_STYLE, textAlign: "center", fontWeight: 600 }}>
                  {cItem.srNo}
                </td>
                <td style={{ padding: "6px 8px", borderRight: BORDER_STYLE, fontWeight: 700, color: "#000000" }}>
                  {cItem.description}
                </td>
                <td style={{ padding: "6px 6px", borderRight: BORDER_STYLE, textAlign: "center" }}>
                  {cItem.hsnCode}
                </td>
                <td style={{ padding: "6px 4px", borderRight: BORDER_STYLE, textAlign: "center" }}>
                  {cItem.unit}
                </td>
                <td style={{ padding: "6px 8px", borderRight: BORDER_STYLE, textAlign: "right" }}>
                  {Number(cItem.itemRate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: "6px 4px", borderRight: BORDER_STYLE, textAlign: "center" }}>
                  {cItem.discPercent}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>
                  {Number(cItem.itemTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}

            {/* GST Row if applicable */}
            {calculatedTotalGst > 0 && (
              <tr style={{ borderBottom: BORDER_STYLE }}>
                <td style={{ borderRight: BORDER_STYLE }}></td>
                <td style={{ borderRight: BORDER_STYLE }}></td>
                <td style={{ borderRight: BORDER_STYLE }}></td>
                <td style={{ borderRight: BORDER_STYLE }}></td>
                <td style={{ padding: "5px 8px", borderRight: BORDER_STYLE, textAlign: "right", fontWeight: 700, color: NAVY }}>
                  GST @ {gstRateDisplay}%
                </td>
                <td style={{ borderRight: BORDER_STYLE }}></td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>
                  {Number(calculatedTotalGst).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            )}

            {/* TOTAL Row with Navy Blue Total Cell */}
            <tr>
              <td colSpan="3" style={{ borderRight: BORDER_STYLE, padding: "6px 8px", textAlign: "right", fontWeight: 800, fontSize: "11.5px" }}>
                TOTAL
              </td>
              <td style={{ borderRight: BORDER_STYLE, padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>
                {vendorAllocatedTotalQty} Nos
              </td>
              <td style={{ borderRight: BORDER_STYLE }}></td>
              <td style={{ borderRight: BORDER_STYLE }}></td>
              <td
                style={{
                  backgroundColor: NAVY,
                  color: "#ffffff",
                  fontWeight: 900,
                  fontSize: "12px",
                  textAlign: "right",
                  padding: "6px 8px",
                }}
              >
                INR {Number(grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 4. Amount in Words Box */}
        <div
          style={{
            border: BORDER_STYLE,
            padding: "6px 10px",
            marginBottom: "10px",
            fontSize: "11px",
            backgroundColor: "#ffffff",
          }}
        >
          <strong>Amount in Words:</strong> {amountInWordsText}
        </div>

        {/* 5. TERMS AND CONDITIONS Box */}
        <div style={{ border: BORDER_STYLE, marginBottom: "10px" }}>
          <div
            style={{
              backgroundColor: NAVY,
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "11.5px",
              padding: "4px 10px",
              letterSpacing: "0.5px",
            }}
          >
            TERMS AND CONDITIONS
          </div>
          <div style={{ padding: "8px 12px", fontSize: "10px", lineHeight: "1.45", color: "#000000" }}>
            <div style={{ marginBottom: "3px" }}>
              <strong>1. Payment Terms:</strong> {vendorPaymentTerms !== "-" ? vendorPaymentTerms : "As per agreed procurement terms."}
            </div>
            <div style={{ marginBottom: "3px" }}>
              <strong>2. Delivery Timeline:</strong> {vendorDeliveryTerms !== "-" ? vendorDeliveryTerms : "As per purchase order schedule."}
            </div>
            <div style={{ marginBottom: "3px" }}>
              <strong>3. Quality & Specifications:</strong> Goods supplied must conform strictly to the technical specifications approved in the Purchase Order.
            </div>
            <div style={{ marginBottom: "3px" }}>
              <strong>4. Warranty & Guarantee:</strong> Standard manufacturer/supplier warranty applies to all delivered goods.
            </div>
            <div style={{ marginBottom: "6px" }}>
              <strong>5. Inspection & Delivery:</strong> Delivery acceptance is subject to site inspection and physical verification. Original Tax Invoice and delivery documentation must accompany the shipment.
            </div>

            {(vendorBank !== "-" || vendorAccNo !== "-") && (
              <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: "5px", fontSize: "10px" }}>
                <strong>Bank Details for Payment (Vendor):</strong>
                {vendorName !== "-" && <> A/c Holder: <strong>{vendorName}</strong> |</>}
                {vendorBank !== "-" && <> Bank: <strong>{vendorBank}</strong> |</>}
                {vendorAccNo !== "-" && <> A/c No: <strong>{vendorAccNo}</strong> |</>}
                {vendorIfsc !== "-" && <> IFSC: <strong>{vendorIfsc}</strong> |</>}
                {vendorBranch !== "-" && <> Branch: <strong>{vendorBranch}</strong></>}
              </div>
            )}
          </div>
        </div>

        {/* 6. DELIVERY AND INSTALLATION LOCATION Box */}
        <div style={{ border: BORDER_STYLE, marginBottom: "14px" }}>
          <div
            style={{
              backgroundColor: NAVY,
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "11.5px",
              padding: "4px 10px",
              letterSpacing: "0.5px",
            }}
          >
            DELIVERY LOCATION:
          </div>
          <div style={{ padding: "8px 12px", fontSize: "10.5px", lineHeight: "1.45", color: "#000000" }}>
            {finalDeliveryLocation}
          </div>
        </div>

        {/* 7. Signatures Block */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 4px", fontSize: "10.5px", lineHeight: "1.5" }}>
          <div style={{ width: "32%" }}>
            <div style={{ fontWeight: 800, color: NAVY, textDecoration: "underline", marginBottom: "2px" }}>
              Prepared By:
            </div>
            <div><strong>Name:</strong> {prRaisedBy}</div>
            <div><strong>Designation:</strong> Purchase Officer</div>
            <div><strong>Sign. & Date:</strong> _________________</div>
          </div>

          <div style={{ width: "32%" }}>
            <div style={{ fontWeight: 800, color: NAVY, textDecoration: "underline", marginBottom: "2px" }}>
              Checked By:
            </div>
            <div><strong>Name:</strong> {checkedByName}</div>
            <div><strong>Designation:</strong> HR/Admin</div>
            <div><strong>Sign. & Date:</strong> _________________</div>
          </div>

          <div style={{ width: "32%" }}>
            <div style={{ fontWeight: 800, color: NAVY, textDecoration: "underline", marginBottom: "2px" }}>
              Approved By:
            </div>
            <div><strong>Name:</strong> {approvedByName}</div>
            <div><strong>Designation:</strong> Sr. Manager - Accounts</div>
            <div><strong>Sign. & Date:</strong> _________________</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default React.memo(PoLandscapePdfGenerator);

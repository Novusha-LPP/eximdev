import React, { useRef, useState, useEffect } from "react";
import { Button, CircularProgress, IconButton, Tooltip, Box } from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { SR_LOGO_BASE64 } from "./srLogoBase64";
import { COMPANY_PROFILES, getCompanyProfile } from "./companyProfiles";

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

const fmtPoDateTime = (d) => {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const day = String(dt.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[dt.getMonth()];
    const year = dt.getFullYear();
    let hours = dt.getHours();
    const minutes = String(dt.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day}-${month}-${year} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
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

  // Active Company Selection (Inherited from Stage 1 PR identity)
  const initialCompany =
    globalData?.companyKey ||
    globalData?.stage1?.companyKey ||
    globalData?.companyName ||
    stage3Data?.companyKey ||
    "SURAVIO";
  const [selectedCompanyKey, setSelectedCompanyKey] = useState(() => {
    const prof = getCompanyProfile(initialCompany);
    return prof.id || "SURAVIO";
  });

  // Active Format: "standard" (plain white with logo) | "letterhead" (official letterhead frame, logo suppressed) | "plain" (pre-printed paper)
  const [poFormatStyle, setPoFormatStyle] = useState(() => {
    if (globalData?.poFormatStyle) return globalData.poFormatStyle;
    const prof = getCompanyProfile(initialCompany);
    return prof.defaultPoFormatStyle || "standard";
  });

  // Synchronize when globalData updates
  useEffect(() => {
    const comp =
      globalData?.companyKey ||
      globalData?.stage1?.companyKey ||
      globalData?.companyName ||
      stage3Data?.companyKey;
    if (comp) {
      const prof = getCompanyProfile(comp);
      setSelectedCompanyKey(prof.id || comp);
      if (prof.defaultPoFormatStyle && !globalData?.poFormatStyle) {
        setPoFormatStyle(prof.defaultPoFormatStyle);
      }
    }
    if (globalData?.poFormatStyle) {
      setPoFormatStyle(globalData.poFormatStyle);
    }
  }, [globalData?.companyKey, globalData?.stage1?.companyKey, globalData?.companyName, stage3Data?.companyKey, globalData?.poFormatStyle]);

  // Resolve Company Profile
  const activeProfile = getCompanyProfile(selectedCompanyKey || globalData?.companyKey || globalData?.companyName);
  const isLetterhead = poFormatStyle === "letterhead" && Boolean(activeProfile.letterheadBase64);
  const isPlain = poFormatStyle === "plain";

  // Common Identifiers
  const prNumber = globalData?.prNumber || globalData?.stage1?.prNumber || "-";
  const rawPoNumber = globalData?.poNumber || globalData?.stage3?.poNumber || globalData?.stage2?.poNumber || "-";
  const prDate = fmtPoDate(globalData?.createdAt || globalData?.stage1?.prDate || globalData?.stage1?.routingChecklist?.[0]?.date);
  const poDate = fmtPoDate(globalData?.stage3?.poDate || globalData?.stage2?.poDate || globalData?.stage3?.signOff?.dateOfApproval || new Date());
  const prRaisedBy = globalData?.stage1?.preparedBy || globalData?.stage1?.requesterName || globalData?.stage2?.purchaseOfficerName || "-";
  const checkedByName =
    globalData?.checkedBy ||
    globalData?.stage2?.checkedBy ||
    globalData?.stage1?.checkedBy ||
    globalData?.stage1?.hodValidation?.validatedBy ||
    activeProfile.settings?.hodApproverName ||
    "MOHIT SINGH";
  const checkedByDesignation =
    globalData?.checkedByDesignation ||
    globalData?.stage2?.checkedByDesignation ||
    globalData?.stage1?.checkedByDesignation ||
    globalData?.stage1?.hodValidation?.designation ||
    activeProfile.settings?.hodApproverDesignation ||
    "CEO";
  const preparedByDesignation =
    globalData?.stage1?.preparedByDesignation ||
    globalData?.stage2?.preparedByDesignation ||
    "Purchase Officer";
  const approvedByDesignation =
    globalData?.stage3?.signOff?.designation ||
    globalData?.stage3?.approvedByDesignation ||
    "Sr. Manager - Accounts";
  const approvedByName = globalData?.stage3?.signOff?.financeManagerName || globalData?.stage3?.decision?.approvedBy || "-";

  // Company / Buyer Details (Dynamic based on selected Company Profile)
  const buyerName = globalData?.buyerName || globalData?.companyName || activeProfile.buyerName;
  const buyerAddress1 = globalData?.companyAddress || globalData?.buyerAddress || activeProfile.buyerAddress1;
  const buyerAddress2 = activeProfile.buyerAddress2 || "";
  const buyerCityState = activeProfile.buyerCityState || "";
  const buyerPan = globalData?.companyPan || activeProfile.buyerPan || "";
  const buyerGstin = globalData?.companyGstin || globalData?.gstin || activeProfile.buyerGstin;
  const buyerStateCode = activeProfile.buyerStateCode || "State: Gujarat, Code: 24";
  const buyerEmail = globalData?.companyEmail || activeProfile.buyerEmail;
  const buyerPhone = globalData?.companyPhone || activeProfile.buyerPhone || "";

  // Items / Products List
  const rawItems = globalData?.stage1?.itemsRequired || globalData?.stage1?.items || [];

  // Stage 2 Suppliers
  const stage2Suppliers = globalData?.stage2?.suppliers || [];
  const stage2Selected = globalData?.stage2?.selectedSuppliers || [];

  let awardedSuppliers = [];
  if (targetSupplier) {
    const sName =
      (typeof targetSupplier === "string"
        ? targetSupplier
        : targetSupplier.selectedSupplier || targetSupplier.supplierName || targetSupplier.name || "")?.trim();

    const full =
      stage2Suppliers.find(
        (s) =>
          (sName && s.supplierName && s.supplierName.trim().toUpperCase() === sName.toUpperCase()) ||
          (sName && s._id && String(s._id) === String(sName)) ||
          (sName && s.supplierNameInBank && s.supplierNameInBank.trim().toUpperCase() === sName.toUpperCase())
      ) ||
      stage2Suppliers.find((s) => s.supplierName && !s.supplierName.toUpperCase().startsWith("SUPPLIER ")) ||
      stage2Suppliers[0] ||
      {};

    const resolvedSupplierName =
      sName ||
      full.supplierName ||
      full.supplierNameInBank ||
      (typeof targetSupplier === "object" ? targetSupplier.supplierName : "") ||
      "-";

    awardedSuppliers = [{
      supplierName: resolvedSupplierName,
      totalOrderValue: Number(targetSupplier.totalOrderValue) || full.totalOrderValue || 0,
      priceQuoted: Number(targetSupplier.priceQuoted) || full.unitPriceNew || full.priceQuoted || 0,
      reasonForSelection: targetSupplier.reasonForSelection || full.reasonForSelection || "",
      poNumber: targetSupplier.poNumber || globalData?.poNumber || rawPoNumber,
      ...full,
      ...(typeof targetSupplier === "object" ? targetSupplier : {}),
      supplierName: resolvedSupplierName,
    }];
  } else if (stage2Selected && stage2Selected.length > 0) {
    awardedSuppliers = stage2Selected.map((sel) => {
      const sName = (sel.selectedSupplier || "").trim();
      const full =
        stage2Suppliers.find(
          (s) =>
            (sName && s.supplierName && s.supplierName.trim().toUpperCase() === sName.toUpperCase()) ||
            (sName && s._id && String(s._id) === String(sName)) ||
            (sName && s.supplierNameInBank && s.supplierNameInBank.trim().toUpperCase() === sName.toUpperCase())
        ) ||
        stage2Suppliers.find((s) => s.supplierName && !s.supplierName.toUpperCase().startsWith("SUPPLIER ")) ||
        stage2Suppliers[0] ||
        {};

      return {
        supplierName: sName || full.supplierName || full.supplierNameInBank || "-",
        totalOrderValue: Number(sel.totalOrderValue) || full.totalOrderValue || 0,
        priceQuoted: Number(sel.priceQuoted) || full.unitPriceNew || full.priceQuoted || 0,
        reasonForSelection: sel.reasonForSelection || full.reasonForSelection || "",
        poNumber: sel.poNumber || globalData?.poNumber || rawPoNumber,
        ...full,
        ...sel,
        supplierName: sName || full.supplierName || full.supplierNameInBank || "-",
      };
    });
  } else if (stage2Suppliers.length > 0) {
    const validSuppliers = stage2Suppliers.filter((s) => s.supplierName && !s.supplierName.toUpperCase().startsWith("SUPPLIER "));
    const chosenList = validSuppliers.length > 0 ? validSuppliers : [stage2Suppliers[0]];

    awardedSuppliers = chosenList.map((full) => ({
      supplierName: full.supplierName || full.supplierNameInBank || "-",
      totalOrderValue: Number(full.totalOrderValue) || 0,
      priceQuoted: Number(full.unitPriceNew || full.priceQuoted) || 0,
      reasonForSelection: full.reasonForSelection || "",
      poNumber: full.poNumber || globalData?.poNumber || rawPoNumber,
      ...full,
    }));
  }

  if (awardedSuppliers.length === 0) {
    awardedSuppliers = [{
      supplierName: "-",
      totalOrderValue: 0,
      priceQuoted: 0,
      poNumber: globalData?.poNumber || rawPoNumber,
    }];
  }

  const currentVendor = awardedSuppliers[activeVendorIndex] || awardedSuppliers[0] || {};

  const vendorName =
    currentVendor.supplierName ||
    currentVendor.supplierNameInBank ||
    targetSupplier?.supplierName ||
    "-";

  const rawVendorAddress =
    currentVendor.supplierAddress ||
    currentVendor.address ||
    targetSupplier?.supplierAddress ||
    targetSupplier?.address ||
    "-";
  const vendorAddress = cleanDeliveryAddress(rawVendorAddress);

  const vendorGst =
    currentVendor.gstNumber ||
    currentVendor.gstNo ||
    currentVendor.gst ||
    targetSupplier?.gstNumber ||
    "-";

  const vendorPhone =
    currentVendor.phoneNumber ||
    currentVendor.phone ||
    currentVendor.contactNumber ||
    currentVendor.mobile ||
    targetSupplier?.phoneNumber ||
    "-";

  const vendorBank =
    currentVendor.bankName ||
    targetSupplier?.bankName ||
    "-";

  const vendorAccNo =
    currentVendor.bankAccountNo ||
    currentVendor.accountNumber ||
    targetSupplier?.bankAccountNo ||
    "-";

  const vendorIfsc =
    currentVendor.bankIfscCode ||
    currentVendor.ifscCode ||
    targetSupplier?.bankIfscCode ||
    targetSupplier?.ifscCode ||
    "-";

  const vendorBranch =
    currentVendor.bankBranchCode ||
    currentVendor.branch ||
    targetSupplier?.bankBranchCode ||
    "-";

  const vendorPaymentTerms =
    currentVendor.paymentTerms ||
    targetSupplier?.paymentTerms ||
    globalData?.stage2?.paymentTerms ||
    "-";

  const vendorDeliveryTerms =
    currentVendor.deliveryTimeline ||
    targetSupplier?.deliveryTimeline ||
    globalData?.stage2?.deliveryTimeline ||
    "-";

  const poNumberToDisplay =
    currentVendor.poNumber ||
    targetSupplier?.poNumber ||
    rawPoNumber ||
    "-";

  // Delivery Location & Contact with fallback to Company Profile defaults
  const rawDeliveryLocation =
    currentVendor.deliveryLocation ||
    globalData?.stage2?.deliveryLocation ||
    globalData?.stage1?.deliveryLocation ||
    globalData?.stage1?.departmentLocation ||
    globalData?.stage1?.deliveryLocationSite ||
    activeProfile.defaultDeliveryLocation ||
    buyerAddress1 ||
    "-";
  const finalDeliveryLocation = cleanDeliveryAddress(rawDeliveryLocation);

  const deliveryContactNo =
    currentVendor.deliveryContact ||
    globalData?.stage2?.deliveryContact ||
    globalData?.stage1?.deliveryContact ||
    globalData?.stage1?.deliveryContactPerson ||
    globalData?.stage1?.requesterPhone ||
    activeProfile.defaultDeliveryContact ||
    "-";

  const isGstFreightIncluded = Boolean(
    currentVendor.isGstFreightIncluded ??
    globalData?.stage2?.isGstFreightIncluded ??
    globalData?.isGstFreightIncluded ??
    false
  );

  const customTermsList =
    Array.isArray(currentVendor.customTerms) && currentVendor.customTerms.length > 0
      ? currentVendor.customTerms
      : Array.isArray(globalData?.stage2?.customTerms) && globalData.stage2.customTerms.length > 0
        ? globalData.stage2.customTerms
        : Array.isArray(globalData?.customTerms) && globalData.customTerms.length > 0
          ? globalData.customTerms
          : [
            `Payment Terms: ${vendorPaymentTerms !== "-" ? vendorPaymentTerms : "As per agreed procurement terms."}`,
            `Delivery Timeline: ${vendorDeliveryTerms !== "-" ? vendorDeliveryTerms : "As per purchase order schedule."}`,
            "Quality & Specifications: Goods supplied must conform strictly to the technical specifications approved in the Purchase Order.",
            "Warranty & Guarantee: Standard manufacturer/supplier warranty applies to all delivered goods.",
            "Inspection & Delivery: Delivery acceptance is subject to site inspection and physical verification. Original Tax Invoice and delivery documentation must accompany the shipment.",
          ];

  const preparedAtFormatted = fmtPoDateTime(globalData?.createdAt || globalData?.stage1?.prDate || globalData?.stage1?.createdAt);
  const checkedAtFormatted = fmtPoDateTime(globalData?.stage1?.hodValidation?.validatedAt || globalData?.stage1?.updatedAt || globalData?.createdAt);
  const approvedAtFormatted = fmtPoDateTime(globalData?.stage3?.signOff?.dateOfApproval || globalData?.stage3?.decision?.approvedAt || globalData?.stage3?.updatedAt || poDate);

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
    const rawQty = Number(item.qty || item.quantityRequested || item.quantity || 0);

    // Look up specific quote from this vendor for this item
    const itemProdName = (item.productName || item.tyreType || item.description || "").trim().toUpperCase();
    const matchedQuote = stage2Suppliers.find(
      (s, sIdx) =>
        (s.supplierName || "").trim().toUpperCase() === vendorName.trim().toUpperCase() &&
        (((s.selectedProduct || s.selectedTyreType || "").trim().toUpperCase() === itemProdName) ||
         (sIdx === idx && (s.supplierName || "").trim().toUpperCase() === vendorName.trim().toUpperCase()))
    );

    const itemQty =
      matchedQuote && Number(matchedQuote.qtyAvailable) > 0
        ? Number(matchedQuote.qtyAvailable)
        : itemsList.length === 1 && vendorAllocatedTotalQty > 0
        ? vendorAllocatedTotalQty
        : rawQty > 0
        ? rawQty
        : 1;

    let itemRate = 0;
    if (matchedQuote) {
      const nP = Number(matchedQuote.unitPriceNew) || 0;
      const rP = Number(matchedQuote.unitPriceRemould) || 0;
      itemRate = nP > 0 ? nP : (rP > 0 ? rP : (Number(matchedQuote.priceQuoted) || 0));
    } else if (vendorUnitPrice > 0 && itemsList.length === 1) {
      itemRate = vendorUnitPrice;
    } else if (item.estUnitCost) {
      itemRate = Number(item.estUnitCost);
    } else if (vendorUnitPrice > 0) {
      itemRate = vendorUnitPrice;
    } else if (vendorTotalOrderValue > 0 && vendorAllocatedTotalQty > 0) {
      itemRate = vendorTotalOrderValue / vendorAllocatedTotalQty;
    }

    const itemBase = itemQty * itemRate;
    const gstRateVal = matchedQuote?.gstRate
      ? Number(String(matchedQuote.gstRate).replace(/%/g, ''))
      : (currentVendor.gstRate
        ? Number(String(currentVendor.gstRate).replace(/%/g, ''))
        : 0);
    const itemGst = (itemBase * gstRateVal) / 100;

    calculatedSubTotal += itemBase;
    calculatedTotalGst += itemGst;

    const productName = item.productName || item.tyreType || item.description || matchedQuote?.selectedProduct || currentVendor.selectedProduct || "Item";
    const brand = matchedQuote?.brand || matchedQuote?.tyreBrand || item.brandPreference || item.tyreBrand || currentVendor.tyreBrand || "";
    const spec = matchedQuote?.sizeSpecification || matchedQuote?.specification || item.sizeSpec || item.sizeSpecification || item.specification || currentVendor.sizeSpecification || "";
    const fullDescription = [productName, brand, spec].filter(Boolean).join(" - ");

    return {
      srNo: idx + 1,
      description: fullDescription || "Goods Specification as per Purchase Order",
      hsnCode: matchedQuote?.hsnCode || currentVendor.hsnCode || item.hsnCode || item.hsn || globalData?.stage2?.hsnCode || "-",
      unit: item.unit || (itemQty ? `${itemQty} NOS` : "NOS"),
      itemQty,
      itemRate,
      discPercent: (matchedQuote?.discountOffered ?? currentVendor.discountOffered) ? `${matchedQuote?.discountOffered || currentVendor.discountOffered}%` : "-",
      itemTotal: itemBase,
    };
  });

  const grandTotal =
    vendorTotalOrderValue > 0 && vendorTotalOrderValue >= calculatedSubTotal
      ? vendorTotalOrderValue
      : calculatedSubTotal > 0
      ? calculatedSubTotal + calculatedTotalGst
      : vendorTotalOrderValue;
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
          backgroundColor: isLetterhead ? null : "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.90);
        const pdf = new jsPDF("portrait", "pt", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth - 30;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (isLetterhead) {
          pdf.addImage(imgData, "JPEG", 10, 10, pdfWidth - 20, pdfHeight - 20, undefined, "FAST");
        } else {
          pdf.addImage(imgData, "JPEG", 15, 15, imgWidth, Math.min(imgHeight, pdfHeight - 30), undefined, "FAST");
        }

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
            backgroundColor: isLetterhead ? null : "#ffffff",
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.90);
          const imgWidth = pdfWidth - 30;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (i > 0) {
            pdf.addPage();
          }

          if (isLetterhead) {
            pdf.addImage(imgData, "JPEG", 10, 10, pdfWidth - 20, pdfHeight - 20, undefined, "FAST");
          } else {
            pdf.addImage(imgData, "JPEG", 15, 15, imgWidth, Math.min(imgHeight, pdfHeight - 30), undefined, "FAST");
          }
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
  const NAVY = activeProfile.themeColor || "#0f3b6c";
  const BORDER_STYLE = `1px solid ${NAVY}`;
  const HEADER_BG = "#f0f4f8";
  const CELL_BG = isLetterhead ? "rgba(255, 255, 255, 0.95)" : "#ffffff";

  return (
    <>
      {iconOnly ? (
        <Tooltip title={tooltipTitle || `Download Purchase Order PDF (${awardedSuppliers.length} PO${awardedSuppliers.length > 1 ? "s" : ""})`}>
          <span>
            <IconButton
              size="small"
              onClick={handleGeneratePdf}
              disabled={downloading}
              sx={{
                color: customColor || "#0f3b6c",
                bgcolor: customBgColor || "#f0f4f8",
                "&:hover": { bgcolor: customHoverBg || "#e2e8f0" },
              }}
            >
              {downloading ? <CircularProgress size={16} sx={{ color: "#0f3b6c" }} /> : <PictureAsPdfIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          {/* PO Format Selector */}
          <select
            value={poFormatStyle}
            onChange={(e) => setPoFormatStyle(e.target.value)}
            disabled={downloading}
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1.5px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              height: "32px",
            }}
            title="PO Format Style"
          >
            <option value="letterhead">📜 Letterhead PO</option>
            <option value="standard">📄 Standard PO (with Logo)</option>
            <option value="plain">🖨️ Plain (Pre-Printed)</option>
          </select>

          <Button
            variant="contained"
            startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
            onClick={handleGeneratePdf}
            disabled={downloading}
            size={size}
            sx={{
              fontWeight: "bold",
              backgroundColor: customBgColor || NAVY,
              color: customColor || "#ffffff",
              fontSize: "12px",
              textTransform: "none",
              height: "32px",
              "&:hover": { backgroundColor: customHoverBg || "#092545" },
            }}
          >
            {labelText}
          </Button>
        </Box>
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
          minHeight: isLetterhead ? "1100px" : "auto",
          backgroundColor: isLetterhead ? "transparent" : "#ffffff",
          backgroundImage: isLetterhead ? `url("${activeProfile.letterheadBase64}")` : "none",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
          color: "#000000",
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
          fontSize: "11px",
          padding: isLetterhead ? "106px 28px 86px 28px" : "24px 28px",
          boxSizing: "border-box",
          border: isLetterhead || isPlain ? "none" : "2px solid #000000",
          textAlign: "left",
          position: "relative",
        }}
      >
        {/* Header: If letterhead is used, the letterhead ALREADY has the logo and header -> remove the logo! */}
        {isLetterhead || isPlain ? (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "14px" }}>
            <div
              style={{
                backgroundColor: NAVY,
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "17px",
                letterSpacing: "1px",
                textAlign: "center",
                padding: "6px 36px",
                borderRadius: "2px",
                textTransform: "uppercase",
                minWidth: "260px",
              }}
            >
              PURCHASE ORDER
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <img
                src={activeProfile.logoBase64 || SR_LOGO_BASE64}
                alt={buyerName}
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
        )}

        {/* 1. BUYER (BILL TO) & VENDOR Box */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: BORDER_STYLE, marginBottom: "8px", fontSize: "11px", tableLayout: "fixed", textAlign: "left", backgroundColor: CELL_BG }}>
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
                BUYER (BILL TO)
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
              <td style={{ width: "50%", borderRight: BORDER_STYLE, padding: "8px 10px", verticalAlign: "top", fontSize: "10.5px", lineHeight: "1.45", textAlign: "left", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal", boxSizing: "border-box" }}>
                <div style={{ fontWeight: 800, color: "#000000", fontSize: "11.5px", textAlign: "left" }}>{buyerName}</div>
                <div style={{ textAlign: "left" }}>{buyerAddress1}</div>
                {buyerAddress2 && <div style={{ textAlign: "left" }}>{buyerAddress2}</div>}
                {buyerCityState && <div style={{ textAlign: "left" }}>{buyerCityState}</div>}
                {buyerPan && <div style={{ textAlign: "left" }}><strong>PAN:</strong> {buyerPan}</div>}
                <div style={{ textAlign: "left" }}><strong>GSTIN:</strong> {buyerGstin}</div>
                <div style={{ textAlign: "left" }}>{buyerStateCode}</div>
                <div style={{ textAlign: "left" }}><strong>Email:</strong> {buyerEmail}</div>
                {buyerPhone && <div style={{ textAlign: "left" }}><strong>Phone:</strong> {buyerPhone}</div>}
              </td>
              <td style={{ width: "50%", padding: "8px 10px", verticalAlign: "top", fontSize: "10.5px", lineHeight: "1.45", textAlign: "left", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal", boxSizing: "border-box" }}>
                <div style={{ fontWeight: 800, color: "#000000", fontSize: "11.5px", textAlign: "left" }}>{vendorName}</div>
                <div style={{ textAlign: "left", wordBreak: "break-word", whiteSpace: "normal" }}>{vendorAddress}</div>
                <div style={{ textAlign: "left" }}><strong>GSTIN:</strong> {vendorGst}</div>
                <div style={{ textAlign: "left" }}><strong>Phone / Mobile:</strong> {vendorPhone}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 2. SHIP TO & PURCHASE ORDER DETAILS Box */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: BORDER_STYLE, marginBottom: "10px", fontSize: "11px", tableLayout: "fixed", textAlign: "left", backgroundColor: CELL_BG }}>
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
                SHIP TO
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
                PURCHASE ORDER DETAILS
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ width: "50%", borderRight: BORDER_STYLE, padding: "8px 10px", verticalAlign: "top", fontSize: "10.5px", lineHeight: "1.45", textAlign: "left", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal", boxSizing: "border-box" }}>
                <div style={{ marginBottom: "5px", textAlign: "left", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>
                  <strong>Delivery Location:</strong> {finalDeliveryLocation}
                </div>
                <div style={{ textAlign: "left", wordBreak: "break-word", whiteSpace: "normal" }}>
                  <strong>Delivery Contact / Mobile No:</strong> {deliveryContactNo}
                </div>
              </td>
              <td style={{ width: "50%", padding: "0", verticalAlign: "top", textAlign: "left", boxSizing: "border-box" }}>
                <div style={{ display: "flex", borderBottom: BORDER_STYLE, fontSize: "10.5px", textAlign: "left" }}>
                  <div style={{ width: "38%", padding: "5px 8px", borderRight: BORDER_STYLE, fontWeight: 700, color: NAVY, backgroundColor: HEADER_BG, boxSizing: "border-box", textAlign: "left" }}>
                    PO Number
                  </div>
                  <div style={{ width: "62%", padding: "5px 8px", fontWeight: 700, color: "#000000", boxSizing: "border-box", textAlign: "left", wordBreak: "break-word" }}>
                    {poNumberToDisplay}
                  </div>
                </div>
                <div style={{ display: "flex", borderBottom: BORDER_STYLE, fontSize: "10.5px", textAlign: "left" }}>
                  <div style={{ width: "38%", padding: "5px 8px", borderRight: BORDER_STYLE, fontWeight: 700, color: NAVY, backgroundColor: HEADER_BG, boxSizing: "border-box", textAlign: "left" }}>
                    PO Date
                  </div>
                  <div style={{ width: "62%", padding: "5px 8px", boxSizing: "border-box", textAlign: "left" }}>
                    {poDate}
                  </div>
                </div>
                <div style={{ display: "flex", borderBottom: BORDER_STYLE, fontSize: "10.5px", textAlign: "left" }}>
                  <div style={{ width: "38%", padding: "5px 8px", borderRight: BORDER_STYLE, fontWeight: 700, color: NAVY, backgroundColor: HEADER_BG, boxSizing: "border-box", textAlign: "left" }}>
                    Mode of Payment
                  </div>
                  <div style={{ width: "62%", padding: "5px 8px", boxSizing: "border-box", textAlign: "left", wordBreak: "break-word" }}>
                    {vendorPaymentTerms}
                  </div>
                </div>
                <div style={{ display: "flex", fontSize: "10.5px", textAlign: "left" }}>
                  <div style={{ width: "38%", padding: "5px 8px", borderRight: BORDER_STYLE, fontWeight: 700, color: NAVY, backgroundColor: HEADER_BG, boxSizing: "border-box", textAlign: "left" }}>
                    Delivery Terms
                  </div>
                  <div style={{ width: "62%", padding: "5px 8px", boxSizing: "border-box", textAlign: "left", wordBreak: "break-word" }}>
                    {vendorDeliveryTerms}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 3. Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", border: BORDER_STYLE, marginBottom: "8px", fontSize: "11px", backgroundColor: CELL_BG }}>
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

            {/* TOTAL Row */}
            <tr>
              <td colSpan="3" style={{ borderRight: BORDER_STYLE, padding: "6px 8px", textAlign: "right", fontWeight: 800, fontSize: "11.5px" }}>
                TOTAL
              </td>
              <td style={{ borderRight: BORDER_STYLE, padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>
                {vendorAllocatedTotalQty} Nos
              </td>
              <td style={{ borderRight: BORDER_STYLE }}></td>
              <td
                style={{
                  borderRight: BORDER_STYLE,
                  padding: "6px 8px",
                  textAlign: "right",
                  fontWeight: 700,
                  fontSize: "10px",
                  color: isGstFreightIncluded ? "#1e3a8a" : "transparent",
                  whiteSpace: "nowrap",
                }}
              >
                {isGstFreightIncluded ? "(Inclusive of GST & Freight)" : ""}
              </td>
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
            backgroundColor: CELL_BG,
          }}
        >
          <strong>Amount in Words:</strong> {amountInWordsText}
        </div>

        {/* 5. TERMS AND CONDITIONS Box */}
        <div style={{ border: BORDER_STYLE, marginBottom: "14px", backgroundColor: CELL_BG }}>
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
            {customTermsList.map((term, tIdx) => (
              <div key={tIdx} style={{ marginBottom: "3px" }}>
                <strong>{tIdx + 1}.</strong> {term.replace(/^\d+[\.\s]*/, "")}
              </div>
            ))}

            {(vendorBank !== "-" || vendorAccNo !== "-") && (
              <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: "5px", fontSize: "10px", marginTop: "4px" }}>
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

        {/* 6. Captured Dates & Signatures Block */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 4px", fontSize: "10.5px", lineHeight: "1.5", backgroundColor: isLetterhead ? "rgba(255, 255, 255, 0.9)" : "transparent", borderRadius: "2px" }}>
          <div style={{ width: "32%" }}>
            <div style={{ fontWeight: 800, color: NAVY, textDecoration: "underline", marginBottom: "2px" }}>
              Prepared By:
            </div>
            <div><strong>Name:</strong> {prRaisedBy}</div>
            <div><strong>Designation:</strong> {preparedByDesignation}</div>
            <div><strong>Date:</strong> {preparedAtFormatted}</div>
          </div>

          <div style={{ width: "32%" }}>
            <div style={{ fontWeight: 800, color: NAVY, textDecoration: "underline", marginBottom: "2px" }}>
              Checked By:
            </div>
            <div><strong>Name:</strong> {checkedByName}</div>
            <div><strong>Designation:</strong> {checkedByDesignation}</div>
            <div><strong>Date:</strong> {checkedAtFormatted}</div>
          </div>

          <div style={{ width: "32%" }}>
            <div style={{ fontWeight: 800, color: NAVY, textDecoration: "underline", marginBottom: "2px" }}>
              Approved By:
            </div>
            <div><strong>Name:</strong> {approvedByName}</div>
            <div><strong>Designation:</strong> {approvedByDesignation}</div>
            <div><strong>Date:</strong> {approvedAtFormatted}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default React.memo(PoLandscapePdfGenerator);

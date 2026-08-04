import React, { useState, useEffect, useMemo, useRef, useCallback, useContext } from "react";
import audit5sAPI from "../../api/audit5s.api";
import apiClient from "../../api/attendanceApiClient";
import { UserContext } from "../../contexts/UserContext";
import { toast } from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./Audit5s.css";
import rabsLogo from "../../assets/rabs_logo.png";

const Audit5sSheet = ({ month, zoneId, isAdminOrHR }) => {
    const { user } = useContext(UserContext);
    const [template, setTemplate] = useState(null);
    const [checklist, setChecklist] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editStructureMode, setEditStructureMode] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ open: false, message: "", onConfirm: null });

    // Form inputs for metadata overrides
    const [docNo, setDocNo] = useState("");
    const [revNo, setRevNo] = useState("");
    const [revDate, setRevDate] = useState("");
    const [respPersonId, setRespPersonId] = useState("");

    const sheetRef = useRef(null);

    // Get days in the selected month
    const daysInMonth = useMemo(() => {
        if (!month) return 30;
        const [year, m] = month.split("-").map(Number);
        return new Date(year, m, 0).getDate();
    }, [month]);

    const daysArray = useMemo(() => {
        return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    }, [daysInMonth]);

    const monthLabel = useMemo(() => {
        if (!month) return "";
        const [year, m] = month.split("-").map(Number);
        const d = new Date(year, m - 1, 2);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleDateString("en-US", { month: "long", year: "2-digit" }).toUpperCase();
    }, [month]);

    // Format Date helper
    const formatDateYYYYMMDD = (dStr) => {
        if (!dStr) return "";
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return dStr;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    const formatDateDisplay = (dStr) => {
        if (!dStr) return "";
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return dStr;
        const day = String(d.getDate()).padStart(2, "0");
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const y = String(d.getFullYear()).slice(-2);
        return `${day}.${m}.${y}`;
    };

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [tplRes, chkRes] = await Promise.all([
                audit5sAPI.getTemplate(zoneId),
                audit5sAPI.getChecklist(month, zoneId)
            ]);

            if (tplRes.success) {
                setTemplate(tplRes.data);
            }
            if (chkRes.success) {
                const chk = chkRes.data;
                setChecklist(chk);
                setDocNo(chk.docNo || tplRes.data.docNo || "RI/QAD/R/04");
                setRevNo(chk.revNo || tplRes.data.revNo || "00");
                setRevDate(formatDateYYYYMMDD(chk.revDate || tplRes.data.revDate || "2024-12-10"));
                setRespPersonId(chk.responsiblePerson?._id || chk.responsiblePerson || "");
            }

            if (isAdminOrHR) {
                const userRes = await apiClient.get("/get-all-users");
                if (Array.isArray(userRes.data)) {
                    const rabsUsers = userRes.data.filter(u => {
                        const compName = u.company || (u.company_id && u.company_id.company_name) || "";
                        return /RABS/i.test(compName);
                    });
                    setUsers(rabsUsers);
                }
            }
        } catch (err) {
            console.error("Failed to load audit checklist sheet:", err);
            toast.error("Failed to load audit check sheet.");
        } finally {
            setLoading(false);
        }
    }, [month, zoneId, isAdminOrHR]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle scores grid change
    const handleScoreChange = (itemId, dayNum, scoreVal) => {
        if (!checklist) return;

        const updatedScores = [...checklist.scores];
        let itemScoreObj = updatedScores.find(s => s.itemId === itemId);

        if (!itemScoreObj) {
            itemScoreObj = { itemId, dailyScores: {} };
            updatedScores.push(itemScoreObj);
        }

        let dailyObj = {};
        if (itemScoreObj.dailyScores) {
            if (typeof itemScoreObj.dailyScores.toJSON === "function") {
                dailyObj = itemScoreObj.dailyScores.toJSON();
            } else if (itemScoreObj.dailyScores instanceof Map) {
                dailyObj = Object.fromEntries(itemScoreObj.dailyScores);
            } else {
                dailyObj = { ...itemScoreObj.dailyScores };
            }
        }

        if (scoreVal === "") {
            delete dailyObj[String(dayNum)];
        } else {
            dailyObj[String(dayNum)] = Number(scoreVal);
        }

        itemScoreObj.dailyScores = dailyObj;

        setChecklist({
            ...checklist,
            scores: updatedScores
        });
    };

    // Handle auditor signature change
    const handleSignatureChange = (dayNum, sigVal) => {
        if (!checklist) return;

        const updatedSigs = { ...(checklist.auditorSignatures || {}) };
        if (sigVal === "") {
            delete updatedSigs[String(dayNum)];
        } else {
            updatedSigs[String(dayNum)] = sigVal.toUpperCase();
        }

        setChecklist({
            ...checklist,
            auditorSignatures: updatedSigs
        });
    };

    const handleSignClick = (dayNum, currentSig) => {
        const usernameSig = user?.username ? user.username.toUpperCase() : "ADMIN";

        if (currentSig) {
            setConfirmModal({
                open: true,
                message: `Are you sure you want to remove the signature for Day ${dayNum}?`,
                onConfirm: () => {
                    handleSignatureChange(dayNum, "");
                    setConfirmModal({ open: false, message: "", onConfirm: null });
                }
            });
        } else {
            setConfirmModal({
                open: true,
                message: `Are you sure you want to sign for Day ${dayNum} as "${usernameSig}"?`,
                onConfirm: () => {
                    handleSignatureChange(dayNum, usernameSig);
                    setConfirmModal({ open: false, message: "", onConfirm: null });
                }
            });
        }
    };

    // Calculate score details
    const scoresMap = useMemo(() => {
        const map = new Map();
        if (!checklist || !Array.isArray(checklist.scores)) return map;

        checklist.scores.forEach(s => {
            const dailyMap = new Map();
            if (s.dailyScores) {
                if (typeof s.dailyScores.toJSON === "function") {
                    const plain = s.dailyScores.toJSON();
                    Object.entries(plain).forEach(([k, v]) => dailyMap.set(k, v));
                } else if (s.dailyScores instanceof Map) {
                    s.dailyScores.forEach((v, k) => dailyMap.set(k, v));
                } else if (typeof s.dailyScores.forEach === "function") {
                    s.dailyScores.forEach((v, k) => dailyMap.set(k, v));
                } else {
                    Object.entries(s.dailyScores).forEach(([k, v]) => dailyMap.set(k, v));
                }
            }
            map.set(s.itemId, dailyMap);
        });
        return map;
    }, [checklist]);

    // Horizontal sum: Total Actual Score per item
    const getItemTotalScore = useCallback((itemId) => {
        const daily = scoresMap.get(itemId);
        if (!daily) return 0;
        let sum = 0;
        daily.forEach((val) => {
            if (typeof val === "number") sum += val;
        });
        return sum;
    }, [scoresMap]);

    // Category calculation helper: count daily totals only when all items in this category are filled for that day
    const getCategoryScores = useCallback((category) => {
        let actual = 0;
        let max = 0;

        if (!category.items || category.items.length === 0) {
            return { actual, max };
        }

        // Iterate through each day of the month
        for (let d = 1; d <= daysInMonth; d++) {
            let allFilled = true;
            let daySum = 0;

            for (let i = 0; i < category.items.length; i++) {
                const item = category.items[i];
                const itemScores = scoresMap.get(item._id);
                const val = itemScores ? itemScores.get(String(d)) : undefined;

                if (val === undefined || val === null || val === "") {
                    allFilled = false;
                    break;
                }
                daySum += Number(val);
            }

            if (allFilled) {
                actual += daySum;
                max += category.items.length * 2;
            }
        }

        return { actual, max };
    }, [scoresMap, daysInMonth]);

    // Grand total calculation helper
    const grandTotals = useMemo(() => {
        let actual = 0;
        let max = 0;

        if (!template) return { actual, max, pct: 0 };

        template.categories.forEach(cat => {
            const catScores = getCategoryScores(cat);
            actual += catScores.actual;
            max += catScores.max;
        });

        const pct = max > 0 ? Math.round((actual / max) * 100) : 0;
        return { actual, max, pct };
    }, [template, getCategoryScores]);

    // Save checklist sheet
    const handleSave = async () => {
        if (!checklist) return;
        try {
            setSaving(true);
            const checklistPromise = audit5sAPI.updateChecklist(checklist._id, {
                scores: checklist.scores,
                auditorSignatures: checklist.auditorSignatures,
                docNo,
                revNo,
                revDate,
                responsiblePerson: respPersonId
            });

            let templatePromise = Promise.resolve();
            if (isAdminOrHR && editStructureMode) {
                templatePromise = audit5sAPI.saveTemplate({
                    zoneId,
                    docNo,
                    revNo,
                    revDate,
                    categories: template.categories
                });
            }

            const [response] = await Promise.all([checklistPromise, templatePromise]);

            if (response.success) {
                toast.success("5S Audit Sheet & structure saved successfully!");
                if (editStructureMode) {
                    setEditStructureMode(false);
                }
                loadData();
            }
        } catch (err) {
            console.error("Failed to save checklist scores and structure:", err);
            toast.error("Failed to save checklist.");
        } finally {
            setSaving(false);
        }
    };

    // Structure editing helper handlers (Admin / HR)
    const handleCategoryMetaChange = (catIdx, field, val) => {
        const updated = { ...template };
        const cats = [...updated.categories];
        cats[catIdx] = { ...cats[catIdx], [field]: val };
        updated.categories = cats;
        setTemplate(updated);
    };

    const handleItemTextChange = (catIdx, itemIdx, val) => {
        const updated = { ...template };
        const cats = [...updated.categories];
        const items = [...cats[catIdx].items];
        items[itemIdx] = { ...items[itemIdx], text: val };
        cats[catIdx] = { ...cats[catIdx], items };
        updated.categories = cats;
        setTemplate(updated);
    };

    const handleAddItem = (catIdx) => {
        const updated = { ...template };
        const cats = [...updated.categories];
        const tempId = "temp_" + Math.random().toString(36).substr(2, 9);
        const items = [...cats[catIdx].items, { _id: tempId, text: "New Audit Question" }];
        cats[catIdx] = { ...cats[catIdx], items };
        updated.categories = cats;
        setTemplate(updated);
    };

    const handleRemoveItem = (catIdx, itemIdx) => {
        const updated = { ...template };
        const cats = [...updated.categories];
        const items = [...cats[catIdx].items];
        items.splice(itemIdx, 1);
        cats[catIdx] = { ...cats[catIdx], items };
        updated.categories = cats;
        setTemplate(updated);
    };

    const handleAddCategory = () => {
        const updated = { ...template };
        const tempId = "temp_" + Math.random().toString(36).substr(2, 9);
        updated.categories = [
            ...updated.categories,
            { _id: tempId, name: "New Category", subName: "Description", items: [] }
        ];
        setTemplate(updated);
    };

    const handleRemoveCategory = (catIdx) => {
        setConfirmModal({
            open: true,
            message: "Are you sure you want to delete this category and all its questions?",
            onConfirm: () => {
                const updated = { ...template };
                const cats = [...updated.categories];
                cats.splice(catIdx, 1);
                updated.categories = cats;
                setTemplate(updated);
                setConfirmModal({ open: false, message: "", onConfirm: null });
            }
        });
    };

    // Export to PDF using html2canvas & jsPDF
    const handleExportPDF = async () => {
        if (!sheetRef.current) return;
        try {
            toast.loading("Generating PDF...", { id: "pdf-gen" });

            const canvas = await html2canvas(sheetRef.current, {
                scale: 2, // higher resolution
                useCORS: true
            });

            const imgData = canvas.toDataURL("image/png");

            // Landscape A4 size is 297mm x 210mm
            const pdf = new jsPDF("l", "mm", "a4");
            const width = pdf.internal.pageSize.getWidth();
            const height = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, "PNG", 0, 0, width, height);

            const monthStr = month ? month.toUpperCase() : "AUDIT";
            const zoneStr = checklist?.zoneName ? checklist.zoneName.toUpperCase() : "ZONE";
            pdf.save(`5S_Audit_${zoneStr}_${monthStr}.pdf`);

            toast.success("PDF Downloaded successfully!", { id: "pdf-gen" });
        } catch (err) {
            console.error("Failed to export PDF:", err);
            toast.error("Failed to export PDF.", { id: "pdf-gen" });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportExcel = async () => {
        try {
            toast.loading("Generating Excel...", { id: "excel-gen" });
            const ExcelJS = await import("exceljs");
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("5S Audit");

            const colWidths = [
                { width: 25 }, // A: Category
                { width: 55 }, // B: Item
            ];
            for (let i = 1; i <= daysInMonth; i++) {
                colWidths.push({ width: 5 });
            }
            colWidths.push({ width: 18 }); // Total Actual Score
            worksheet.columns = colWidths;

            const totalColsCount = 3 + daysInMonth;

            // Header Row 1
            worksheet.mergeCells(1, 1, 2, 1);
            const logoCell = worksheet.getCell(1, 1);
            logoCell.value = "RABS";
            logoCell.font = { name: "Arial", size: 18, bold: true, color: { argb: "FFFFFF" } };
            logoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D32F2F" } };
            logoCell.alignment = { vertical: "middle", horizontal: "center" };

            worksheet.mergeCells(1, 2, 1, totalColsCount - 1);
            const titleCell = worksheet.getCell(1, 2);
            titleCell.value = "RABS INDUSTRIES INDIA PVT.LTD.";
            titleCell.font = { name: "Arial", size: 16, bold: true };
            titleCell.alignment = { vertical: "middle", horizontal: "center" };

            const docCell = worksheet.getCell(1, totalColsCount);
            docCell.value = `DOC NO: ${docNo}`;
            docCell.font = { name: "Arial", size: 9, bold: true };
            docCell.alignment = { vertical: "middle", horizontal: "left" };

            // Header Row 2
            worksheet.mergeCells(2, 2, 2, totalColsCount - 1);
            const subTitleCell = worksheet.getCell(2, 2);
            subTitleCell.value = "5'S' Audit Check Sheet";
            subTitleCell.font = { name: "Arial", size: 12, bold: true };
            subTitleCell.alignment = { vertical: "middle", horizontal: "center" };

            const revCell = worksheet.getCell(2, totalColsCount);
            revCell.value = `REV. NO/DATE: ${revNo} / ${formatDateDisplay(revDate)}`;
            revCell.font = { name: "Arial", size: 8, bold: true };
            revCell.alignment = { vertical: "middle", horizontal: "left" };

            // Row 3: Metadata
            worksheet.mergeCells(3, 1, 3, 2);
            const zoneInfoCell = worksheet.getCell(3, 1);
            zoneInfoCell.value = `ZONE NO: ${checklist.zoneNo || "01"}   ZONE NAME: ${checklist.zoneName || "SECURITY AREA"}`;
            zoneInfoCell.font = { name: "Arial", size: 10, bold: true };
            zoneInfoCell.alignment = { vertical: "middle", horizontal: "left" };

            worksheet.mergeCells(3, 3, 3, totalColsCount - 1);
            const respInfoCell = worksheet.getCell(3, 3);
            respInfoCell.value = `ZONE RESP: ${respPersonName}`;
            respInfoCell.font = { name: "Arial", size: 10, bold: true };
            respInfoCell.alignment = { vertical: "middle", horizontal: "left" };

            const monthInfoCell = worksheet.getCell(3, totalColsCount);
            monthInfoCell.value = `MONTH: ${monthLabel}`;
            monthInfoCell.font = { name: "Arial", size: 10, bold: true };
            monthInfoCell.alignment = { vertical: "middle", horizontal: "left" };

            const thinBorder = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
            for (let r = 1; r <= 3; r++) {
                for (let c = 1; c <= totalColsCount; c++) {
                    worksheet.getCell(r, c).border = thinBorder;
                }
            }

            // Grid Headers (Row 4 & 5)
            worksheet.mergeCells(4, 1, 5, 1);
            const gridHeaderCat = worksheet.getCell(4, 1);
            gridHeaderCat.value = "Category";
            gridHeaderCat.font = { name: "Arial", size: 10, bold: true };
            gridHeaderCat.alignment = { vertical: "middle", horizontal: "center" };
            gridHeaderCat.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            worksheet.mergeCells(4, 2, 5, 2);
            const gridHeaderItem = worksheet.getCell(4, 2);
            gridHeaderItem.value = "Item";
            gridHeaderItem.font = { name: "Arial", size: 10, bold: true };
            gridHeaderItem.alignment = { vertical: "middle", horizontal: "center" };
            gridHeaderItem.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            worksheet.mergeCells(4, 3, 4, totalColsCount - 1);
            const gridHeaderDate = worksheet.getCell(4, 3);
            gridHeaderDate.value = "DATE";
            gridHeaderDate.font = { name: "Arial", size: 10, bold: true };
            gridHeaderDate.alignment = { vertical: "middle", horizontal: "center" };
            gridHeaderDate.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            worksheet.mergeCells(4, totalColsCount, 5, totalColsCount);
            const gridHeaderTotal = worksheet.getCell(4, totalColsCount);
            gridHeaderTotal.value = "Total Actual Score";
            gridHeaderTotal.font = { name: "Arial", size: 9, bold: true };
            gridHeaderTotal.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            gridHeaderTotal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            daysArray.forEach((day, index) => {
                const c = 3 + index;
                const cell = worksheet.getCell(5, c);
                cell.value = day;
                cell.font = { name: "Arial", size: 9, bold: true };
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
            });

            for (let c = 1; c <= totalColsCount; c++) {
                worksheet.getCell(4, c).border = thinBorder;
                worksheet.getCell(5, c).border = thinBorder;
            }

            // Data rows
            let currentRow = 6;
            template.categories.forEach((cat) => {
                const catStartRow = currentRow;
                const catScores = getCategoryScores(cat);

                if (cat.items.length === 0) {
                    worksheet.getCell(currentRow, 1).value = `${cat.name}\n(${cat.subName || ""})`;
                    worksheet.getCell(currentRow, 2).value = "No items in this category.";
                    worksheet.mergeCells(currentRow, 3, currentRow, totalColsCount);
                    for (let c = 1; c <= totalColsCount; c++) {
                        worksheet.getCell(currentRow, c).border = thinBorder;
                    }
                    currentRow++;
                } else {
                    cat.items.forEach((item, itemIdx) => {
                        const itemScores = scoresMap.get(item._id);
                        if (itemIdx === 0) {
                            const catLabelCell = worksheet.getCell(currentRow, 1);
                            catLabelCell.value = `${cat.name}\n(${cat.subName || ""})`;
                            catLabelCell.font = { name: "Arial", size: 9, bold: true };
                            catLabelCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
                        }

                        const itemTextCell = worksheet.getCell(currentRow, 2);
                        itemTextCell.value = item.text;
                        itemTextCell.font = { name: "Arial", size: 9 };
                        itemTextCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };

                        daysArray.forEach((day, dIdx) => {
                            const c = 3 + dIdx;
                            const cell = worksheet.getCell(currentRow, c);
                            const scoreVal = itemScores?.get(String(day)) ?? "";
                            cell.value = scoreVal !== "" ? Number(scoreVal) : "";
                            cell.font = { name: "Arial", size: 9 };
                            cell.alignment = { vertical: "middle", horizontal: "center" };

                            if (scoreVal === "2") {
                                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D1FAE5" } };
                            } else if (scoreVal === "1") {
                                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } };
                            } else if (scoreVal === "0") {
                                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEE2E2" } };
                            }
                        });

                        const scoreTotalCell = worksheet.getCell(currentRow, totalColsCount);
                        scoreTotalCell.value = getItemTotalScore(item._id);
                        scoreTotalCell.font = { name: "Arial", size: 9, bold: true };
                        scoreTotalCell.alignment = { vertical: "middle", horizontal: "center" };
                        scoreTotalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };

                        for (let c = 1; c <= totalColsCount; c++) {
                            worksheet.getCell(currentRow, c).border = thinBorder;
                        }

                        currentRow++;
                    });

                    worksheet.mergeCells(catStartRow, 1, currentRow - 1, 1);
                }

                // Category summary row
                worksheet.mergeCells(currentRow, 1, currentRow, 2);
                const summaryLabelCell = worksheet.getCell(currentRow, 1);
                summaryLabelCell.value = `${cat.name.split(" ")[0]} Score = Total = ${catScores.max > 0 ? `${catScores.actual} / ${catScores.max}` : "0"}`;
                summaryLabelCell.font = { name: "Arial", size: 10, bold: true };
                summaryLabelCell.alignment = { vertical: "middle", horizontal: "left" };
                summaryLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

                worksheet.mergeCells(currentRow, 3, currentRow, totalColsCount);
                const summarySpaceCell = worksheet.getCell(currentRow, 3);
                summarySpaceCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

                for (let c = 1; c <= totalColsCount; c++) {
                    worksheet.getCell(currentRow, c).border = thinBorder;
                }

                currentRow++;
            });

            // Auditor signature row
            worksheet.mergeCells(currentRow, 1, currentRow, 2);
            const sigLabelCell = worksheet.getCell(currentRow, 1);
            sigLabelCell.value = "5S Auditor Signature";
            sigLabelCell.font = { name: "Arial", size: 10, bold: true };
            sigLabelCell.alignment = { vertical: "middle", horizontal: "left" };
            sigLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            daysArray.forEach((day, dIdx) => {
                const c = 3 + dIdx;
                const cell = worksheet.getCell(currentRow, c);
                cell.value = checklist.auditorSignatures?.[String(day)] ?? "";
                cell.font = { name: "Arial", size: 8, italic: true };
                cell.alignment = { vertical: "middle", horizontal: "center" };
            });

            const sigSpacerCell = worksheet.getCell(currentRow, totalColsCount);
            sigSpacerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            for (let c = 1; c <= totalColsCount; c++) {
                worksheet.getCell(currentRow, c).border = thinBorder;
            }

            currentRow += 2;

            // Legends & totals
            worksheet.mergeCells(currentRow, 2, currentRow, 6);
            const legendHeader = worksheet.getCell(currentRow, 2);
            legendHeader.value = "LEGENDS :";
            legendHeader.font = { name: "Arial", size: 9, bold: true };

            worksheet.mergeCells(currentRow, totalColsCount - 3, currentRow, totalColsCount - 2);
            const totalActualLabel = worksheet.getCell(currentRow, totalColsCount - 3);
            totalActualLabel.value = "Grand Actual Total:";
            totalActualLabel.font = { name: "Arial", size: 9, bold: true };

            const totalActualVal = worksheet.getCell(currentRow, totalColsCount - 1);
            totalActualVal.value = grandTotals.actual;
            totalActualVal.font = { name: "Arial", size: 9, bold: true };
            totalActualVal.alignment = { horizontal: "center" };

            currentRow++;

            worksheet.mergeCells(currentRow, 2, currentRow, 6);
            const legend1 = worksheet.getCell(currentRow, 2);
            legend1.value = "2 >> Awareness and system implement";
            legend1.font = { name: "Arial", size: 8 };

            worksheet.mergeCells(currentRow, totalColsCount - 3, currentRow, totalColsCount - 2);
            const totalPossibleLabel = worksheet.getCell(currentRow, totalColsCount - 3);
            totalPossibleLabel.value = "Grand Max Possible:";
            totalPossibleLabel.font = { name: "Arial", size: 9, bold: true };

            const totalPossibleVal = worksheet.getCell(currentRow, totalColsCount - 1);
            totalPossibleVal.value = grandTotals.max;
            totalPossibleVal.font = { name: "Arial", size: 9, bold: true };
            totalPossibleVal.alignment = { horizontal: "center" };

            currentRow++;

            worksheet.mergeCells(currentRow, 2, currentRow, 6);
            const legend2 = worksheet.getCell(currentRow, 2);
            legend2.value = "1 >> Awareness only and system not implement";
            legend2.font = { name: "Arial", size: 8 };

            worksheet.mergeCells(currentRow, totalColsCount - 3, currentRow, totalColsCount - 2);
            const pctLabel = worksheet.getCell(currentRow, totalColsCount - 3);
            pctLabel.value = "Score Percentage:";
            pctLabel.font = { name: "Arial", size: 10, bold: true };

            const pctVal = worksheet.getCell(currentRow, totalColsCount - 1);
            pctVal.value = `${grandTotals.pct}%`;
            pctVal.font = { name: "Arial", size: 10, bold: true };
            pctVal.alignment = { horizontal: "center" };

            currentRow++;

            worksheet.mergeCells(currentRow, 2, currentRow, 6);
            const legend3 = worksheet.getCell(currentRow, 2);
            legend3.value = "0 >> Awareness & Requirement not implement";
            legend3.font = { name: "Arial", size: 8 };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            const monthStr = month ? month.toUpperCase() : "AUDIT";
            const zoneStr = checklist?.zoneName ? checklist.zoneName.toUpperCase().replace(/\s+/g, "_") : "ZONE";
            anchor.download = `5S_Audit_${zoneStr}_${monthStr}.xlsx`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(url);

            toast.success("Excel sheet exported successfully!", { id: "excel-gen" });
        } catch (err) {
            console.error("Failed to export Excel:", err);
            toast.error("Failed to export Excel.", { id: "excel-gen" });
        }
    };



    if (loading) {
        return (
            <div className="audit-sheet-loader">
                <div className="db-spin" />
                <p>Loading 5S Checklist...</p>
            </div>
        );
    }

    if (!template || !checklist) {
        return (
            <div className="audit5s-empty-state">
                <h3>Error Loading Audit Sheet</h3>
                <p>Could not initialize checklist data.</p>
            </div>
        );
    }

    const currentRespPerson = users.find(u => u._id === respPersonId) || checklist.responsiblePerson;
    const respPersonName = currentRespPerson?.first_name
        ? `${currentRespPerson.first_name} ${currentRespPerson.last_name || ""}`.trim()
        : (currentRespPerson?.username || "—");


    return (
        <div className="audit-sheet-workspace">
            {/* Action Bar */}
            <div className="audit-sheet-actions no-print">
                <button
                    className="btn-audit5s btn-secondary"
                    onClick={handlePrint}
                >
                    🖨️ Local Print
                </button>
                <button
                    className="btn-audit5s btn-secondary"
                    onClick={handleExportPDF}
                >
                    📥 Download PDF
                </button>
                <button
                    type="button"
                    className="btn-audit5s btn-secondary"
                    onClick={handleExportExcel}
                >
                    🟢 Download Excel
                </button>
                {isAdminOrHR && (
                    <button
                        type="button"
                        className={`btn-audit5s ${editStructureMode ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => setEditStructureMode(!editStructureMode)}
                        disabled={saving}
                    >
                        {editStructureMode ? "👁️ View Mode" : "✏️ Edit Structure"}
                    </button>
                )}
                <button
                    className="btn-audit5s btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "Saving..." : "💾 Save Changes"}
                </button>
            </div>

            {/* Print Sheet Viewport */}
            <div className="audit-sheet-print-container" ref={sheetRef}>
                <div className="audit-sheet">
                    {/* Header Table */}
                    <table className="sheet-header-table">
                        <tbody>
                            <tr>
                                <td className="header-logo-cell" rowSpan="2">
                                    <div className="rabs-logo-box-img">
                                        <img src={rabsLogo} alt="RABS Logo" className="rabs-logo-img" />
                                    </div>
                                </td>
                                <td className="header-title-cell">
                                    <h2>RABS INDUSTRIES INDIA PVT.LTD.</h2>
                                    <h3>5'S' Audit Check Sheet</h3>
                                </td>
                                <td className="header-meta-cell">
                                    <div className="meta-row">
                                        <span className="meta-label">DOC NO :</span>
                                        {isAdminOrHR ? (
                                            <input
                                                type="text"
                                                className="meta-inline-input"
                                                value={docNo}
                                                onChange={(e) => setDocNo(e.target.value)}
                                            />
                                        ) : (
                                            <span className="meta-value">{docNo}</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td className="header-zone-info">
                                    <div className="info-grid">
                                        <div>
                                            <strong>ZONE NO :</strong> {checklist.zoneNo || "01"}
                                        </div>
                                        <div>
                                            <strong>ZONE NAME :</strong> {checklist.zoneName || "OFFICE"}
                                        </div>
                                        <div>
                                            <strong>ZONE RESP:</strong> {isAdminOrHR ? (
                                                <>
                                                    <InlineSearchableSelect
                                                        value={respPersonId}
                                                        onChange={setRespPersonId}
                                                        options={users.map(u => ({
                                                            value: u._id,
                                                            label: u.first_name ? `${u.first_name} ${u.last_name || ""}` : u.username
                                                        }))}
                                                        placeholder="Select Employee"
                                                    />
                                                    <span className="meta-value uppercase print-only">{respPersonName}</span>
                                                </>
                                            ) : (
                                                <span className="meta-value uppercase">{respPersonName}</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="header-meta-cell secondary">
                                    <div className="meta-row">
                                        <span className="meta-label">RE.NO:</span>
                                        {isAdminOrHR ? (
                                            <input
                                                type="text"
                                                className="meta-inline-input"
                                                value={revNo}
                                                onChange={(e) => setRevNo(e.target.value)}
                                            />
                                        ) : (
                                            <span className="meta-value">{revNo}</span>
                                        )}
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-label">REV.DATE :</span>
                                        {isAdminOrHR ? (
                                            <input
                                                type="date"
                                                className="meta-inline-input-date"
                                                value={revDate}
                                                onChange={(e) => setRevDate(e.target.value)}
                                            />
                                        ) : (
                                            <span className="meta-value">{formatDateDisplay(revDate)}</span>
                                        )}
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-label">MONTH :</span>
                                        <span className="meta-value">{monthLabel}</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Main Score Grid */}
                    <table className="sheet-grid-table">
                        <thead>
                            <tr>
                                <th rowSpan="2" className="col-cat">Category</th>
                                <th rowSpan="2" className="col-item">Item</th>
                                <th colSpan={daysInMonth} className="col-date-header">DATE</th>
                                <th rowSpan="2" className="col-total">Total Actual Score</th>
                            </tr>
                            <tr className="date-numbers-row">
                                {daysArray.map(day => (
                                    <th key={day} className="col-day-num">{day}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {template.categories.map((cat, catIdx) => {
                                const catScores = getCategoryScores(cat);

                                if (cat.items.length === 0) {
                                    return (
                                        <tr key={cat._id || catIdx} className="empty-cat-row">
                                            <td className="cat-cell">
                                                <div className="cat-box">
                                                    {editStructureMode ? (
                                                        <div className="cat-edit-inline-box">
                                                            <input
                                                                type="text"
                                                                className="sheet-inline-input cat-name-edit"
                                                                value={cat.name}
                                                                onChange={(e) => handleCategoryMetaChange(catIdx, "name", e.target.value)}
                                                                placeholder="Category Name"
                                                            />
                                                            <input
                                                                type="text"
                                                                className="sheet-inline-input cat-sub-edit"
                                                                value={cat.subName || ""}
                                                                onChange={(e) => handleCategoryMetaChange(catIdx, "subName", e.target.value)}
                                                                placeholder="Subname"
                                                            />
                                                            <div className="cat-inline-action-btns">
                                                                <button
                                                                    type="button"
                                                                    className="btn-sheet-add-item"
                                                                    onClick={() => handleAddItem(catIdx)}
                                                                    title="Add Question Item"
                                                                >
                                                                    ➕ Add Item
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn-sheet-del-cat"
                                                                    onClick={() => handleRemoveCategory(catIdx)}
                                                                    title="Delete Category"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="cat-title">{cat.name}</span>
                                                            {cat.subName && <span className="cat-sub">({cat.subName})</span>}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="item-cell italic-msg">
                                                No questions in this category.
                                                {editStructureMode && " Click \"Add Item\" on the left to add questions."}
                                            </td>
                                            <td colSpan={daysInMonth + 1} className="cat-summary-spacer"></td>
                                        </tr>
                                    );
                                }

                                return (
                                    <React.Fragment key={cat._id || catIdx}>
                                        {/* Render items in this category */}
                                        {cat.items.map((item, itemIdx) => {
                                            const itemScores = scoresMap.get(item._id);

                                            return (
                                                <tr key={item._id || itemIdx}>
                                                    {/* Category label (Row spanned across all items of this category) */}
                                                    {itemIdx === 0 && (
                                                        <td className="cat-cell" rowSpan={cat.items.length}>
                                                            <div className="cat-box">
                                                                {editStructureMode ? (
                                                                    <div className="cat-edit-inline-box">
                                                                        <input
                                                                            type="text"
                                                                            className="sheet-inline-input cat-name-edit"
                                                                            value={cat.name}
                                                                            onChange={(e) => handleCategoryMetaChange(catIdx, "name", e.target.value)}
                                                                            placeholder="Category Name"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            className="sheet-inline-input cat-sub-edit"
                                                                            value={cat.subName || ""}
                                                                            onChange={(e) => handleCategoryMetaChange(catIdx, "subName", e.target.value)}
                                                                            placeholder="Subname"
                                                                        />
                                                                        <div className="cat-inline-action-btns">
                                                                            <button
                                                                                type="button"
                                                                                className="btn-sheet-add-item"
                                                                                onClick={() => handleAddItem(catIdx)}
                                                                                title="Add Question Item"
                                                                            >
                                                                                ➕ Add Item
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="btn-sheet-del-cat"
                                                                                onClick={() => handleRemoveCategory(catIdx)}
                                                                                title="Delete Category"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <span className="cat-title">{cat.name}</span>
                                                                        {cat.subName && <span className="cat-sub">({cat.subName})</span>}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )}

                                                    {/* Item text */}
                                                    <td className="item-cell">
                                                        {editStructureMode ? (
                                                            <div className="item-edit-inline-box">
                                                                <textarea
                                                                    className="sheet-inline-textarea"
                                                                    value={item.text}
                                                                    onChange={(e) => handleItemTextChange(catIdx, itemIdx, e.target.value)}
                                                                    placeholder="Enter checklist item question..."
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="btn-sheet-del-item"
                                                                    onClick={() => handleRemoveItem(catIdx, itemIdx)}
                                                                    title="Delete Item"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            item.text
                                                        )}
                                                    </td>

                                                    {/* Score input columns */}
                                                    {daysArray.map(day => {
                                                        const scoreVal = itemScores?.get(String(day)) ?? "";

                                                        return (
                                                            <td key={day} className={`score-cell score-val-${scoreVal}`}>
                                                                <input
                                                                    type="text"
                                                                    className="score-input"
                                                                    value={scoreVal}
                                                                    onChange={(e) => handleScoreChange(item._id, day, e.target.value)}
                                                                    placeholder=""
                                                                    maxLength="1"
                                                                    disabled={editStructureMode}
                                                                />
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Total score horizontally */}
                                                    <td className="total-cell">{getItemTotalScore(item._id)}</td>
                                                </tr>
                                            );
                                        })}

                                        {/* Category Score summary row */}
                                        <tr className="cat-summary-row">
                                            <td colSpan="2" className="cat-summary-label">
                                                {cat.name.split(" ")[0]} Score = Total
                                            </td>
                                            <td colSpan={daysInMonth} className="cat-summary-spacer">
                                                {/* empty block spacer */}
                                            </td>
                                            <td className="total-cell" style={{ fontWeight: "800", backgroundColor: "#cbd5e1" }}>
                                                {catScores.actual}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}

                            {editStructureMode && (
                                <tr className="add-category-row no-print">
                                    <td colSpan={daysInMonth + 4} className="center">
                                        <button
                                            type="button"
                                            className="btn-audit5s btn-secondary btn-add-cat-sheet"
                                            onClick={handleAddCategory}
                                        >
                                            ➕ Add New Category Row
                                        </button>
                                    </td>
                                </tr>
                            )}

                            {/* Auditor signature row */}
                            <tr className="sig-row">
                                <td colSpan="2" className="sig-label">
                                    5S Auditor Signature
                                </td>
                                {daysArray.map(day => {
                                    const sigVal = checklist.auditorSignatures?.[String(day)] ?? "";

                                    return (
                                        <td key={day} className="sig-cell" style={{ padding: 0 }}>
                                            <div
                                                className={`sig-click-box ${sigVal ? "signed" : ""}`}
                                                onClick={() => handleSignClick(day, sigVal)}
                                                title={sigVal ? `Signed by ${sigVal}. Click to clear.` : "Click to sign"}
                                                style={{
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    fontSize: "9px",
                                                    padding: "0 2px"
                                                }}
                                            >
                                                {sigVal || "—"}
                                            </div>
                                        </td>
                                    );
                                })}
                                <td className="sig-cell-spacer"></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Footer legends & overall calculations */}
                    <div className="sheet-footer">
                        <div className="legends-box">
                            <strong>LEGENDS :</strong>
                            <span><strong>2</strong> &gt;&gt; Awareness and system implement</span>
                            <span><strong>1</strong> &gt;&gt; Awareness only and system not implement</span>
                            <span><strong>0</strong> &gt;&gt; Awareness &amp; Requirement not implement</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Confirm Modal overlay */}
            {confirmModal.open && (
                <div className="custom-confirm-overlay no-print">
                    <div className="custom-confirm-card">
                        <div className="confirm-header">
                            <h4>Confirm Action</h4>
                        </div>
                        <div className="confirm-body">
                            <p>{confirmModal.message}</p>
                        </div>
                        <div className="confirm-actions">
                            <button
                                type="button"
                                className="btn-confirm-cancel"
                                onClick={() => setConfirmModal({ open: false, message: "", onConfirm: null })}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-confirm-ok"
                                onClick={confirmModal.onConfirm}
                            >
                                Yes, Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const InlineSearchableSelect = ({ value, onChange, options, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value);

    const filteredOptions = options.filter(o => 
        o.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={dropdownRef} className="meta-inline-select-container no-print" style={{ position: "relative", display: "inline-block" }}>
            <span 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className="meta-inline-select"
                style={{
                    cursor: disabled ? "not-allowed" : "pointer",
                    display: "inline-block",
                    minWidth: "120px",
                }}
            >
                {selectedOption ? selectedOption.label : placeholder} ▾
            </span>
            {isOpen && (
                <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    backgroundColor: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)",
                    zIndex: 1000,
                    marginTop: "4px",
                    maxHeight: "220px",
                    minWidth: "200px",
                    display: "flex",
                    flexDirection: "column",
                    textTransform: "none",
                    fontWeight: "normal"
                }}>
                    <input 
                        type="text"
                        placeholder="Search employee..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            border: "none",
                            borderBottom: "1px solid #cbd5e1",
                            padding: "6px 10px",
                            fontSize: "12px",
                            outline: "none",
                            width: "100%",
                            boxSizing: "border-box"
                        }}
                        autoFocus
                    />
                    <div style={{ overflowY: "auto", flex: 1, maxHeight: "150px" }}>
                        <div 
                            onClick={() => {
                                onChange("");
                                setIsOpen(false);
                                setSearch("");
                            }}
                            style={{
                                padding: "6px 10px",
                                cursor: "pointer",
                                fontSize: "12px",
                                backgroundColor: value === "" ? "#f1f5f9" : "transparent",
                                color: "#64748b",
                                textAlign: "left"
                            }}
                        >
                            {placeholder}
                        </div>
                        {filteredOptions.map(o => (
                            <div 
                                key={o.value}
                                onClick={() => {
                                    onChange(o.value);
                                    setIsOpen(false);
                                    setSearch("");
                                }}
                                style={{
                                    padding: "6px 10px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    backgroundColor: value === o.value ? "#f1f5f9" : "transparent",
                                    color: "#1e293b",
                                    textAlign: "left"
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#f8fafc"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = value === o.value ? "#f1f5f9" : "transparent"}
                            >
                                {o.label}
                            </div>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div style={{ padding: "6px 10px", fontSize: "12px", color: "#64748b" }}>
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Audit5sSheet;

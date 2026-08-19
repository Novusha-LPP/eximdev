import React, { useState, useEffect, useMemo, useRef, useCallback, useContext } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
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
    const [prevChecklist, setPrevChecklist] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState("daily"); // "daily" or "monthly"
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

    const formatSigDisplay = (sig) => {
        if (!sig) return "—";
        if (sig.includes("_") || sig.includes(" ")) {
            const parts = sig.split(/[_\s]+/);
            if (parts.length >= 2 && parts[0] && parts[1]) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
        }
        return sig.slice(0, 2).toUpperCase();
    };

    const getPrevMonthStr = useCallback((mStr) => {
        if (!mStr) return "";
        const [year, m] = mStr.split("-").map(Number);
        const prevDate = new Date(year, m - 2, 15);
        const prevYear = prevDate.getFullYear();
        const prevM = String(prevDate.getMonth() + 1).padStart(2, "0");
        return `${prevYear}-${prevM}`;
    }, []);

    const getShortMonthLabel = useCallback((mStr) => {
        if (!mStr) return "";
        const [year, m] = mStr.split("-").map(Number);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthName = months[m - 1];
        const year2Digit = String(year).slice(-2);
        return `${monthName}-${year2Digit}`;
    }, []);

    const prevMonthStr = useMemo(() => {
        return getPrevMonthStr(month);
    }, [month, getPrevMonthStr]);

    const prevMonthDays = useMemo(() => {
        if (!prevMonthStr) return 30;
        const [year, m] = prevMonthStr.split("-").map(Number);
        return new Date(year, m, 0).getDate();
    }, [prevMonthStr]);

    const prevMonthLabel = useMemo(() => {
        return getShortMonthLabel(prevMonthStr);
    }, [prevMonthStr, getShortMonthLabel]);

    const currentMonthLabel = useMemo(() => {
        return getShortMonthLabel(month);
    }, [month, getShortMonthLabel]);

    const getCatShortName = useCallback((cat) => {
        const name = cat.name.toLowerCase();
        if (name.includes("sort")) return "SORT";
        if (name.includes("order")) return "SET IN ORDER";
        if (name.includes("shine")) return "SHINE";
        if (name.includes("standard")) return "STANDARDIZE";
        if (name.includes("sustain")) return "SUSTAIN";
        return (cat.subName || cat.name).toUpperCase();
    }, []);

    const calculateCategoryScoresForChecklist = useCallback((chk, cat, totalDays) => {
        let actual = 0;
        let max = 0;
        if (!cat.items || cat.items.length === 0 || !chk) {
            return { actual, max };
        }

        const chkScoresMap = new Map();
        if (chk.scores && Array.isArray(chk.scores)) {
            chk.scores.forEach(s => {
                const dailyMap = new Map();
                if (s.dailyScores) {
                    if (typeof s.dailyScores.toJSON === "function") {
                        const plain = s.dailyScores.toJSON();
                        Object.entries(plain).forEach(([k, v]) => dailyMap.set(k, v));
                    } else if (s.dailyScores instanceof Map) {
                        s.dailyScores.forEach((v, k) => dailyMap.set(k, v));
                    } else {
                        Object.entries(s.dailyScores).forEach(([k, v]) => dailyMap.set(k, v));
                    }
                }
                chkScoresMap.set(s.itemId, dailyMap);
            });
        }

        for (let d = 1; d <= totalDays; d++) {
            let allFilled = true;
            let daySum = 0;

            for (let i = 0; i < cat.items.length; i++) {
                const item = cat.items[i];
                const itemScores = chkScoresMap.get(item._id);
                const val = itemScores ? itemScores.get(String(d)) : undefined;

                if (val === undefined || val === null || val === "") {
                    allFilled = false;
                    break;
                }
                daySum += Number(val);
            }

            if (allFilled) {
                actual += daySum;
                max += cat.items.length * 2;
            }
        }

        return { actual, max };
    }, []);

    const getAuditorsList = useCallback((chk) => {
        if (!chk || !chk.auditorSignatures) return "";
        let plainSigs = {};
        if (typeof chk.auditorSignatures.toJSON === "function") {
            plainSigs = chk.auditorSignatures.toJSON();
        } else if (chk.auditorSignatures instanceof Map) {
            plainSigs = Object.fromEntries(chk.auditorSignatures);
        } else {
            plainSigs = chk.auditorSignatures;
        }
        const signatures = Object.values(plainSigs).filter(Boolean);
        const uniqueSigs = [...new Set(signatures)];
        return uniqueSigs.join(", ");
    }, []);

    const getLastDayOfMonthStr = useCallback((mStr) => {
        if (!mStr) return "";
        const [year, m] = mStr.split("-").map(Number);
        const lastDay = new Date(year, m, 0).getDate();
        const mm = String(m).padStart(2, "0");
        return `${String(lastDay).padStart(2, "0")}.${mm}.${year}`;
    }, []);

    const getBadgeClass = useCallback((max, actual) => {
        if (!max || max === 0) return "";
        const pct = (actual / max) * 100;
        if (pct < 50) return "range-red";
        if (pct <= 80) return "range-yellow";
        return "range-green";
    }, []);

    const getRangeColorClass = useCallback((max, actual) => {
        if (!max || max === 0) return "";
        const pct = (actual / max) * 100;
        if (pct < 50) return "bg-range-red";
        if (pct <= 80) return "bg-range-yellow";
        return "bg-range-green";
    }, []);

    const prevMonthGrandTotals = useMemo(() => {
        let actual = 0;
        let max = 0;
        if (!template || !prevChecklist) return { actual, max, pct: 0 };
        template.categories.forEach(cat => {
            const catScores = calculateCategoryScoresForChecklist(prevChecklist, cat, prevMonthDays);
            actual += catScores.actual;
            max += catScores.max;
        });
        const pct = max > 0 ? Number(((actual / max) * 100).toFixed(2)) : 0;
        return { actual, max, pct };
    }, [template, prevChecklist, prevMonthDays, calculateCategoryScoresForChecklist]);

    const currentMonthGrandTotals = useMemo(() => {
        let actual = 0;
        let max = 0;
        if (!template || !checklist) return { actual, max, pct: 0 };
        template.categories.forEach(cat => {
            const catScores = calculateCategoryScoresForChecklist(checklist, cat, daysInMonth);
            actual += catScores.actual;
            max += catScores.max;
        });
        const pct = max > 0 ? Number(((actual / max) * 100).toFixed(2)) : 0;
        return { actual, max, pct };
    }, [template, checklist, daysInMonth, calculateCategoryScoresForChecklist]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const pMonthStr = getPrevMonthStr(month);
            const [tplRes, chkRes, prevChkRes] = await Promise.all([
                audit5sAPI.getTemplate(zoneId),
                audit5sAPI.getChecklist(month, zoneId),
                audit5sAPI.getChecklist(pMonthStr, zoneId).catch(() => ({ success: false }))
            ]);

            if (tplRes.success) {
                setTemplate(tplRes.data);
            }
            if (chkRes.success) {
                const chk = chkRes.data;
                setChecklist(chk);
                setDocNo(chk.docNo || tplRes?.data?.docNo || "RI/QAD/R/04");
                setRevNo(chk.revNo || tplRes?.data?.revNo || "00");
                setRevDate(formatDateYYYYMMDD(chk.revDate || tplRes?.data?.revDate || "2024-12-10"));
                setRespPersonId(chk.responsiblePerson?._id || chk.responsiblePerson || "");
            }
            if (prevChkRes && prevChkRes.success) {
                setPrevChecklist(prevChkRes.data);
            } else {
                setPrevChecklist(null);
            }

            if (isAdminOrHR) {
                const userRes = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`);
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
    }, [month, zoneId, isAdminOrHR, getPrevMonthStr]);

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



        

        const pct = max > 0 ? Number(((actual / max) * 100).toFixed(2)) : 0;
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

            const element = sheetRef.current.querySelector(".audit-sheet") || sheetRef.current;

            const canvas = await html2canvas(element, {
                scale: 2, // higher resolution
                useCORS: true,
                windowWidth: 3000, // ensure wide iframe layout to prevent horizontal clipping
                onclone: (clonedDoc) => {
                    // Hide screen-only initials
                    const screenElements = clonedDoc.querySelectorAll(".sig-screen-only");
                    screenElements.forEach(el => el.style.setProperty("display", "none", "important"));

                    // Show print-only full names
                    const printElements = clonedDoc.querySelectorAll(".sig-print-only");
                    printElements.forEach(el => {
                        el.style.setProperty("display", "inline", "important");
                        el.style.setProperty("font-size", "7px", "important");
                    });

                    // Remove width constraints on signature cells and inner boxes
                    const sigCells = clonedDoc.querySelectorAll(".sig-cell");
                    sigCells.forEach(el => {
                        el.style.setProperty("width", "auto", "important");
                        el.style.setProperty("max-width", "none", "important");
                    });

                    const sigClickBoxes = clonedDoc.querySelectorAll(".sig-click-box");
                    sigClickBoxes.forEach(el => {
                        el.style.setProperty("width", "auto", "important");
                        el.style.setProperty("max-width", "none", "important");
                    });
                }
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

    const handleExportDailyExcel = async () => {
        try {
            toast.loading("Generating Excel...", { id: "excel-gen" });
            const ExcelJS = await import("exceljs");
            const workbook = new ExcelJS.Workbook();
            
            // ─── SHEET 1: DAILY DETAIL AUDIT ───
            const worksheet = workbook.addWorksheet("5S Daily Audit");

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

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            const monthStr = month ? month.toUpperCase() : "AUDIT";
            const zoneStr = checklist?.zoneName ? checklist.zoneName.toUpperCase().replace(/\s+/g, "_") : "ZONE";
            anchor.download = `5S_Daily_Audit_${zoneStr}_${monthStr}.xlsx`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(url);

            toast.success("Daily Excel sheet exported successfully!", { id: "excel-gen" });
        } catch (err) {
            console.error("Failed to export Daily Excel:", err);
            toast.error("Failed to export Daily Excel.", { id: "excel-gen" });
        }
    };

    const handleExportMonthlyExcel = async () => {
        try {
            toast.loading("Generating Monthly Excel...", { id: "excel-gen" });
            const ExcelJS = await import("exceljs");
            const workbook = new ExcelJS.Workbook();

            const thinBorder = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
            
            // ─── SHEET 2: MONTHLY AUDIT SCORE COMPARISON ───
            const getPrevMonthStr = (mStr) => {
                if (!mStr) return "";
                const [year, m] = mStr.split("-").map(Number);
                const prevDate = new Date(year, m - 2, 15);
                const prevYear = prevDate.getFullYear();
                const prevM = String(prevDate.getMonth() + 1).padStart(2, "0");
                return `${prevYear}-${prevM}`;
            };

            const prevMonthStr = getPrevMonthStr(month);
            let prevChecklist = null;
            try {
                const prevChkRes = await audit5sAPI.getChecklist(prevMonthStr, zoneId);
                if (prevChkRes && prevChkRes.success) {
                    prevChecklist = prevChkRes.data;
                }
            } catch (err) {
                console.warn("Could not retrieve previous month checklist:", err);
            }

            const getShortMonthLabel = (mStr) => {
                if (!mStr) return "";
                const [year, m] = mStr.split("-").map(Number);
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const monthName = months[m - 1];
                const year2Digit = String(year).slice(-2);
                return `${monthName}-${year2Digit}`;
            };

            const prevMonthLabel = getShortMonthLabel(prevMonthStr);
            const currentMonthLabel = getShortMonthLabel(month);

            const getPrevMonthDays = () => {
                if (!prevMonthStr) return 30;
                const [year, m] = prevMonthStr.split("-").map(Number);
                return new Date(year, m, 0).getDate();
            };
            const prevMonthDays = getPrevMonthDays();

            const getScoresMapForChecklist = (chk) => {
                const map = new Map();
                if (!chk || !Array.isArray(chk.scores)) return map;
                chk.scores.forEach(s => {
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
            };

            const calculateCategoryScoresForChecklist = (chk, cat, totalDays) => {
                let actual = 0;
                let max = 0;
                if (!cat.items || cat.items.length === 0 || !chk) {
                    return { actual, max };
                }

                const chkScoresMap = getScoresMapForChecklist(chk);

                for (let d = 1; d <= totalDays; d++) {
                    let allFilled = true;
                    let daySum = 0;

                    for (let i = 0; i < cat.items.length; i++) {
                        const item = cat.items[i];
                        const itemScores = chkScoresMap.get(item._id);
                        const val = itemScores ? itemScores.get(String(d)) : undefined;

                        if (val === undefined || val === null || val === "") {
                            allFilled = false;
                            break;
                        }
                        daySum += Number(val);
                    }

                    if (allFilled) {
                        actual += daySum;
                        max += cat.items.length * 2;
                    }
                }

                return { actual, max };
            };

            const monthlySheet = workbook.addWorksheet("Monthly Audit Score");
            monthlySheet.columns = [
                { width: 10 }, // A
                { width: 10 }, // B
                { width: 15 }, // C
                { width: 10 }, // D
                { width: 12 }, // E
                { width: 12 }, // F
                { width: 12 }, // G
                { width: 10 }, // H
                { width: 15 }, // I
                { width: 10 }, // J
                { width: 12 }, // K
                { width: 12 }, // L
                { width: 12 }, // M
                { width: 10 }  // N
            ];

            // Title section
            monthlySheet.mergeCells(1, 1, 3, 1);
            const mLogoCell = monthlySheet.getCell(1, 1);
            mLogoCell.value = "RABS";
            mLogoCell.font = { name: "Arial", size: 18, bold: true, color: { argb: "FFFFFF" } };
            mLogoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D32F2F" } };
            mLogoCell.alignment = { vertical: "middle", horizontal: "center" };

            monthlySheet.mergeCells(1, 2, 1, 11);
            const mTitleCell = monthlySheet.getCell(1, 2);
            mTitleCell.value = "RABS INDUSTRIES";
            mTitleCell.font = { name: "Arial", size: 16, bold: true };
            mTitleCell.alignment = { vertical: "middle", horizontal: "center" };

            monthlySheet.mergeCells(1, 12, 1, 14);
            const mDocCell = monthlySheet.getCell(1, 12);
            mDocCell.value = `DOC NO: ${docNo}`;
            mDocCell.font = { name: "Arial", size: 9, bold: true };
            mDocCell.alignment = { vertical: "middle", horizontal: "left" };

            monthlySheet.mergeCells(2, 2, 2, 11);
            const mSubTitleCell = monthlySheet.getCell(2, 2);
            mSubTitleCell.value = "5S MONTHLY AUDIT SCORE ";
            mSubTitleCell.font = { name: "Arial", size: 12, bold: true };
            mSubTitleCell.alignment = { vertical: "middle", horizontal: "center" };

            monthlySheet.mergeCells(2, 12, 2, 14);
            const mRevCell = monthlySheet.getCell(2, 12);
            mRevCell.value = `REV.NO: ${revNo}`;
            mRevCell.font = { name: "Arial", size: 9, bold: true };
            mRevCell.alignment = { vertical: "middle", horizontal: "left" };

            monthlySheet.mergeCells(3, 12, 3, 14);
            const mDateCell = monthlySheet.getCell(3, 12);
            mDateCell.value = `REV.DATE: ${formatDateDisplay(revDate)}`;
            mDateCell.font = { name: "Arial", size: 9, bold: true };
            mDateCell.alignment = { vertical: "middle", horizontal: "left" };

            // Metadata Row 4
            monthlySheet.mergeCells(4, 1, 4, 7);
            const mZoneCell = monthlySheet.getCell(4, 1);
            mZoneCell.value = `ZONE AREA :  ${checklist.zoneName ? checklist.zoneName.toUpperCase() : "SECURITY AREA"}`;
            mZoneCell.font = { name: "Arial", size: 10, bold: true };
            mZoneCell.alignment = { vertical: "middle", horizontal: "left" };

            monthlySheet.mergeCells(4, 8, 4, 14);
            const mZoneNoCell = monthlySheet.getCell(4, 8);
            mZoneNoCell.value = `ZONE NO: ${checklist.zoneNo || "01"}`;
            mZoneNoCell.font = { name: "Arial", size: 10, bold: true };
            mZoneNoCell.alignment = { vertical: "middle", horizontal: "left" };

            // Row 5: Responsible & Month Names
            monthlySheet.mergeCells(5, 1, 5, 2);
            const mRespCell = monthlySheet.getCell(5, 1);
            mRespCell.value = "RESPONSIBLE";
            mRespCell.font = { name: "Arial", size: 10, bold: true };
            mRespCell.alignment = { vertical: "middle", horizontal: "center" };
            mRespCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            monthlySheet.mergeCells(5, 3, 5, 8);
            const mPrevMonthTitle = monthlySheet.getCell(5, 3);
            mPrevMonthTitle.value = ` AUDIT SCORE- ${prevMonthLabel || "PREVIOUS MONTH"}`;
            mPrevMonthTitle.font = { name: "Arial", size: 11, bold: true };
            mPrevMonthTitle.alignment = { vertical: "middle", horizontal: "center" };
            mPrevMonthTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            monthlySheet.mergeCells(5, 9, 5, 14);
            const mCurrMonthTitle = monthlySheet.getCell(5, 9);
            mCurrMonthTitle.value = ` AUDIT SCORE- ${currentMonthLabel || "CURRENT MONTH"}`;
            mCurrMonthTitle.font = { name: "Arial", size: 11, bold: true };
            mCurrMonthTitle.alignment = { vertical: "middle", horizontal: "center" };
            mCurrMonthTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            // Row 6: Columns
            monthlySheet.mergeCells(6, 1, 6, 2);
            const mPhotoLabel = monthlySheet.getCell(6, 1);
            mPhotoLabel.value = " Photos";
            mPhotoLabel.font = { name: "Arial", size: 10, bold: true };
            mPhotoLabel.alignment = { vertical: "middle", horizontal: "center" };
            mPhotoLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            monthlySheet.mergeCells(6, 3, 6, 4);
            const mDescLabel1 = monthlySheet.getCell(6, 3);
            mDescLabel1.value = "5S Description ";
            mDescLabel1.font = { name: "Arial", size: 10, bold: true };
            mDescLabel1.alignment = { vertical: "middle", horizontal: "center" };
            mDescLabel1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            monthlySheet.mergeCells(6, 5, 6, 8);
            const mAvgLabel1 = monthlySheet.getCell(6, 5);
            mAvgLabel1.value = "Mark/Average monthly";
            mAvgLabel1.font = { name: "Arial", size: 10, bold: true };
            mAvgLabel1.alignment = { vertical: "middle", horizontal: "center" };
            mAvgLabel1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            monthlySheet.mergeCells(6, 9, 6, 10);
            const mDescLabel2 = monthlySheet.getCell(6, 9);
            mDescLabel2.value = "5S Description ";
            mDescLabel2.font = { name: "Arial", size: 10, bold: true };
            mDescLabel2.alignment = { vertical: "middle", horizontal: "center" };
            mDescLabel2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            monthlySheet.mergeCells(6, 11, 6, 14);
            const mAvgLabel2 = monthlySheet.getCell(6, 11);
            mAvgLabel2.value = "Mark/Average monthly";
            mAvgLabel2.font = { name: "Arial", size: 10, bold: true };
            mAvgLabel2.alignment = { vertical: "middle", horizontal: "center" };
            mAvgLabel2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            // Row 7: Details
            monthlySheet.mergeCells(7, 1, 7, 2);
            const mLeaderLabel = monthlySheet.getCell(7, 1);
            mLeaderLabel.value = "Leader";
            mLeaderLabel.font = { name: "Arial", size: 10, bold: true };
            mLeaderLabel.alignment = { vertical: "middle", horizontal: "center" };
            mLeaderLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };

            const subHeaders = [
                " Total Score ", "Required", "Actual ", "Status ",
                " Total Score ", "Required", "Actual ", "Status "
            ];
            const subCols = [5, 6, 7, 8, 11, 12, 13, 14];
            subHeaders.forEach((sh, idx) => {
                const cell = monthlySheet.getCell(7, subCols[idx]);
                cell.value = sh;
                cell.font = { name: "Arial", size: 9, bold: true };
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
            });

            // Set borders for Row 1-7
            for (let r = 1; r <= 7; r++) {
                for (let c = 1; c <= 14; c++) {
                    monthlySheet.getCell(r, c).border = thinBorder;
                }
            }

            // Categories
            const getCatShortName = (cat) => {
                const name = cat.name.toLowerCase();
                if (name.includes("sort")) return "SORT";
                if (name.includes("order")) return "SET IN ORDER";
                if (name.includes("shine")) return "SHINE";
                if (name.includes("standard")) return "STANDARDIZE";
                if (name.includes("sustain")) return "SUSTAIN";
                return (cat.subName || cat.name).toUpperCase();
            };

            const numCats = template.categories.length;

            template.categories.forEach((cat, idx) => {
                const catRow = 8 + 2 * idx;
                const catNameStr = getCatShortName(cat);

                // Prev month scores
                const prevScores = calculateCategoryScoresForChecklist(prevChecklist, cat, prevMonthDays);
                // Curr month scores
                const currScores = calculateCategoryScoresForChecklist(checklist, cat, daysInMonth);

                // Previous month category cells
                monthlySheet.mergeCells(catRow, 3, catRow, 4);
                const pDescCell = monthlySheet.getCell(catRow, 3);
                pDescCell.value = catNameStr;
                pDescCell.font = { name: "Arial", size: 9, bold: true };
                pDescCell.alignment = { vertical: "middle", horizontal: "center" };

                const pTotalCell = monthlySheet.getCell(catRow, 5);
                pTotalCell.value = prevScores.max;
                pTotalCell.font = { name: "Arial", size: 9 };
                pTotalCell.alignment = { vertical: "middle", horizontal: "center" };

                const pReqCell = monthlySheet.getCell(catRow, 6);
                pReqCell.value = prevScores.max * 0.5;
                pReqCell.font = { name: "Arial", size: 9 };
                pReqCell.alignment = { vertical: "middle", horizontal: "center" };

                const pActCell = monthlySheet.getCell(catRow, 7);
                pActCell.value = prevChecklist ? prevScores.actual : "";
                pActCell.font = { name: "Arial", size: 9 };
                pActCell.alignment = { vertical: "middle", horizontal: "center" };

                const pStatusCell = monthlySheet.getCell(catRow, 8);
                pStatusCell.value = { formula: `IF(G${catRow}<>"",IF(G${catRow}>=F${catRow},"OK","NG"),"")` };
                pStatusCell.font = { name: "Arial", size: 9, bold: true };
                pStatusCell.alignment = { vertical: "middle", horizontal: "center" };

                // Current month category cells
                monthlySheet.mergeCells(catRow, 9, catRow, 10);
                const cDescCell = monthlySheet.getCell(catRow, 9);
                cDescCell.value = catNameStr;
                cDescCell.font = { name: "Arial", size: 9, bold: true };
                cDescCell.alignment = { vertical: "middle", horizontal: "center" };

                const cTotalCell = monthlySheet.getCell(catRow, 11);
                cTotalCell.value = currScores.max;
                cTotalCell.font = { name: "Arial", size: 9 };
                cTotalCell.alignment = { vertical: "middle", horizontal: "center" };

                const cReqCell = monthlySheet.getCell(catRow, 12);
                cReqCell.value = currScores.max * 0.5;
                cReqCell.font = { name: "Arial", size: 9 };
                cReqCell.alignment = { vertical: "middle", horizontal: "center" };

                const cActCell = monthlySheet.getCell(catRow, 13);
                cActCell.value = currScores.actual;
                cActCell.font = { name: "Arial", size: 9 };
                cActCell.alignment = { vertical: "middle", horizontal: "center" };

                const cStatusCell = monthlySheet.getCell(catRow, 14);
                cStatusCell.value = { formula: `IF(M${catRow}<>"",IF(M${catRow}>=L${catRow},"OK","NG"),"")` };
                cStatusCell.font = { name: "Arial", size: 9, bold: true };
                cStatusCell.alignment = { vertical: "middle", horizontal: "center" };

                // Set borders for cat row & empty row
                for (let col = 1; col <= 14; col++) {
                    monthlySheet.getCell(catRow, col).border = thinBorder;
                    monthlySheet.getCell(catRow + 1, col).border = thinBorder;
                }
            });

            // Merges for Leader Section (Left Panel)
            // 1. Photo Area (A8 to B15 in standard layout)
            const photoEndRow = 8 + 2 * (numCats - 1) - 1; // row 15
            monthlySheet.mergeCells(8, 1, photoEndRow, 2);
            const leaderPhotoCell = monthlySheet.getCell(8, 1);
            leaderPhotoCell.value = "Photo";
            leaderPhotoCell.font = { name: "Arial", size: 10, italic: true };
            leaderPhotoCell.alignment = { vertical: "middle", horizontal: "center" };

            // 2. Leader Name Label ("Name ")
            const nameStartRow = 8 + 2 * (numCats - 1); // row 16
            monthlySheet.mergeCells(nameStartRow, 1, nameStartRow + 1, 2);
            const leaderNameLabel = monthlySheet.getCell(nameStartRow, 1);
            leaderNameLabel.value = "Name ";
            leaderNameLabel.font = { name: "Arial", size: 10, bold: true };
            leaderNameLabel.alignment = { vertical: "middle", horizontal: "center" };
            leaderNameLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            const totalScoreRow = 8 + 2 * numCats; // row 18
            const scorePctRow = totalScoreRow + 1; // row 19

            // 3. Leader Name Value
            monthlySheet.mergeCells(totalScoreRow, 1, totalScoreRow, 2);
            const leaderNameValCell = monthlySheet.getCell(totalScoreRow, 1);
            leaderNameValCell.value = respPersonName;
            leaderNameValCell.font = { name: "Arial", size: 9, bold: true };
            leaderNameValCell.alignment = { vertical: "middle", horizontal: "center" };
            leaderNameValCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };

            // 4. Auditee Signature Label
            monthlySheet.mergeCells(scorePctRow, 1, scorePctRow, 2);
            const signatureLabelCell = monthlySheet.getCell(scorePctRow, 1);
            signatureLabelCell.value = "Auditee Signature ";
            signatureLabelCell.font = { name: "Arial", size: 9, bold: true };
            signatureLabelCell.alignment = { vertical: "middle", horizontal: "center" };
            signatureLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F1F5F9" } };

            // TOTAL SCORE Row
            monthlySheet.mergeCells(totalScoreRow, 3, totalScoreRow, 4);
            const pTotalLabel = monthlySheet.getCell(totalScoreRow, 3);
            pTotalLabel.value = "TOTAL  SCORE";
            pTotalLabel.font = { name: "Arial", size: 10, bold: true };
            pTotalLabel.alignment = { vertical: "middle", horizontal: "center" };
            pTotalLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            // Prev month totals
            const pTotScore = monthlySheet.getCell(totalScoreRow, 5);
            pTotScore.value = { formula: `SUM(E8:E${totalScoreRow - 1})` };
            pTotScore.font = { name: "Arial", size: 10, bold: true };
            pTotScore.alignment = { vertical: "middle", horizontal: "center" };
            pTotScore.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const pTotReq = monthlySheet.getCell(totalScoreRow, 6);
            pTotReq.value = { formula: `SUM(F8:F${totalScoreRow - 1})` };
            pTotReq.font = { name: "Arial", size: 10, bold: true };
            pTotReq.alignment = { vertical: "middle", horizontal: "center" };
            pTotReq.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const pTotAct = monthlySheet.getCell(totalScoreRow, 7);
            pTotAct.value = prevChecklist ? { formula: `SUM(G8:G${totalScoreRow - 1})` } : "";
            pTotAct.font = { name: "Arial", size: 10, bold: true };
            pTotAct.alignment = { vertical: "middle", horizontal: "center" };
            pTotAct.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const pTotStatus = monthlySheet.getCell(totalScoreRow, 8);
            pTotStatus.value = { formula: `IF(G${totalScoreRow}<>"",IF(G${totalScoreRow}>=F${totalScoreRow},"OK","NG"),"")` };
            pTotStatus.font = { name: "Arial", size: 10, bold: true };
            pTotStatus.alignment = { vertical: "middle", horizontal: "center" };
            pTotStatus.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            // Current month totals
            monthlySheet.mergeCells(totalScoreRow, 9, totalScoreRow, 10);
            const cTotalLabel = monthlySheet.getCell(totalScoreRow, 9);
            cTotalLabel.value = "TOTAL  SCORE";
            cTotalLabel.font = { name: "Arial", size: 10, bold: true };
            cTotalLabel.alignment = { vertical: "middle", horizontal: "center" };
            cTotalLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const cTotScore = monthlySheet.getCell(totalScoreRow, 11);
            cTotScore.value = { formula: `SUM(K8:K${totalScoreRow - 1})` };
            cTotScore.font = { name: "Arial", size: 10, bold: true };
            cTotScore.alignment = { vertical: "middle", horizontal: "center" };
            cTotScore.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const cTotReq = monthlySheet.getCell(totalScoreRow, 12);
            cTotReq.value = { formula: `SUM(L8:L${totalScoreRow - 1})` };
            cTotReq.font = { name: "Arial", size: 10, bold: true };
            cTotReq.alignment = { vertical: "middle", horizontal: "center" };
            cTotReq.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const cTotAct = monthlySheet.getCell(totalScoreRow, 13);
            cTotAct.value = { formula: `SUM(M8:M${totalScoreRow - 1})` };
            cTotAct.font = { name: "Arial", size: 10, bold: true };
            cTotAct.alignment = { vertical: "middle", horizontal: "center" };
            cTotAct.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const cTotStatus = monthlySheet.getCell(totalScoreRow, 14);
            cTotStatus.value = { formula: `IF(M${totalScoreRow}<>"",IF(M${totalScoreRow}>=L${totalScoreRow},"OK","NG"),"")` };
            cTotStatus.font = { name: "Arial", size: 10, bold: true };
            cTotStatus.alignment = { vertical: "middle", horizontal: "center" };
            cTotStatus.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            // SCORE % Row
            monthlySheet.mergeCells(scorePctRow, 3, scorePctRow, 4);
            const pPctLabel = monthlySheet.getCell(scorePctRow, 3);
            pPctLabel.value = " SCORE %";
            pPctLabel.font = { name: "Arial", size: 10, bold: true };
            pPctLabel.alignment = { vertical: "middle", horizontal: "center" };
            pPctLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            // Prev month %
            const pPctVal = monthlySheet.getCell(scorePctRow, 5);
            pPctVal.value = 100;
            pPctVal.font = { name: "Arial", size: 10, bold: true };
            pPctVal.alignment = { vertical: "middle", horizontal: "center" };
            pPctVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const pPctReq = monthlySheet.getCell(scorePctRow, 6);
            pPctReq.value = 50;
            pPctReq.font = { name: "Arial", size: 10, bold: true };
            pPctReq.alignment = { vertical: "middle", horizontal: "center" };
            pPctReq.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const pPctAct = monthlySheet.getCell(scorePctRow, 7);
            pPctAct.value = prevChecklist ? { formula: `IF(E${totalScoreRow}>0,ROUND(G${totalScoreRow}/E${totalScoreRow}*E${scorePctRow},2),"")` } : "";
            pPctAct.font = { name: "Arial", size: 10, bold: true };
            pPctAct.alignment = { vertical: "middle", horizontal: "center" };
            pPctAct.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const pPctStatus = monthlySheet.getCell(scorePctRow, 8);
            pPctStatus.value = { formula: `IF(G${scorePctRow}<>"",IF(G${scorePctRow}>=F${scorePctRow},"OK","NG"),"")` };
            pPctStatus.font = { name: "Arial", size: 10, bold: true };
            pPctStatus.alignment = { vertical: "middle", horizontal: "center" };
            pPctStatus.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            // Current month %
            monthlySheet.mergeCells(scorePctRow, 9, scorePctRow, 10);
            const cPctLabel = monthlySheet.getCell(scorePctRow, 9);
            cPctLabel.value = " SCORE %";
            cPctLabel.font = { name: "Arial", size: 10, bold: true };
            cPctLabel.alignment = { vertical: "middle", horizontal: "center" };
            cPctLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const cPctVal = monthlySheet.getCell(scorePctRow, 11);
            cPctVal.value = 100;
            cPctVal.font = { name: "Arial", size: 10, bold: true };
            cPctVal.alignment = { vertical: "middle", horizontal: "center" };
            cPctVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const cPctReq = monthlySheet.getCell(scorePctRow, 12);
            cPctReq.value = 50;
            cPctReq.font = { name: "Arial", size: 10, bold: true };
            cPctReq.alignment = { vertical: "middle", horizontal: "center" };
            cPctReq.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const cPctAct = monthlySheet.getCell(scorePctRow, 13);
            cPctAct.value = { formula: `IF(K${totalScoreRow}>0,ROUND(M${totalScoreRow}/K${totalScoreRow}*K${scorePctRow},2),"")` };
            cPctAct.font = { name: "Arial", size: 10, bold: true };
            cPctAct.alignment = { vertical: "middle", horizontal: "center" };
            cPctAct.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            const cPctStatus = monthlySheet.getCell(scorePctRow, 14);
            cPctStatus.value = { formula: `IF(M${scorePctRow}<>"",IF(M${scorePctRow}>=L${scorePctRow},"OK","NG"),"")` };
            cPctStatus.font = { name: "Arial", size: 10, bold: true };
            cPctStatus.alignment = { vertical: "middle", horizontal: "center" };
            cPctStatus.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E2E8F0" } };

            // Set borders for totals and pct rows
            for (let c = 1; c <= 14; c++) {
                monthlySheet.getCell(totalScoreRow, c).border = thinBorder;
                monthlySheet.getCell(scorePctRow, c).border = thinBorder;
            }

            // Dates & Auditors rows
            const dateRow = totalScoreRow + 2;
            const auditorRow = totalScoreRow + 3;

            const getLastDayOfMonthStr = (mStr) => {
                if (!mStr) return "";
                const [year, m] = mStr.split("-").map(Number);
                const lastDay = new Date(year, m, 0).getDate();
                const mm = String(m).padStart(2, "0");
                return `${String(lastDay).padStart(2, "0")}-${mm}-${year}`;
            };

            const getAuditorsList = (chk) => {
                if (!chk || !chk.auditorSignatures) return "";
                let plainSigs = {};
                if (typeof chk.auditorSignatures.toJSON === "function") {
                    plainSigs = chk.auditorSignatures.toJSON();
                } else if (chk.auditorSignatures instanceof Map) {
                    plainSigs = Object.fromEntries(chk.auditorSignatures);
                } else {
                    plainSigs = chk.auditorSignatures;
                }
                const signatures = Object.values(plainSigs).filter(Boolean);
                const uniqueSigs = [...new Set(signatures)];
                return uniqueSigs.join(", ");
            };

            // Prev month Date & Auditor
            monthlySheet.mergeCells(dateRow, 3, dateRow, 4);
            const pDateCell = monthlySheet.getCell(dateRow, 3);
            pDateCell.value = prevChecklist ? `Date :  ${getLastDayOfMonthStr(prevMonthStr)}` : "Date : ";
            pDateCell.font = { name: "Arial", size: 10, bold: true };
            pDateCell.alignment = { vertical: "middle", horizontal: "left" };

            monthlySheet.mergeCells(auditorRow, 3, auditorRow, 8);
            const pAuditorCell = monthlySheet.getCell(auditorRow, 3);
            pAuditorCell.value = `Auditor  by: ${getAuditorsList(prevChecklist)}`;
            pAuditorCell.font = { name: "Arial", size: 10, bold: true };
            pAuditorCell.alignment = { vertical: "middle", horizontal: "left" };

            // Curr month Date & Auditor
            monthlySheet.mergeCells(dateRow, 9, dateRow, 10);
            const cDateCell = monthlySheet.getCell(dateRow, 9);
            cDateCell.value = `Date : ${getLastDayOfMonthStr(month)}`;
            cDateCell.font = { name: "Arial", size: 10, bold: true };
            cDateCell.alignment = { vertical: "middle", horizontal: "left" };

            monthlySheet.mergeCells(auditorRow, 9, auditorRow, 14);
            const cAuditorCell = monthlySheet.getCell(auditorRow, 9);
            cAuditorCell.value = `Auditor  by: ${getAuditorsList(checklist)}`;
            cAuditorCell.font = { name: "Arial", size: 10, bold: true };
            cAuditorCell.alignment = { vertical: "middle", horizontal: "left" };

            // Borders for date & auditor rows
            for (let r = dateRow; r <= auditorRow; r++) {
                for (let c = 1; c <= 14; c++) {
                    monthlySheet.getCell(r, c).border = thinBorder;
                }
            }

            // Criteria & Notes
            const criteriaRow = totalScoreRow + 4;
            const noteRow = totalScoreRow + 5;

            monthlySheet.mergeCells(criteriaRow, 1, criteriaRow, 14);
            const criteriaCell = monthlySheet.getCell(criteriaRow, 1);
            criteriaCell.value = "Score Criteria :  Red Below=50% , Yellow= 50-80% , Green =81-100%";
            criteriaCell.font = { name: "Arial", size: 9, bold: true };
            criteriaCell.alignment = { vertical: "middle", horizontal: "left" };

            monthlySheet.mergeCells(noteRow, 1, noteRow, 14);
            const noteCell = monthlySheet.getCell(noteRow, 1);
            noteCell.value = "Note :   Data will be update last day of this month.Score for answer of overall month";
            noteCell.font = { name: "Arial", size: 9, bold: true };
            noteCell.alignment = { vertical: "middle", horizontal: "left" };

            for (let r = criteriaRow; r <= noteRow; r++) {
                for (let c = 1; c <= 14; c++) {
                    monthlySheet.getCell(r, c).border = thinBorder;
                }
            }


            // ─── WRITE WORKBOOK ───
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            const monthStr = month ? month.toUpperCase() : "AUDIT";
            const zoneStr = checklist?.zoneName ? checklist.zoneName.toUpperCase().replace(/\s+/g, "_") : "ZONE";
            anchor.download = `5S_Monthly_Score_${zoneStr}_${monthStr}.xlsx`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(url);

            toast.success("Monthly Excel sheet exported successfully!", { id: "excel-gen" });
        } catch (err) {
            console.error("Failed to export Monthly Excel:", err);
            toast.error("Failed to export Monthly Excel.", { id: "excel-gen" });
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
                    onClick={handleExportDailyExcel}
                >
                    🟢 Daily Excel
                </button>
                <button
                    type="button"
                    className="btn-audit5s btn-secondary"
                    onClick={handleExportMonthlyExcel}
                >
                    📊 Monthly Excel
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

            {/* Sub Tabs Selection */}
            <div className="audit-subtabs-nav no-print">
                <button
                    className={`audit-subtab-btn ${activeSubTab === "daily" ? "active" : ""}`}
                    onClick={() => setActiveSubTab("daily")}
                >
                    📋 Daily Checklist
                </button>
                <button
                    className={`audit-subtab-btn ${activeSubTab === "monthly" ? "active" : ""}`}
                    onClick={() => setActiveSubTab("monthly")}
                >
                    📊 Monthly Score Report
                </button>
            </div>

            {/* Print Sheet Viewport */}
            <div className="audit-sheet-print-container" ref={sheetRef}>
                <div className={`audit-sheet ${activeSubTab === "monthly" ? "monthly-view-mode" : "daily-view-mode"}`}>
                    {activeSubTab === "daily" ? (
                        <>
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
                                                        <span className="sig-screen-only">{formatSigDisplay(sigVal)}</span>
                                                        <span className="sig-print-only">{sigVal || "—"}</span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="sig-cell-spacer"></td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Footer legends */}
                            <div className="sheet-footer">
                                <div className="legends-box">
                                    <strong>LEGENDS :</strong>
                                    <span><strong>2</strong> &gt;&gt; Awareness and system implement</span>
                                    <span><strong>1</strong> &gt;&gt; Awareness only and system not implement</span>
                                    <span><strong>0</strong> &gt;&gt; Awareness &amp; Requirement not implement</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="monthly-score-view">
                            {/* Header Block */}
                            <table className="monthly-header-table">
                                <tbody>
                                    <tr>
                                        <td className="header-logo-cell" rowSpan="3">
                                            <div className="rabs-logo-box-img">
                                                <img src={rabsLogo} alt="RABS Logo" className="rabs-logo-img" />
                                            </div>
                                        </td>
                                        <td className="header-title-cell" colSpan="2">
                                            <h2>RABS INDUSTRIES</h2>
                                            <h3>5S MONTHLY AUDIT SCORE</h3>
                                        </td>
                                        <td className="header-meta-cell">
                                            <div className="meta-row">
                                                <span className="meta-label">DOC NO:</span>
                                                <span className="meta-value">{docNo}</span>
                                            </div>
                                            <div className="meta-row">
                                                <span className="meta-label">REV.NO:</span>
                                                <span className="meta-value">{revNo}</span>
                                            </div>
                                            <div className="meta-row">
                                                <span className="meta-label">REV.DATE:</span>
                                                <span className="meta-value">{formatDateDisplay(revDate)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Zone Area & Zone No Row */}
                            <div className="monthly-zone-row">
                                <div className="zone-area-lbl">
                                    <strong>ZONE AREA :</strong> {(checklist.zoneName || "OFFICE").toUpperCase()}
                                </div>
                                <div className="zone-no-lbl">
                                    <strong>ZONE NO:</strong> {checklist.zoneNo || "01"}
                                </div>
                            </div>

                            {/* Main Grid Table */}
                            <table className="monthly-grid-table">
                                <thead>
                                    <tr className="super-header-row">
                                        <th colSpan="2" className="resp-col-hdr">RESPONSIBLE</th>
                                        <th colSpan="6" className="prev-month-hdr">
                                            AUDIT SCORE - {prevMonthLabel || "PREVIOUS MONTH"}
                                        </th>
                                        <th colSpan="6" className="curr-month-hdr">
                                            AUDIT SCORE - {currentMonthLabel || "CURRENT MONTH"}
                                        </th>
                                    </tr>
                                    <tr className="sub-header-row">
                                        <th colSpan="2" className="photo-hdr-col">Photos / Leader</th>
                                        <th colSpan="2" className="desc-hdr-col">5S Description</th>
                                        <th className="val-hdr-col">Total Score</th>
                                        <th className="val-hdr-col">Required</th>
                                        <th className="val-hdr-col">Actual</th>
                                        <th className="status-hdr-col">Status</th>
                                        <th colSpan="2" className="desc-hdr-col">5S Description</th>
                                        <th className="val-hdr-col">Total Score</th>
                                        <th className="val-hdr-col">Required</th>
                                        <th className="val-hdr-col">Actual</th>
                                        <th className="status-hdr-col">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {template.categories.map((cat, idx) => {
                                        const catName = getCatShortName(cat);
                                        const prevScores = calculateCategoryScoresForChecklist(prevChecklist, cat, prevMonthDays);
                                        const currScores = calculateCategoryScoresForChecklist(checklist, cat, daysInMonth);

                                        const prevStatus = prevChecklist && prevScores.max > 0
                                            ? (prevScores.actual >= prevScores.max * 0.5 ? "OK" : "NG")
                                            : "";
                                        const currStatus = currScores.max > 0
                                            ? (currScores.actual >= currScores.max * 0.5 ? "OK" : "NG")
                                            : "";

                                        return (
                                            <tr key={cat._id || idx} className="cat-row-comp">
                                                {/* Left Panel: Photo Area spanning categories */}
                                                {idx === 0 && (
                                                    <td colSpan="2" rowSpan={template.categories.length} className="leader-photo-cell">
                                                        <div className="leader-avatar-placeholder">
                                                            <span className="avatar-icon">👤</span>
                                                            <span className="avatar-lbl">Leader Photo</span>
                                                        </div>
                                                    </td>
                                                )}

                                                {/* Previous Month Category Detail */}
                                                <td colSpan="2" className="desc-cell-val font-semibold">{catName}</td>
                                                <td className="center-val">{prevScores.max || "—"}</td>
                                                <td className="center-val">{prevScores.max ? prevScores.max * 0.5 : "—"}</td>
                                                <td className={`center-val ${getRangeColorClass(prevScores.max, prevScores.actual)}`}>{prevChecklist ? prevScores.actual : "—"}</td>
                                                <td className="status-cell-val">
                                                    {prevStatus && (
                                                        <span className={`status-badge ${getBadgeClass(prevScores.max, prevScores.actual)}`}>
                                                            {prevStatus}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Current Month Category Detail */}
                                                <td colSpan="2" className="desc-cell-val font-semibold">{catName}</td>
                                                <td className="center-val">{currScores.max}</td>
                                                <td className="center-val">{currScores.max * 0.5}</td>
                                                <td className={`center-val ${getRangeColorClass(currScores.max, currScores.actual)}`}>{currScores.actual}</td>
                                                <td className="status-cell-val">
                                                    {currStatus ? (
                                                        <span className={`status-badge ${getBadgeClass(currScores.max, currScores.actual)}`}>
                                                            {currStatus}
                                                        </span>
                                                    ) : "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* Name & Signature Row */}
                                    <tr className="name-sig-row">
                                        <td colSpan="2" className="leader-name-label">Name</td>
                                        <td colSpan="2" className="total-score-lbl">TOTAL SCORE</td>
                                        {/* Prev Total */}
                                        <td className="center-val font-bold">{prevMonthGrandTotals.max || "—"}</td>
                                        <td className="center-val font-bold">{prevMonthGrandTotals.max ? prevMonthGrandTotals.max * 0.5 : "—"}</td>
                                        <td className={`center-val font-bold ${getRangeColorClass(prevMonthGrandTotals.max, prevMonthGrandTotals.actual)}`}>{prevChecklist ? prevMonthGrandTotals.actual : "—"}</td>
                                        <td className="status-cell-val">
                                            {prevChecklist && prevMonthGrandTotals.max > 0 && (
                                                <span className={`status-badge ${getBadgeClass(prevMonthGrandTotals.max, prevMonthGrandTotals.actual)}`}>
                                                    {prevMonthGrandTotals.actual >= prevMonthGrandTotals.max * 0.5 ? "OK" : "NG"}
                                                </span>
                                            )}
                                        </td>
                                        <td colSpan="2" className="total-score-lbl">TOTAL SCORE</td>
                                        {/* Curr Total */}
                                        <td className="center-val font-bold">{currentMonthGrandTotals.max}</td>
                                        <td className="center-val font-bold">{currentMonthGrandTotals.max * 0.5}</td>
                                        <td className={`center-val font-bold ${getRangeColorClass(currentMonthGrandTotals.max, currentMonthGrandTotals.actual)}`}>{currentMonthGrandTotals.actual}</td>
                                        <td className="status-cell-val">
                                            {currentMonthGrandTotals.max > 0 ? (
                                                <span className={`status-badge ${getBadgeClass(currentMonthGrandTotals.max, currentMonthGrandTotals.actual)}`}>
                                                    {currentMonthGrandTotals.actual >= currentMonthGrandTotals.max * 0.5 ? "OK" : "NG"}
                                                </span>
                                            ) : "—"}
                                        </td>
                                    </tr>

                                    {/* Score % Row */}
                                    <tr className="score-pct-row">
                                        <td colSpan="2" className="leader-name-value">{respPersonName}</td>
                                        <td colSpan="2" className="score-pct-lbl">SCORE %</td>
                                        {/* Prev Month % */}
                                        <td className="center-val font-bold">100</td>
                                        <td className="center-val font-bold">50</td>
                                        <td className={`center-val font-bold ${getRangeColorClass(prevMonthGrandTotals.max, prevMonthGrandTotals.actual)}`}>{prevChecklist ? `${prevMonthGrandTotals.pct}%` : "—"}</td>
                                        <td className="status-cell-val">
                                            {prevChecklist && prevMonthGrandTotals.max > 0 && (
                                                <span className={`status-badge ${getBadgeClass(prevMonthGrandTotals.max, prevMonthGrandTotals.actual)}`}>
                                                    {prevMonthGrandTotals.pct >= 50 ? "OK" : "NG"}
                                                </span>
                                            )}
                                        </td>
                                        <td colSpan="2" className="score-pct-lbl">SCORE %</td>
                                        {/* Curr Month % */}
                                        <td className="center-val font-bold">100</td>
                                        <td className="center-val font-bold">50</td>
                                        <td className={`center-val font-bold ${getRangeColorClass(currentMonthGrandTotals.max, currentMonthGrandTotals.actual)}`}>{`${currentMonthGrandTotals.pct}%`}</td>
                                        <td className="status-cell-val">
                                            {currentMonthGrandTotals.max > 0 ? (
                                                <span className={`status-badge ${getBadgeClass(currentMonthGrandTotals.max, currentMonthGrandTotals.actual)}`}>
                                                    {currentMonthGrandTotals.pct >= 50 ? "OK" : "NG"}
                                                </span>
                                            ) : "—"}
                                        </td>
                                    </tr>

                                    {/* Auditee Signature Row */}
                                    <tr className="auditee-sig-row">
                                        <td colSpan="2" className="auditee-sig-label">Auditee Signature</td>
                                        <td colSpan="6" className="prev-date-auditor">
                                            <div className="meta-footer-info">
                                                <span><strong>Date:</strong> {prevChecklist ? getLastDayOfMonthStr(prevMonthStr) : "—"}</span>
                                                <span><strong>Audited by:</strong> {prevChecklist ? getAuditorsList(prevChecklist) : "—"}</span>
                                            </div>
                                        </td>
                                        <td colSpan="6" className="curr-date-auditor">
                                            <div className="meta-footer-info">
                                                <span><strong>Date:</strong> {getLastDayOfMonthStr(month)}</span>
                                                <span><strong>Audited by:</strong> {getAuditorsList(checklist)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Criteria & Note Footer */}
                            <div className="monthly-footer-info-box">
                                <div className="criteria-lbl">
                                    <strong>Score Criteria:</strong> <span className="badge-red">Red Below 50%</span>, <span className="badge-yellow">Yellow 50-80%</span>, <span className="badge-green">Green 81-100%</span>
                                </div>
                                <div className="note-lbl">
                                    <strong>Note:</strong> Data will be updated on the last day of this month. Score represents answers for the overall month.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Confirm Modal overlay */}
            {confirmModal.open && createPortal(
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
                </div>,
                document.body
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

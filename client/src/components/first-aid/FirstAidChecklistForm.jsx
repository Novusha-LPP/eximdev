import React, { useState, useEffect, useRef } from 'react';
import firstAidAPI from '../../api/firstAid.api';
import toast from 'react-hot-toast';
import { CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VerifiedIcon from '@mui/icons-material/Verified';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import moment from 'moment';

function FirstAidChecklistForm({ checklistId, loggedInUser, onBack }) {
    const [checklist, setChecklist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [itemsState, setItemsState] = useState([]);
    const [responsibility, setResponsibility] = useState('');
    const sheetRef = useRef(null);

    // Modal states for adding medicine directly on sheet
    const [showAddSheetMedicineModal, setShowAddSheetMedicineModal] = useState(false);
    const [sheetNewProductName, setSheetNewProductName] = useState('');
    const [sheetNewProductGenericName, setSheetNewProductGenericName] = useState('');
    const [sheetNewProductPurpose, setSheetNewProductPurpose] = useState('');

    // Modal states for editing medicine directly on sheet
    const [showEditSheetMedicineModal, setShowEditSheetMedicineModal] = useState(false);
    const [sheetEditProduct, setSheetEditProduct] = useState(null);
    const [sheetEditProductName, setSheetEditProductName] = useState('');
    const [sheetEditProductGenericName, setSheetEditProductGenericName] = useState('');
    const [sheetEditProductPurpose, setSheetEditProductPurpose] = useState('');
    const [sheetEditProductIndex, setSheetEditProductIndex] = useState(-1);

    const [dialogState, setDialogState] = useState({
        open: false,
        type: 'confirm', // 'confirm' or 'prompt'
        message: '',
        inputValue: '',
        onConfirm: null
    });

    const isAdminOrHod = loggedInUser?.role === 'Admin' || loggedInUser?.role === 'Head_of_Department' || loggedInUser?.role === 'HOD' || loggedInUser?.isHOD;

    const fetchChecklist = async () => {
        try {
            setLoading(true);
            const data = await firstAidAPI.getChecklistById(checklistId);
            setChecklist(data);
            setItemsState(data.items || []);
            setResponsibility(data.responsibility || '');
        } catch (err) {
            console.error('Failed to fetch checklist details:', err);
            toast.error('Failed to load checklist details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (checklistId) {
            fetchChecklist();
        }
    }, [checklistId]);

    // Helper to calculate the 5 Mondays of the month
    const getMondaysOfMonth = (monthStr) => {
        const mondays = [];
        if (!monthStr) return mondays;
        const [year, month] = monthStr.split('-');
        const date = moment(`${year}-${month}-01`, 'YYYY-MM-DD');
        while (date.day() !== 1) {
            date.add(1, 'day');
        }
        for (let i = 0; i < 5; i++) {
            mondays.push(date.clone());
            date.add(7, 'days');
        }
        return mondays;
    };

    const mondays = getMondaysOfMonth(checklist?.month);

    const handleCellChange = (index, field, value) => {
        const updated = [...itemsState];
        updated[index] = { ...updated[index], [field]: value };
        setItemsState(updated);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const updated = await firstAidAPI.updateChecklist(checklistId, {
                items: itemsState,
                responsibility
            });
            setChecklist(updated);
            setIsEditing(false);
            toast.success('Checklist updated successfully.');
        } catch (err) {
            console.error('Failed to save checklist:', err);
            toast.error(err.response?.data?.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const handleSignCheck = async (weekNo) => {
        try {
            const data = await firstAidAPI.checkWeek(checklistId, weekNo);
            setChecklist(data);
            toast.success(`Week ${weekNo} Checked/Signed successfully.`);
        } catch (err) {
            console.error('Failed to sign check:', err);
            toast.error(err.response?.data?.message || 'Failed to sign check.');
        }
    };

    const handleSignReview = async (weekNo) => {
        if (!isAdminOrHod) {
            toast.error('Only Admin or HOD users can review checklist weeks.');
            return;
        }
        try {
            const data = await firstAidAPI.reviewWeek(checklistId, weekNo);
            setChecklist(data);
            toast.success(`Week ${weekNo} Reviewed/Approved successfully.`);
        } catch (err) {
            console.error('Failed to sign review:', err);
            toast.error(err.response?.data?.message || 'Failed to sign review.');
        }
    };

    // Add Medicine directly on sheet
    const handleAddMedicine = () => {
        setSheetNewProductName('');
        setSheetNewProductGenericName('');
        setSheetNewProductPurpose('');
        setShowAddSheetMedicineModal(true);
    };

    const submitAddSheetMedicine = async (e) => {
        e.preventDefault();
        if (!sheetNewProductName.trim()) {
            toast.error('Please enter product name.');
            return;
        }
        try {
            const product = await firstAidAPI.addProduct({
                name: sheetNewProductName.trim(),
                genericName: sheetNewProductGenericName.trim(),
                purpose: sheetNewProductPurpose.trim()
            });
            const newItem = {
                product_id: product._id,
                product_name: product.name,
                generic_name: product.generic_name || '',
                purpose: product.purpose || '',
                expiry_date: '',
                week1_qty: '',
                week2_qty: '',
                week3_qty: '',
                week4_qty: '',
                week5_qty: '',
                remarks: ''
            };
            const updated = [...itemsState, newItem];
            setItemsState(updated);
            await firstAidAPI.updateChecklist(checklistId, { items: updated, responsibility });
            toast.success(`"${sheetNewProductName.trim()}" added to checklist.`);
            setShowAddSheetMedicineModal(false);
        } catch (err) {
            console.error('Failed to add medicine:', err);
            toast.error('Failed to add medicine.');
        }
    };

    // Edit Medicine directly on sheet
    const handleEditMedicine = (index) => {
        const item = itemsState[index];
        setSheetEditProduct(item);
        setSheetEditProductName(item.product_name || '');
        setSheetEditProductGenericName(item.generic_name || '');
        setSheetEditProductPurpose(item.purpose || '');
        setSheetEditProductIndex(index);
        setShowEditSheetMedicineModal(true);
    };

    const submitEditSheetMedicine = async (e) => {
        e.preventDefault();
        if (!sheetEditProductName.trim()) {
            toast.error('Please enter product name.');
            return;
        }
        try {
            if (sheetEditProduct.product_id) {
                await firstAidAPI.updateProduct(sheetEditProduct.product_id, {
                    name: sheetEditProductName.trim(),
                    genericName: sheetEditProductGenericName.trim(),
                    purpose: sheetEditProductPurpose.trim()
                });
            }
            const updated = [...itemsState];
            updated[sheetEditProductIndex] = {
                ...updated[sheetEditProductIndex],
                product_name: sheetEditProductName.trim(),
                generic_name: sheetEditProductGenericName.trim(),
                purpose: sheetEditProductPurpose.trim()
            };
            setItemsState(updated);
            await firstAidAPI.updateChecklist(checklistId, { items: updated, responsibility });
            toast.success("Medicine details updated.");
            setShowEditSheetMedicineModal(false);
        } catch (err) {
            console.error('Failed to update medicine details:', err);
            toast.error('Failed to update medicine details.');
        }
    };

    // Delete Medicine directly on sheet
    const handleDeleteMedicine = (index) => {
        const item = itemsState[index];
        setDialogState({
            open: true,
            type: 'confirm',
            message: `Are you sure you want to remove "${item.product_name}" from this checklist?`,
            inputValue: '',
            onConfirm: async () => {
                try {
                    const updated = itemsState.filter((_, idx) => idx !== index);
                    setItemsState(updated);
                    await firstAidAPI.updateChecklist(checklistId, { items: updated, responsibility });
                    toast.success("Medicine removed.");
                } catch (err) {
                    console.error('Failed to remove medicine:', err);
                    toast.error('Failed to remove medicine.');
                }
            }
        });
    };

    const getWeekCheckInfo = (weekNo) => {
        return checklist?.checked_by_weeks?.find(w => w.week_no === weekNo);
    };

    const getWeekReviewInfo = (weekNo) => {
        return checklist?.reviewed_by_weeks?.find(w => w.week_no === weekNo);
    };

    const handleExportExcel = () => {
        try {
            const data = [];
            data.push(['First Aid Kit Medicine List', '', '', '', '', '', '', '', '', 'Doc No : RI/HR/S/01 Rev No :08 & 20.12.2024', '']);
            data.push([
                `Area :`, checklist.area,
                `Responsibility:`, '', '', checklist.responsibility,
                `Month:`, checklist.month, '', '', ''
            ]);
            data.push([`Note :`, `Check the expiry date and availability of medicines during verification`, '', '', '', '', '', '', '', '', '']);
            data.push(['S.No', 'Medicine Name', 'Generic Name', 'Used For (Purpose)', 'Expiry Date', 'Week1', 'Week2', 'Week3', 'Week4', 'Week5', 'Remarks']);
            
            itemsState.forEach((item, index) => {
                data.push([
                    index + 1,
                    item.product_name,
                    item.generic_name || '-',
                    item.purpose || '-',
                    item.expiry_date || '-',
                    item.week1_qty || '-',
                    item.week2_qty || '-',
                    item.week3_qty || '-',
                    item.week4_qty || '-',
                    item.week5_qty || '-',
                    item.remarks || ''
                ]);
            });
            
            const dateRow = ['Date ', '', '', '', ''];
            [1, 2, 3, 4, 5].forEach(w => {
                const check = getWeekCheckInfo(w);
                dateRow.push(check && check.date ? new Date(check.date).toLocaleDateString('en-GB') : '-');
            });
            dateRow.push('');
            data.push(dateRow);
            
            const checkedByRow = ['Checked By', '', '', '', ''];
            [1, 2, 3, 4, 5].forEach(w => {
                const check = getWeekCheckInfo(w);
                checkedByRow.push(check ? check.user_name : '-');
            });
            checkedByRow.push('');
            data.push(checkedByRow);
            
            const reviewedByRow = ['Reviewed By', '', '', '', ''];
            [1, 2, 3, 4, 5].forEach(w => {
                const review = getWeekReviewInfo(w);
                reviewedByRow.push(review ? review.user_name : '-');
            });
            reviewedByRow.push('');
            data.push(reviewedByRow);

            const worksheet = XLSX.utils.aoa_to_sheet(data);
            
            worksheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
                { s: { r: 0, c: 9 }, e: { r: 0, c: 10 } },
                { s: { r: 1, c: 2 }, e: { r: 1, c: 4 } },
                { s: { r: 1, c: 7 }, e: { r: 1, c: 10 } },
                { s: { r: 2, c: 1 }, e: { r: 2, c: 10 } },
                { s: { r: data.length - 3, c: 0 }, e: { r: data.length - 3, c: 4 } },
                { s: { r: data.length - 2, c: 0 }, e: { r: data.length - 2, c: 4 } },
                { s: { r: data.length - 1, c: 0 }, e: { r: data.length - 1, c: 4 } }
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "First Aid Kit");
            XLSX.writeFile(workbook, `First_Aid_Checklist_${checklist.area}_${checklist.month}.xlsx`);
            toast.success('Excel downloaded successfully!');
        } catch (err) {
            console.error('Failed to export Excel:', err);
            toast.error('Failed to export Excel.');
        }
    };

    const handleExportPDF = async () => {
        if (!sheetRef.current) return;
        try {
            toast.loading("Generating PDF...", { id: "pdf-gen" });
            const canvas = await html2canvas(sheetRef.current, {
                scale: 2,
                useCORS: true
            });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("l", "mm", "a4");
            const width = pdf.internal.pageSize.getWidth();
            const height = pdf.internal.pageSize.getHeight();
            const imgWidth = width;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (imgHeight <= height) {
                pdf.addImage(imgData, "PNG", 0, 0, width, imgHeight);
            } else {
                pdf.addImage(imgData, "PNG", 0, 0, width, height);
            }

            pdf.save(`First_Aid_Checklist_${checklist.area}_${checklist.month}.pdf`);
            toast.success("PDF downloaded successfully!", { id: "pdf-gen" });
        } catch (err) {
            console.error("Failed to export PDF:", err);
            toast.error("Failed to export PDF.", { id: "pdf-gen" });
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <CircularProgress color="primary" />
            </div>
        );
    }

    if (!checklist) {
        return (
            <div className="firstaid-metadata-card" style={{ textAlign: 'center', padding: '40px' }}>
                <h3>Checklist not found.</h3>
                <button className="btn-firstaid" onClick={onBack}>
                    Back to List
                </button>
            </div>
        );
    }

    return (
        <div className="firstaid-content-wrapper">
            {/* Header section */}
            <div className="firstaid-header">
                <div className="firstaid-title-area">
                    <h1 className="firstaid-title">First Aid Kit Medicine Checklist</h1>
                    <div className="firstaid-subtitle">
                        Doc No: RI/HR/S/01 Rev No: 08 | 20.12.2024
                    </div>
                </div>
                <div className="firstaid-btn-group">
                    <button className="btn-firstaid" onClick={onBack}>
                        &larr; Back
                    </button>
                    {isEditing ? (
                        <>
                            <button className="btn-firstaid" onClick={() => {
                                setItemsState(checklist.items || []);
                                setResponsibility(checklist.responsibility || '');
                                setIsEditing(false);
                            }} disabled={saving}>
                                Cancel
                            </button>
                            <button className="btn-firstaid btn-firstaid-primary" onClick={handleSave} disabled={saving}>
                                <SaveIcon fontSize="inherit" /> Save Changes
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="btn-firstaid" onClick={handleExportExcel}>
                                <FileDownloadIcon fontSize="inherit" /> Export Excel
                            </button>
                            <button className="btn-firstaid" onClick={handleExportPDF}>
                                <PictureAsPdfIcon fontSize="inherit" /> Export PDF
                            </button>
                            <button className="btn-firstaid btn-firstaid-primary" onClick={() => setIsEditing(true)}>
                                <EditIcon fontSize="inherit" /> Edit Sheet
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Print Area Sheet Card */}
            <div ref={sheetRef} className="firstaid-sheet-card">
                {/* Compact Metadata Row */}
                <div className="firstaid-metadata-card">
                    <div className="firstaid-meta-item">
                        <span className="firstaid-meta-label">Area</span>
                        <span className="firstaid-meta-value">{checklist.area}</span>
                    </div>
                    <div className="firstaid-meta-item">
                        <span className="firstaid-meta-label">Month</span>
                        <span className="firstaid-meta-value">
                            {moment(checklist.month, 'YYYY-MM').format('MMMM YYYY')}
                        </span>
                    </div>
                    <div className="firstaid-meta-item">
                        <span className="firstaid-meta-label">Responsibility</span>
                        {isEditing ? (
                            <input
                                type="text"
                                className="firstaid-cell-input"
                                value={responsibility}
                                onChange={(e) => setResponsibility(e.target.value)}
                                style={{ height: '30px', padding: '4px 8px' }}
                            />
                        ) : (
                            <span className="firstaid-meta-value">{checklist.responsibility}</span>
                        )}
                    </div>
                    <div className="firstaid-meta-item">
                        <span className="firstaid-meta-label">Last Updated</span>
                        <span className="firstaid-meta-value" style={{ color: '#475569', fontWeight: 500 }}>
                            {checklist.updatedAt ? moment(checklist.updatedAt).format('DD/MM/YYYY hh:mm A') : moment().format('DD/MM/YYYY hh:mm A')}
                        </span>
                    </div>
                </div>

                {/* Subtle blue Info Banner */}
                <div className="firstaid-info-banner">
                    <InfoIcon fontSize="small" />
                    <span>Please check the expiry date and availability of medicines during verification.</span>
                </div>

                {/* Checklist Table */}
                <div className="firstaid-table-container">
                    <table className="firstaid-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px', textAlign: 'center' }}>S.No</th>
                                <th>Medicine Name</th>
                                <th>Generic Name</th>
                                <th>Used For (Purpose)</th>
                                <th style={{ width: '120px' }}>Expiry Date</th>
                                {[1, 2, 3, 4, 5].map((w, i) => (
                                    <th key={w} style={{ width: '100px', textAlign: 'center' }}>
                                        Week {w}
                                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 400, marginTop: '2px' }}>
                                            {mondays[i] ? `(${mondays[i].format('DD MMM')})` : ''}
                                        </div>
                                    </th>
                                ))}
                                <th>Remarks</th>
                                {isAdminOrHod && <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {itemsState.map((item, idx) => (
                                <tr key={item._id || idx}>
                                    <td style={{ textAlign: 'center', fontWeight: 500, color: '#64748b' }}>{idx + 1}</td>
                                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.product_name}</td>
                                    <td style={{ color: '#475569' }}>{item.generic_name || '—'}</td>
                                    <td style={{ color: '#475569', fontSize: '12px' }}>{item.purpose || '—'}</td>
                                    <td>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                className="firstaid-cell-input"
                                                value={item.expiry_date || ''}
                                                onChange={(e) => handleCellChange(idx, 'expiry_date', e.target.value)}
                                                placeholder="MM/YYYY or -"
                                            />
                                        ) : (
                                            <span>{item.expiry_date || '-'}</span>
                                        )}
                                    </td>
                                    {[1, 2, 3, 4, 5].map(w => {
                                        const field = `week${w}_qty`;
                                        return (
                                            <td key={w} style={{ textAlign: 'center' }}>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className="firstaid-cell-input"
                                                        style={{ textAlign: 'center' }}
                                                        value={item[field] || ''}
                                                        onChange={(e) => handleCellChange(idx, field, e.target.value)}
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 600 }}>{item[field] || '-'}</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                className="firstaid-cell-input"
                                                value={item.remarks || ''}
                                                onChange={(e) => handleCellChange(idx, 'remarks', e.target.value)}
                                                placeholder="Remarks"
                                            />
                                        ) : (
                                            <span style={{ color: '#64748b' }}>{item.remarks || '-'}</span>
                                        )}
                                    </td>
                                    {isAdminOrHod && (
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => handleEditMedicine(idx)}
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb' }}
                                                    title="Edit Medicine Name"
                                                >
                                                    <EditIcon fontSize="small" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMedicine(idx)}
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}
                                                    title="Remove Medicine"
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}

                            {/* Footer - Date Row */}
                            <tr className="firstaid-footer-row" style={{ borderTop: '2px solid #e2e8f0' }}>
                                <td colSpan={5} style={{ textAlign: 'right', paddingRight: '24px', fontWeight: 600 }}>Date</td>
                                {[1, 2, 3, 4, 5].map((w, i) => {
                                    const check = getWeekCheckInfo(w);
                                    return (
                                        <td key={w} style={{ textAlign: 'center', fontSize: '12px', color: '#0f172a', fontWeight: 700 }}>
                                            {check && check.date ? moment(check.date).format('DD/MM/YYYY') : '-'}
                                        </td>
                                    );
                                })}
                                <td></td>
                                {isAdminOrHod && <td></td>}
                            </tr>

                            {/* Footer - Checked By Row */}
                            <tr className="firstaid-footer-row">
                                <td colSpan={5} style={{ textAlign: 'right', paddingRight: '24px', fontWeight: 600 }}>Checked By</td>
                                {[1, 2, 3, 4, 5].map(w => {
                                    const check = getWeekCheckInfo(w);
                                    return (
                                        <td key={w} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            {check ? (
                                                <div className="firstaid-signed-info">
                                                    <span className="firstaid-signed-badge">
                                                        <CheckCircleOutlineIcon fontSize="inherit" style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                                                        {check.user_name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <button
                                                    className="firstaid-sign-button"
                                                    onClick={() => handleSignCheck(w)}
                                                    disabled={isEditing}
                                                >
                                                    Sign
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                                <td></td>
                                {isAdminOrHod && <td></td>}
                            </tr>

                            {/* Footer - Reviewed By Row */}
                            <tr className="firstaid-footer-row">
                                <td colSpan={5} style={{ textAlign: 'right', paddingRight: '24px', fontWeight: 600 }}>Reviewed By</td>
                                {[1, 2, 3, 4, 5].map(w => {
                                    const review = getWeekReviewInfo(w);
                                    const check = getWeekCheckInfo(w);
                                    return (
                                        <td key={w} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            {review ? (
                                                <div className="firstaid-signed-info">
                                                    <span className="firstaid-reviewed-badge">
                                                        <VerifiedIcon fontSize="inherit" style={{ marginRight: '2px', verticalAlign: 'middle' }} />
                                                        {review.user_name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <button
                                                    className="firstaid-sign-button"
                                                    onClick={() => handleSignReview(w)}
                                                    disabled={isEditing || !check}
                                                    title={!check ? 'Must be checked first' : ''}
                                                >
                                                    Review
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                                <td></td>
                                {isAdminOrHod && <td></td>}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Actions Row */}
            {isAdminOrHod && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                        className="btn-firstaid btn-firstaid-primary"
                        onClick={handleAddMedicine}
                        style={{ padding: '10px 18px', fontSize: '13px' }}
                    >
                        <AddIcon fontSize="inherit" /> Add Medicine
                    </button>
                </div>
            )}

            {/* Custom dialog/prompt Modal */}
            {dialogState.open && (
                <div className="firstaid-modal-overlay">
                    <div className="firstaid-modal" style={{ maxWidth: '420px' }}>
                        <div className="firstaid-modal-header">
                            <span className="firstaid-modal-title">
                                {dialogState.type === 'prompt' ? 'Input Required' : 'Confirm Action'}
                            </span>
                            <button className="firstaid-modal-close" onClick={() => setDialogState({ open: false })}>&times;</button>
                        </div>
                        <div className="firstaid-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
                                {dialogState.message}
                            </p>
                            {dialogState.type === 'prompt' && (
                                <input
                                    type="text"
                                    className="firstaid-cell-input"
                                    value={dialogState.inputValue}
                                    onChange={(e) => setDialogState({ ...dialogState, inputValue: e.target.value })}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            if (dialogState.onConfirm) {
                                                dialogState.onConfirm(dialogState.inputValue);
                                            }
                                            setDialogState({ open: false });
                                        }
                                    }}
                                />
                            )}
                        </div>
                        <div className="firstaid-modal-footer">
                            <button
                                type="button"
                                className="btn-firstaid btn-firstaid-secondary"
                                onClick={() => setDialogState({ open: false })}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-firstaid btn-firstaid-primary"
                                onClick={() => {
                                    if (dialogState.onConfirm) {
                                        dialogState.onConfirm(dialogState.inputValue);
                                    }
                                    setDialogState({ open: false });
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Medicine Modal (on sheet) */}
            {showAddSheetMedicineModal && (
                <div className="firstaid-modal-overlay">
                    <div className="firstaid-modal" style={{ maxWidth: '450px' }}>
                        <div className="firstaid-modal-header">
                            <span className="firstaid-modal-title">Add Medicine to Checklist</span>
                            <button className="firstaid-modal-close" onClick={() => setShowAddSheetMedicineModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={submitAddSheetMedicine}>
                            <div className="firstaid-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="firstaid-form-group">
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Medicine Name</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={sheetNewProductName}
                                        onChange={(e) => setSheetNewProductName(e.target.value)}
                                        placeholder="e.g. Paracetamol Tablets IP 500 mg"
                                        required
                                    />
                                </div>
                                <div className="firstaid-form-group">
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Generic Name</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={sheetNewProductGenericName}
                                        onChange={(e) => setSheetNewProductGenericName(e.target.value)}
                                        placeholder="e.g. Paracetamol"
                                    />
                                </div>
                                <div className="firstaid-form-group">
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Used For (Purpose)</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={sheetNewProductPurpose}
                                        onChange={(e) => setSheetNewProductPurpose(e.target.value)}
                                        placeholder="e.g. Fever, headache, body pain"
                                    />
                                </div>
                            </div>
                            <div className="firstaid-modal-footer">
                                <button type="button" className="btn-firstaid btn-firstaid-secondary" onClick={() => setShowAddSheetMedicineModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-firstaid btn-firstaid-primary">
                                    Add Medicine
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Medicine Modal (on sheet) */}
            {showEditSheetMedicineModal && (
                <div className="firstaid-modal-overlay">
                    <div className="firstaid-modal" style={{ maxWidth: '450px' }}>
                        <div className="firstaid-modal-header">
                            <span className="firstaid-modal-title">Edit Medicine Details</span>
                            <button className="firstaid-modal-close" onClick={() => setShowEditSheetMedicineModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={submitEditSheetMedicine}>
                            <div className="firstaid-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="firstaid-form-group">
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Medicine Name</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={sheetEditProductName}
                                        onChange={(e) => setSheetEditProductName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="firstaid-form-group">
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Generic Name</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={sheetEditProductGenericName}
                                        onChange={(e) => setSheetEditProductGenericName(e.target.value)}
                                    />
                                </div>
                                <div className="firstaid-form-group">
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Used For (Purpose)</label>
                                    <input
                                        type="text"
                                        className="firstaid-input"
                                        value={sheetEditProductPurpose}
                                        onChange={(e) => setSheetEditProductPurpose(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="firstaid-modal-footer">
                                <button type="button" className="btn-firstaid btn-firstaid-secondary" onClick={() => setShowEditSheetMedicineModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-firstaid btn-firstaid-primary">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FirstAidChecklistForm;

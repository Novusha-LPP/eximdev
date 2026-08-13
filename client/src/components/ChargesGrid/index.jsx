import React, { useState } from 'react';
import TabBar from './TabBar';
import Toolbar from './Toolbar';
import ChargesTable from './ChargesTable';
import AddChargeModal from './AddChargeModal';
import EditChargeModal from './EditChargeModal';
import FileUploadModal from './FileUploadModal';
import ConfirmDialog from './ConfirmDialog';
import MultiPurchaseBookModal from './MultiPurchaseBookModal';
import { useCharges } from './useCharges';
import './charges.css';
import axios from 'axios';

const ChargesGrid = ({ 
  parentId, 
  parentModule, 
  readOnly = false, 
  initialTab = 'particulars', 
  hideTabs = false, 
  shippingLineAirline = '', 
  importerName = '',
  jobNumber = '',
  jobDisplayNumber = '',
  jobYear = '',
  invoiceNumber = '',
  invoiceDate = '',
  invoiceValue = '',
  cthNo = '',
  jobStatus = '',
  billNo = '',
  workMode = 'Payment',
  awbBlNo = '',
  awbBlDate = ''
}) => {
  const { charges, loading, error, addChargesBulk, updateCharge, deleteCharge } = useCharges(parentId, parentModule);
  
  // Get user role for locking logic
  const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
  const role = (user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isHOD = role === "head_of_department" || role === "hod";
  const isAuthorized = isAdmin || isHOD;

  const isJobCompleted = jobStatus?.toUpperCase() === 'COMPLETED';
  
  // Lock if bill generated (any part of comma-separated bill_no)
  const billNos = (billNo || "").split(",");
  const hasBillGenerated = billNos.some(no => no && no.trim().length > 0);
  
  const roleName = (user?.role || "").toLowerCase();
  const isAuth = roleName === "admin" || roleName === "head_of_department" || roleName === "hod";
  const isLocked = (isJobCompleted || hasBillGenerated) && !isAuth;
  const readOnlyFinal = readOnly || isLocked;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCharges, setEditingCharges] = useState([]);
  
  const [fileModalCharge, setFileModalCharge] = useState(null); // { charge: object, tab: 'revenue' | 'cost' | 'particulars' }
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [multiPbChargesData, setMultiPbChargesData] = useState(null);

  const handleMultiPurchaseBook = async () => {
    const selectedCharges = charges.filter(c => selectedIds.has(c._id));
    if (selectedCharges.length < 2) {
      alert("Please select at least 2 charges to create a combined Purchase Book.");
      return;
    }

    // Check if any selected charge already has a PB
    const existingPb = selectedCharges.filter(c => c.purchase_book_no);
    if (existingPb.length > 0) {
      alert(`The following charge(s) already have a Purchase Book Entry:\n${existingPb.map(c => `• ${c.chargeHead} (${c.purchase_book_no})`).join('\n')}\n\nPlease unselect them before proceeding.`);
      return;
    }

    // Validate that all selected charges have cost partyName
    const missingParty = selectedCharges.filter(c => !c.cost?.partyName);
    if (missingParty.length > 0) {
      alert(`The following charge(s) are missing supplier/party name in Cost section:\n${missingParty.map(c => `• ${c.chargeHead}`).join('\n')}`);
      return;
    }

    // Validate that all selected charges belong to the same supplier/party
    const normalize = (str) => (str || '').toString().replace(/[^a-z0-9]/gi, '').toUpperCase();
    const firstPartyNorm = normalize(selectedCharges[0].cost.partyName);
    const mismatchedParty = selectedCharges.filter(c => normalize(c.cost.partyName) !== firstPartyNorm);
    if (mismatchedParty.length > 0) {
      alert(`All selected charges must belong to the SAME supplier/party.\n\nFirst supplier: "${selectedCharges[0].cost.partyName}"\nMismatched charges:\n${mismatchedParty.map(c => `• ${c.chargeHead}: "${c.cost.partyName}"`).join('\n')}`);
      return;
    }

    // Validate that all selected charges have the SAME Supplier Invoice Number (if filled)
    const setInvNumbers = [...new Set(selectedCharges.map(c => (c.invoice_number || c.cost?.invoiceNo || '').toString().trim()).filter(Boolean))];
    if (setInvNumbers.length > 1) {
      alert(`All selected charges must have the SAME Supplier Invoice Number.\n\nMismatched Supplier Invoice Numbers found:\n${setInvNumbers.map(n => `• "${n}"`).join('\n')}\n\nPlease ensure the supplier invoice number is common across selected charges before creating a combined Purchase Book.`);
      return;
    }

    // Validate that all selected charges have the SAME Supplier Invoice Date (if filled)
    const setInvDates = [...new Set(selectedCharges.map(c => (c.invoice_date || c.cost?.invoiceDate || '').toString().trim()).filter(Boolean))];
    if (setInvDates.length > 1) {
      alert(`All selected charges must have the SAME Supplier Invoice Date.\n\nMismatched Supplier Invoice Dates found:\n${setInvDates.map(d => `• "${d}"`).join('\n')}\n\nPlease ensure the supplier invoice date is common across selected charges before creating a combined Purchase Book.`);
      return;
    }

    // Fetch party directory details for the supplier
    let partyDetails = null;
    const targetPartyName = selectedCharges[0].cost.partyName;
    try {
      const [slRes, supRes, orgRes, cfsRes, transRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_STRING}/get-shipping-lines`),
        axios.get(`${process.env.REACT_APP_API_STRING}/get-suppliers`),
        axios.get(`${process.env.REACT_APP_API_STRING}/organization`),
        axios.get(`${process.env.REACT_APP_API_STRING}/get-cfs-list`),
        axios.get(`${process.env.REACT_APP_API_STRING}/get-transporters`)
      ]);
      const allParties = [
        ...(slRes.data || []),
        ...(supRes.data || []),
        ...(orgRes.data?.organizations || []),
        ...(cfsRes.data || []),
        ...(transRes.data || [])
      ];
      const allMatches = allParties.filter(p => normalize(p.name || p.organization) === firstPartyNorm);
      partyDetails = allMatches.find(p => p.branches?.length > 0 && p.branches[0]?.gst) || allMatches[0];
    } catch (err) {
      console.error("Failed to fetch party directory details:", err);
    }

    // Construct structured array for MultiPurchaseBookModal
    const formattedData = selectedCharges.map(c => {
      const cost = c.cost || {};
      const rate = parseFloat(cost.gstRate) || 18;
      const amt = parseFloat(cost.amount) || 0;
      const includeGst = cost.isGst || false;

      let basic = parseFloat(cost.basicAmount);
      let totalGst = parseFloat(cost.gstAmount);

      if (isNaN(basic)) {
        if (includeGst) {
          basic = amt / (1 + (rate / 100));
          totalGst = amt - basic;
        } else {
          basic = amt;
          totalGst = amt * (rate / 100);
        }
      }

      const branch = partyDetails?.branches?.[cost.branchIndex || 0] || {};
      const isGujarat = branch.gst?.startsWith('24');

      if (c.category === 'Reimbursement') {
        basic = amt;
        totalGst = 0;
      }

      const revenue = c.revenue || {};
      return {
        partyName: targetPartyName,
        chargeHeading: c.category === 'Margin' ? (targetPartyName || '') : `NEW - ${targetPartyName}`,
        partyDetails,
        amount: amt,
        basicAmount: basic,
        gstAmount: totalGst,
        gstRate: (c.category === 'Reimbursement') ? 0 : rate,
        cgst: isGujarat ? totalGst / 2 : 0,
        sgst: isGujarat ? totalGst / 2 : 0,
        igst: !isGujarat ? totalGst : 0,
        tdsAmount: cost.tdsAmount,
        netPayable: cost.netPayable,
        rate: cost.rate,
        totalAmount: cost.totalAmount,
        revenueAmount: revenue.amount,
        revenueBasicAmount: revenue.basicAmount,
        revenueGstAmount: revenue.gstAmount,
        revenueGstRate: revenue.gstRate,
        revenueCgst: revenue.cgst,
        revenueSgst: revenue.sgst,
        revenueIgst: revenue.igst,
        revenueTotal: revenue.amountINR || revenue.totalAmount || revenue.amount,
        revenuePartyName: revenue.partyName,
        chargeHead: c.chargeHead,
        invoice_number: c.invoice_number,
        invoice_date: c.invoice_date,
        cthNo: c.sacHsn || cthNo,
        jobDisplayNumber,
        branchIndex: cost.branchIndex || 0,
        chargeId: c._id,
        jobId: parentId,
        chargeHeadCategory: c.category,
        chargeDescription: cost.chargeDescription || '',
        tdsCategory: cost.tdsCategory || '94C',
        tdsPercent: cost.tdsPercent || 0,
        awbBlNo: awbBlNo
      };
    });

    setMultiPbChargesData(formattedData);
  };

  const handleSelectCharge = (id) => {
    const newSel = new Set(selectedIds);
    if (newSel.has(id)) newSel.delete(id);
    else {
      // Check if this specific charge is locked
      const charge = charges.find(c => c._id === id);
      const role = (user?.role || "").toLowerCase();
      const isAuth = role === "admin" || role === "head_of_department" || role === "hod";
      const isIndividualLocked = (charge?.payment_request_no || charge?.purchase_book_no) && !isAuth;
      
      if (!isIndividualLocked) {
        newSel.add(id);
      }
    }
    setSelectedIds(newSel);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // If not authorized, only select charges that don't have PR/PB
      const selectable = charges.filter(c => {
        const role = (user?.role || "").toLowerCase();
        const isAuth = role === "admin" || role === "head_of_department" || role === "hod";
        const isIndividualLocked = (c.payment_request_no || c.purchase_book_no) && !isAuth;
        return !isIndividualLocked;
      });
      setSelectedIds(new Set(selectable.map(c => c._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleAddSelected = async (selectedHeads) => {
    const newCharges = selectedHeads.map(head => {
      let finalName = head.name;
      const upperName = finalName.toUpperCase();

      if (upperName === 'SHIPPING LINE CHARGES' && shippingLineAirline) {
        finalName = shippingLineAirline;
      } else if ((upperName === 'DETENTION CHARGES' || upperName === 'DETENSION CHARGES') && shippingLineAirline) {
        finalName = `DETN.${shippingLineAirline}`;
      } else if (upperName === 'SECURITY DEPOSIT' && shippingLineAirline) {
        finalName = `SECU.DEPO.${shippingLineAirline}`;
      } else if (upperName === 'DAMAGE CHARGES' && shippingLineAirline) {
        finalName = `DAMAGE.${shippingLineAirline}`;
      }
      return {
        parentId,
        parentModule,
        chargeHead: finalName,
        category: head.category,
        isPurchaseBookMandatory: head.isPurchaseBookMandatory,
        sacHsn: head.sacHsn || '',
        revenue: {
          isGst: true,
          isTds: !!head.tdsCategory,
          tdsPercent: head.tdsCategory ? 2 : 0,
          tdsCategory: head.tdsCategory || ''
        },
        cost: {
          isGst: true,
          isTds: !!head.tdsCategory,
          tdsPercent: head.tdsCategory ? 2 : 0,
          tdsCategory: head.tdsCategory || ''
        },
        copyToCost: true
      };
    });
    await addChargesBulk(newCharges);
    setIsAddOpen(false);
  };

  const handleAddHeading = async () => {
    const headingName = window.prompt("Enter heading name (e.g., DOCUMENTATION CHARGES):");
    if (!headingName) return;

    const newHeading = {
      parentId,
      parentModule,
      chargeHead: headingName.toUpperCase(),
      isHeader: true,
      category: 'Header'
    };

    await addChargesBulk([newHeading]);
  };

  const handleSaveEdit = async (updatedCharges, shouldClose = true) => {
    for (const charge of updatedCharges) {
      await updateCharge(charge._id, charge);
    }
    if (shouldClose) {
      setEditingCharges([]);
      setSelectedIds(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    setConfirmState({
      open: true,
      title: 'Delete Charges',
      message: `Are you sure you want to delete ${selectedIds.size} selected charges? This action cannot be undone.`,
      onConfirm: async () => {
        for (const id of selectedIds) {
          await deleteCharge(id);
        }
        setSelectedIds(new Set());
        setConfirmState(prev => ({ ...prev, open: false }));
      }
    });
  };

  const handleAttachFiles = async (data, type = 'general') => {
    if (fileModalCharge) {
      const { charge } = fileModalCharge;
      const updateData = {};
      const isShippingLine = charge.chargeHead?.trim().toUpperCase() === shippingLineAirline?.trim().toUpperCase();

      if (isShippingLine && type === 'bulk') {
        updateData.revenue = { 
          ...(charge.revenue || {}), 
          url_draft: data.draft || [],
          url_final: data.final || [],
          url: [] 
        };
        updateData.cost = { 
          ...(charge.cost || {}), 
          url_draft: data.draft || [],
          url_final: data.final || [],
          url: [] 
        };
      } else {
        let targetField = 'url';
        if (isShippingLine) {
          if (type === 'draft') targetField = 'url_draft';
          else if (type === 'final') targetField = 'url_final';
          else targetField = 'url_draft'; // fallback for shipping line
        }

        updateData.revenue = { 
          ...(charge.revenue || {}), 
          [targetField]: data 
        };
        updateData.cost = { 
          ...(charge.cost || {}), 
          [targetField]: data 
        };

        if (isShippingLine) {
          updateData.revenue.url = [];
          updateData.cost.url = [];
        }
      }
      
      await updateCharge(charge._id, updateData);
      setFileModalCharge(null);
    }
  };

  const handleRemoveAttachment = async (charge, tab, newUrls) => {
    const updateData = {};
    // Synchronize 'url' (attachments) between revenue and cost
    // Note: In table view we only show/remove 'url' (General), 
    // for draft/final users use the Edit modal for better management.
    updateData.revenue = { ...(charge.revenue || {}), url: newUrls };
    updateData.cost = { ...(charge.cost || {}), url: newUrls };
    await updateCharge(charge._id, updateData);
  };

  const isDeleteDisabled = selectedIds.size === 0 || readOnlyFinal;

  return (
    <div className="charges-comp-wrapper">
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      
      {!hideTabs && <TabBar activeTab={activeTab} onTabChange={setActiveTab} />}
      
      <Toolbar 
         onAddCharge={() => setIsAddOpen(true)}
         onAddHeading={handleAddHeading}
         onDeleteSelected={handleDeleteSelected}
         readOnly={readOnlyFinal}
         isDeleteDisabled={isDeleteDisabled}
         onMultiPurchaseBook={selectedIds.size >= 2 ? handleMultiPurchaseBook : null}
      />
      
      <div style={{ position: 'relative' }}>
        {loading && <div style={{ position:'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#5580a8', zIndex: 10 }} />}
        <ChargesTable 
          charges={charges}
          activeTab={activeTab}
          selectedIds={selectedIds}
          onSelectCharge={handleSelectCharge}
          onSelectAll={handleSelectAll}
          onOpenFileModal={(charge, tab) => setFileModalCharge({ charge, tab })}
          onRemoveAttachment={handleRemoveAttachment}
          onEditCharge={(charge) => setEditingCharges([charge])}
          readOnly={readOnlyFinal}
          isLocked={isLocked}
          readOnlyBase={readOnly}
          isAuthorized={isAuthorized}
        />
      </div>

      <AddChargeModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onAddSelected={handleAddSelected}
      />

      {editingCharges.length > 0 && (
        <EditChargeModal
          isOpen={editingCharges.length > 0}
          selectedCharges={editingCharges}
          onClose={() => setEditingCharges([])}
          onSave={handleSaveEdit}
          updateCharge={updateCharge}
          parentId={parentId}
          shippingLineAirline={shippingLineAirline}
          importerName={importerName}
          jobNumber={jobNumber}
          jobDisplayNumber={jobDisplayNumber}
          jobYear={jobYear}
          invoiceNumber={invoiceNumber}
          invoiceDate={invoiceDate}
          invoiceValue={invoiceValue}
          cthNo={cthNo}
          awbBlNo={awbBlNo}
          awbBlDate={awbBlDate}
          isAuthorized={isAuthorized}
          workMode={workMode}
          readOnly={readOnlyFinal}
          isLocked={isLocked}
          readOnlyBase={readOnly}
        />
      )}

      <MultiPurchaseBookModal
        isOpen={multiPbChargesData !== null}
        onClose={() => setMultiPbChargesData(null)}
        chargesData={multiPbChargesData}
        jobNumber={jobNumber}
        jobDisplayNumber={jobDisplayNumber}
        jobYear={jobYear}
        awbBlNo={awbBlNo}
        awbBlDate={awbBlDate}
        onSuccess={async (entryNo) => {
          if (multiPbChargesData && multiPbChargesData.length > 0) {
            for (const c of multiPbChargesData) {
              if (c.chargeId) {
                await updateCharge(c.chargeId, {
                  purchase_book_no: entryNo,
                  purchase_book_status: 'Pending'
                });
              }
            }
          }
          setSelectedIds(new Set());
          setMultiPbChargesData(null);
        }}
      />

      {fileModalCharge && (
        <FileUploadModal 
          isOpen={!!fileModalCharge}
          onClose={() => setFileModalCharge(null)}
          chargeLabel={`${fileModalCharge.charge.chargeHead} (${fileModalCharge.tab})`}
          showTypeSelection={fileModalCharge.charge.chargeHead?.trim().toUpperCase() === shippingLineAirline?.trim().toUpperCase()}
          initialUrls={
            fileModalCharge.tab === 'cost' 
              ? [
                  ...(fileModalCharge.charge.cost?.url || []),
                  ...(fileModalCharge.charge.cost?.url_draft || []),
                  ...(fileModalCharge.charge.cost?.url_final || [])
                ]
              : [
                  ...(fileModalCharge.charge.revenue?.url || []),
                  ...(fileModalCharge.charge.revenue?.url_draft || []),
                  ...(fileModalCharge.charge.revenue?.url_final || [])
                ]
          }
          categorizedUrls={
            fileModalCharge.tab === 'cost' 
              ? { 
                  draft: [
                    ...(fileModalCharge.charge.cost?.url || []),
                    ...(fileModalCharge.charge.cost?.url_draft || [])
                  ], 
                  final: fileModalCharge.charge.cost?.url_final || [] 
                }
              : { 
                  draft: [
                    ...(fileModalCharge.charge.revenue?.url || []),
                    ...(fileModalCharge.charge.revenue?.url_draft || [])
                  ], 
                  final: fileModalCharge.charge.revenue?.url_final || [] 
                }
          }
          onAttach={handleAttachFiles}
        />
      )}

      <ConfirmDialog 
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default ChargesGrid;

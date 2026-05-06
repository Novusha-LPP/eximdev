import React, { useState } from 'react';
import axios from 'axios';
import TabBar from './TabBar';
import Toolbar from './Toolbar';
import ChargesTable from './ChargesTable';
import AddChargeModal from './AddChargeModal';
import EditChargeModal from './EditChargeModal';
import FileUploadModal from './FileUploadModal';
import PurchaseBookModal from './PurchaseBookModal';
import ConfirmDialog from './ConfirmDialog';
import { useCharges } from './useCharges';
import './charges.css';

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
  branch_code = '',
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
  const { charges, loading, error, fetchCharges, addChargesBulk, updateCharge, deleteCharge } = useCharges(parentId, parentModule);
  
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
  const [bulkPurchaseBookData, setBulkPurchaseBookData] = useState(null);
  const [shippingLines, setShippingLines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [generalOrgs, setGeneralOrgs] = useState([]);
  const [cfsList, setCfsList] = useState([]);
  const [transporters, setTransporters] = useState([]);

  React.useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [slRes, supRes, orgRes, genOrgRes, cfsRes, transRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_STRING}/get-shipping-lines`),
          axios.get(`${process.env.REACT_APP_API_STRING}/get-suppliers`),
          axios.get(`${process.env.REACT_APP_API_STRING}/organization`),
          axios.get(`${process.env.REACT_APP_API_STRING}/get-general-orgs`),
          axios.get(`${process.env.REACT_APP_API_STRING}/get-cfs-list`),
          axios.get(`${process.env.REACT_APP_API_STRING}/get-transporters`)
        ]);
        setShippingLines(slRes.data);
        setSuppliers(supRes.data);
        setOrganizations(orgRes.data.organizations || []);
        setGeneralOrgs(genOrgRes.data);
        setCfsList(cfsRes.data);
        setTransporters(transRes.data);
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMasterData();
  }, []);

  const findPartyDetails = (row) => {
    const partyName = row.cost?.partyName;
    const partyType = row.cost?.partyType?.toUpperCase();
    const normName = partyName?.trim().toUpperCase();

    let searchList = [];
    if (partyType === 'TRANSPORTER') searchList = transporters;
    else if (partyType === 'VENDOR') searchList = suppliers;
    else if (partyType === 'IMPORTER' || partyType === 'CUSTOMER') searchList = organizations;
    else if (partyType === 'AGENT' || partyType === 'OTHERS') searchList = shippingLines;
    else if (partyType === 'CFS') searchList = cfsList;
    else if (partyType === 'GENERAL ORG') searchList = generalOrgs;

    let partyDetails = searchList.find(p => p.name?.trim().toUpperCase() === normName);
    if (!partyDetails) {
      const allParties = [...shippingLines, ...suppliers, ...organizations, ...cfsList, ...transporters, ...generalOrgs];
      partyDetails = allParties.find(p => p.name?.trim().toUpperCase() === normName);
    }
    return partyDetails;
  };

  const [fileModalCharge, setFileModalCharge] = useState(null); // { charge: object, tab: 'revenue' | 'cost' | 'particulars' }
  const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null });

  const handleSelectCharge = (id) => {
    const newSel = new Set(selectedIds);
    if (newSel.has(id)) newSel.delete(id);
    else {
      // Check if this specific charge is locked
      const charge = charges.find(c => c._id === id);
      const hasPR = charge?.payment_request_no && charge?.payment_request_status !== 'Rejected';
      const hasPB = charge?.purchase_book_no && charge?.purchase_book_status !== 'Rejected';
      const isIndividualLocked = hasPR || hasPB;
      
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
        const hasPR = c.payment_request_no && c.payment_request_status !== 'Rejected';
        const hasPB = c.purchase_book_no && c.purchase_book_status !== 'Rejected';
        return !(hasPR || hasPB);
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
        revenue: { isGst: true, partyType: 'Customer', partyName: importerName || '' },
        cost: { isGst: true },
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

  const handleBulkPB = () => {
    const selected = charges.filter(c => selectedIds.has(c._id));
    if (selected.length === 0) {
      alert("Please select at least one charge.");
      return;
    }

    // Collect all charges that don't have a PB yet or were rejected
    const eligible = selected.filter(row => !row.purchase_book_no || row.purchase_book_status === 'Rejected');
    if (eligible.length === 0) {
      alert("Selected charges already have a Purchase Book entry.");
      return;
    }

    // Check if they all have the same vendor
    const firstVendor = eligible[0].cost?.partyName;
    const sameVendor = eligible.every(c => c.cost?.partyName === firstVendor);
    if (!sameVendor) {
       if (!window.confirm("Selected charges have different vendors. Are you sure you want to group them?")) return;
    }

    const firstRow = eligible[0];
    const mappedCharges = eligible.map(row => {
        const cost = row.cost || {};
        const rate = parseFloat(cost.gstRate) || 18;
        const amt = parseFloat(cost.amount || cost.amountINR) || 0;
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

        const isReimbursement = (row.category || '').toUpperCase() === 'REIMBURSEMENT' || row.isReimbursement;
        if (isReimbursement) {
          basic = amt;
          totalGst = 0;
        }

        const partyDetails = findPartyDetails(row);
        const branch = partyDetails?.branches?.[cost.branchIndex || 0] || {};
        const isGujarat = branch.gst?.startsWith('24');

        return {
          chargeHeading: row.chargeHead,
          descriptionOfServices: row.category === 'Margin' ? row.chargeHead : (row.cost?.partyName ? `NEW ${row.cost.partyName}` : row.chargeHead),
          chargeId: row._id,
          taxableValue: basic,
          gstPercent: isReimbursement ? 0 : rate,
          cgst: isGujarat ? totalGst / 2 : 0,
          sgst: isGujarat ? totalGst / 2 : 0,
          igst: !isGujarat ? totalGst : 0,
          tdsAmount: cost.tdsAmount || 0,
          netPayable: cost.netPayable || (basic + (isReimbursement ? 0 : totalGst) - (cost.tdsAmount || 0)),
          totalAmount: basic + (isReimbursement ? 0 : totalGst),
          chargeDescription: row.cost?.chargeDescription || '',
          chargeHeadCategory: row.category,
          tdsCategory: row.cost?.tdsCategory || '94C',
          jobId: parentId,
          chargeRef: row._id,
          jobRef: parentId
        };
    });

    const partyDetails = findPartyDetails(firstRow);
    setBulkPurchaseBookData({
      partyName: firstVendor,
      partyDetails,
      charges: mappedCharges,
      invoice_number: firstRow.invoice_number,
      invoice_date: firstRow.invoice_date,
      cthNo: cthNo,
      jobDisplayNumber,
      branchIndex: firstRow.cost?.branchIndex || 0,
      jobId: parentId,
      awbBlNo: awbBlNo,
      awbBlDate: awbBlDate
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
         onBulkPB={handleBulkPB}
         readOnly={readOnlyFinal}
         isDeleteDisabled={isDeleteDisabled}
         isBulkPBDisabled={selectedIds.size < 2}
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
          fetchCharges={fetchCharges}
          parentId={parentId}
          shippingLineAirline={shippingLineAirline}
          importerName={importerName}
          jobNumber={jobNumber}
          jobDisplayNumber={jobDisplayNumber}
          jobYear={jobYear}
          branch_code={branch_code}
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

      <PurchaseBookModal 
        isOpen={bulkPurchaseBookData !== null}
        onClose={() => setBulkPurchaseBookData(null)}
        initialData={bulkPurchaseBookData}
        jobNumber={jobNumber}
        jobDisplayNumber={jobDisplayNumber}
        jobYear={jobYear}
        awbBlNo={awbBlNo}
        awbBlDate={awbBlDate}
        onSuccess={async (entryNo) => {
          // Update all selected charges
          const initialStatus = 'Pending';
          const ids = Array.from(selectedIds);
          for (const id of ids) {
            await updateCharge(id, { 
              purchase_book_no: entryNo, 
              purchase_book_status: initialStatus 
            }, true);
          }
          await fetchCharges();
          setSelectedIds(new Set());
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

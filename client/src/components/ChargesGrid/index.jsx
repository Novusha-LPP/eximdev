import React, { useState } from 'react';
import TabBar from './TabBar';
import Toolbar from './Toolbar';
import ChargesTable from './ChargesTable';
import AddChargeModal from './AddChargeModal';
import EditChargeModal from './EditChargeModal';
import FileUploadModal from './FileUploadModal';
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
        revenue: { isGst: true },
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

  const handleAttachFiles = async (urls) => {
    if (fileModalCharge) {
      const { charge } = fileModalCharge;
      const updateData = {};
      
      // Synchronize 'url' (attachments) between revenue and cost
      updateData.revenue = { ...(charge.revenue || {}), url: urls };
      updateData.cost = { ...(charge.cost || {}), url: urls };
      
      await updateCharge(charge._id, updateData);
      setFileModalCharge(null);
    }
  };

  const handleRemoveAttachment = async (charge, tab, newUrls) => {
    const updateData = {};
    // Synchronize 'url' (attachments) between revenue and cost
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

      {fileModalCharge && (
        <FileUploadModal 
          isOpen={!!fileModalCharge}
          onClose={() => setFileModalCharge(null)}
          chargeLabel={`${fileModalCharge.charge.chargeHead} (${fileModalCharge.tab})`}
          initialUrls={
            fileModalCharge.tab === 'cost' 
              ? fileModalCharge.charge.cost?.url || []
              : fileModalCharge.charge.revenue?.url || []
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

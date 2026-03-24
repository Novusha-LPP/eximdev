import React, { useState, useEffect } from 'react';
import { useChargeHeads } from './useChargeHeads';

const AddChargeModal = ({ isOpen, onClose, onAddSelected }) => {
  const { chargeHeads, fetchChargeHeads, addChargeHead } = useChargeHeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNames, setSelectedNames] = useState(new Set());
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchChargeHeads();
      setSearchTerm('');
      setCustomName('');
      setCustomCategory('');
      setSelectedNames(new Set());
    }
  }, [isOpen, fetchChargeHeads]);

  if (!isOpen) return null;

  const filteredHeads = chargeHeads.filter(h => h.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleToggle = (name) => {
    const newSelected = new Set(selectedNames);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedNames(newSelected);
  };

  const handleAddCustom = async () => {
    const name = customName.trim();
    const cat = customCategory || 'Miscellaneous';
    if (!name) { alert('Please enter a charge name.'); return; }
    if (chargeHeads.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      alert('A charge with this name already exists.');
      return;
    }
    const res = await addChargeHead(name, cat);
    if (res.success) {
      setCustomName('');
      setCustomCategory('');
      const newSelected = new Set(selectedNames);
      newSelected.add(name);
      setSelectedNames(newSelected);
    } else {
      alert(res.error || 'Error adding custom charge');
    }
  };

  const handleAddSelected = () => {
    // Collect the selected charge head objects and pass to parent
    const selectedCharges = chargeHeads.filter(ch => selectedNames.has(ch.name));
    onAddSelected(selectedCharges);
  };

  return (
    <div className="add-modal-overlay active">
      <div className="add-modal">
        <div className="add-modal-title">➕ Add Charge</div>
        <div className="add-modal-body">
          <div className="section-label">Search or select predefined charges</div>
          <div className="add-search-wrap">
            <span>🔍</span>
            <input 
              type="text" 
              placeholder="Type to filter charges..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          <div className="predefined-list">
            {filteredHeads.length === 0 ? (
              <div className="no-results">No matching charges found</div>
            ) : (
              filteredHeads.map(ch => {
                const isChecked = selectedNames.has(ch.name);
                return (
                  <label key={ch._id || ch.name} className={`predefined-item ${isChecked ? 'checked' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => handleToggle(ch.name)} 
                    />
                    <span className="predefined-item-name">{ch.name}</span>
                    <span className="predefined-item-cat">{ch.category}</span>
                  </label>
                );
              })
            )}
          </div>

          <div className="custom-charge-box">
            <div className="section-label">➕ Add Custom Charge</div>
            <div className="custom-row">
              <input 
                type="text" 
                placeholder="Enter charge name..." 
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <select 
                value={customCategory} 
                onChange={(e) => setCustomCategory(e.target.value)}
              >
                <option value="">-- Category --</option>
                <option>Freight</option>
                <option>Reimbursement</option>
                <option>Insurance</option>
                <option>Surcharge</option>
                <option>Transport</option>
                <option>Service Charge</option>
                <option>Customs</option>
                <option>Miscellaneous</option>
                <option>Document</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="add-custom-btn" onClick={handleAddCustom}>Add to List</button>
            </div>
          </div>
        </div>
        <div className="add-modal-footer">
          <span className="sel-count">{selectedNames.size ? `${selectedNames.size} charge${selectedNames.size > 1 ? 's' : ''} selected` : ''}</span>
          <button type="button" className="btn" onClick={handleAddSelected} disabled={selectedNames.size === 0}>Add Selected</button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AddChargeModal;

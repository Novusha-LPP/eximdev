import React, { useState, useEffect } from 'react';
import masterAPI from '../../../api/attendance/master.api';
import { FiMapPin, FiSearch, FiChevronDown } from 'react-icons/fi';
import './LocationDirectorySelect.css';

const LocationDirectorySelect = ({ onSelect, currentName }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await masterAPI.getDistinctLocations();
      if (response.success) {
        setLocations(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (loc) => {
    onSelect(loc);
    setShowDropdown(false);
    setSearchTerm('');
  };

  return (
    <div className="location-directory-select">
      <div 
        className={`select-trigger ${showDropdown ? 'active' : ''}`}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <FiMapPin className="pin-icon" />
        <span className="current-val">{currentName || 'Select from Directory...'}</span>
        <FiChevronDown className={`chevron ${showDropdown ? 'up' : ''}`} />
      </div>

      {showDropdown && (
        <div className="location-dropdown">
          <div className="search-box">
            <FiSearch />
            <input 
              type="text" 
              placeholder="Search directory..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="location-list">
            {loading ? (
              <div className="list-msg">Loading directory...</div>
            ) : filteredLocations.length > 0 ? (
              filteredLocations.map((loc, idx) => (
                <div 
                  key={idx} 
                  className="location-item"
                  onClick={() => handleSelect(loc)}
                >
                  <div className="loc-name">{loc.name}</div>
                  <div className="loc-coords">{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</div>
                </div>
              ))
            ) : (
              <div className="list-msg">No locations found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationDirectorySelect;

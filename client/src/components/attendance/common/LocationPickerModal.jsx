import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiSearch, FiX, FiCheck, FiNavigation } from 'react-icons/fi';
import './LocationPickerModal.css';

// Fix for default marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const LocationPickerModal = ({ isOpen, onClose, onConfirm, initialLocation }) => {
  const [position, setPosition] = useState(initialLocation || { lat: 23.2743, lng: 72.4210 });
  const [radius, setRadius] = useState(200);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Update position if initialLocation changes
  useEffect(() => {
    if (initialLocation?.lat && initialLocation?.lng) {
      setPosition(initialLocation);
    }
  }, [initialLocation]);

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
      },
    });

    return position ? (
        <>
            <Marker position={position} />
            <Circle center={position} radius={radius} pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.2 }} />
        </>
    ) : null;
  };

  const ChangeView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
  };

  const MapUpdater = () => {
    const map = useMap();
    useEffect(() => {
        // Invalidate size after a short delay to ensure the modal has fully rendered and animated
        setTimeout(() => {
            map.invalidateSize();
        }, 200);
    }, [map]);
    return null;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    const newPos = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setPosition(newPos);
    setSearchResults([]);
    setSearchQuery(result.display_name);
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="lp-modal-overlay">
      <div className="lp-modal-content">
        <div className="lp-header">
          <div className="lp-title">
            <FiMapPin color="#6366f1" />
            <h3>Select Office Location</h3>
          </div>
          <button className="lp-close" onClick={onClose}><FiX /></button>
        </div>

        <div className="lp-search-container">
          <form onSubmit={handleSearch} className="lp-search-bar">
            <FiSearch />
            <input 
              type="text" 
              placeholder="Search for a city, building, or area..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" disabled={searching}>
              {searching ? '...' : 'Search'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="lp-results">
              {searchResults.map((res, i) => (
                <div key={i} className="lp-result-item" onClick={() => selectSearchResult(res)}>
                  {res.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lp-map-wrapper">
          <MapContainer center={position} zoom={15} style={{ height: '400px', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker />
            <ChangeView center={position} />
            <MapUpdater />
          </MapContainer>
          
          <button className="lp-detect-btn" title="Detect My Location" onClick={detectLocation}>
            <FiNavigation />
          </button>
        </div>

        <div className="lp-footer">
          <div className="lp-coord-display">
            <div className="lp-coord-group">
                <span>Latitude</span>
                <strong>{position.lat.toFixed(6)}</strong>
            </div>
            <div className="lp-coord-group">
                <span>Longitude</span>
                <strong>{position.lng.toFixed(6)}</strong>
            </div>
            <div className="lp-radius-input">
                <span>Radius (m)</span>
                <input 
                    type="number" 
                    value={radius} 
                    onChange={(e) => setRadius(parseInt(e.target.value) || 0)} 
                    min="50"
                    max="1000"
                />
            </div>
          </div>
          <div className="lp-actions">
            <button className="lp-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="lp-btn-confirm" onClick={() => onConfirm({ ...position, radius_meters: radius })}>
              <FiCheck /> Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal icon for usage inside the modal
const FiMapPin = ({ color }) => (
    <svg 
        stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" 
        strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" 
        xmlns="http://www.w3.org/2000/svg" style={{ color }}
    >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>
);

export default LocationPickerModal;

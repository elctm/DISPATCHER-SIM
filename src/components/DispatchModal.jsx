import React, { useState, useEffect } from 'react';
import { classifications } from '../data/classifications.js';
import './DispatchModal.css';
import L from 'leaflet'; // We need leaflet to calculate distances

// It now accepts 'onGoToLocation' as a prop
export default function DispatchModal({ incident, availableUnits, recommendedUnitIds = [], onDispatch, onClose, onGoToLocation }) {
  const [selectedClassification, setSelectedClassification] = useState(incident.type || '');
  const [selectedUnitIds, setSelectedUnitIds] = useState(recommendedUnitIds);
  const [nearestUnitId, setNearestUnitId] = useState(null);
  const [preaviso, setPreaviso] = useState('');

  // --- NEW LOGIC: Calculate the nearest unit when the modal opens ---
  useEffect(() => {
    if (incident && availableUnits.length > 0) {
      let closestUnit = null;
      let minDistance = Infinity;
      const incidentLatLng = L.latLng(incident.location.lat, incident.location.lng);

      availableUnits.forEach(unit => {
        const unitLatLng = L.latLng(unit.lat, unit.lng);
        const distance = incidentLatLng.distanceTo(unitLatLng);
        if (distance < minDistance) {
          minDistance = distance;
          closestUnit = unit;
        }
      });

      if (closestUnit) {
        setNearestUnitId(closestUnit.id);
      }
    }
  }, [incident, availableUnits]);

  // Inicializa la selección solo al abrir el modal (cuando cambia el incidente)
  useEffect(() => {
    setSelectedUnitIds(recommendedUnitIds);
  }, [incident]);

  const handleUnitSelection = (unitId) => {
    setSelectedUnitIds(prev =>
      prev.includes(unitId)
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!preaviso.trim()) {
      alert('Debes escribir el mensaje 0-4 (preaviso) antes de despachar.');
      return;
    }
    if (selectedUnitIds.length > 0 && selectedClassification) {
      onDispatch(incident.id, selectedClassification, selectedUnitIds, preaviso);
      onClose();
    } else {
      alert('Please select a classification and at least one unit.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* --- NEW HEADER STRUCTURE WITH BUTTON --- */}
        <div className="modal-header">
          <h2>Dispatch to Incident #{`${incident.id}`.slice(-4)}</h2>
          <button className="btn-goto" onClick={() => onGoToLocation(incident.location)}>
            Go to Location
          </button>
        </div>
        <p>Location: {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}</p>
        
        <div className="call-description-box">
          <p className="call-description-title">Incoming Call Description:</p>
          <blockquote className="call-description-text">
            "{incident.description}"
          </blockquote>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="preaviso">Mensaje 0-4 (Preaviso):</label>
            <textarea
              id="preaviso"
              value={preaviso}
              onChange={e => setPreaviso(e.target.value)}
              required
              rows={2}
              placeholder="Ejemplo: 0-4 Preaviso para emergencia en ..."
              style={{ width: '100%', fontFamily: 'Roboto Mono, monospace', fontSize: '13px' }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="classification">Classification:</label>
            <select
              id="classification"
              value={selectedClassification}
              onChange={e => setSelectedClassification(e.target.value)}
              required
            >
              <option value="" disabled>Select a type...</option>
              {classifications.map(c => (
                <option key={c.code} value={c.code}>{c.code} - {c.description}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Available Units:</label>
            {/* --- NEW UI ELEMENT: The suggestion box --- */}
            {recommendedUnitIds.length > 0 && (
              <div className="suggestion-box">
                <strong>Recommended Units:</strong> {recommendedUnitIds.join(', ')}
              </div>
            )}
            {nearestUnitId && (
              <div className="suggestion-box">
                Nearest Unit: <strong>{nearestUnitId}</strong>
              </div>
            )}
            <div className="unit-selection-list">
              {availableUnits.map(unit => (
                <label key={unit.id} className="unit-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedUnitIds.includes(unit.id)}
                    onChange={() => handleUnitSelection(unit.id)}
                  />
                  {unit.id} ({unit.type})
                </label>
              ))}
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-dispatch">Dispatch Selected Units</button>
          </div>
        </form>
      </div>
    </div>
  );
}
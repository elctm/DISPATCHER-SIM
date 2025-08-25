import React, { useState } from 'react';
import { classifications } from '../data/classifications.js';
import './DispatchModal.css';

export default function DispatchModal({ incident, availableUnits, onDispatch, onClose }) {
  const [selectedClassification, setSelectedClassification] = useState('');
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);

  const handleUnitSelection = (unitId) => {
    setSelectedUnitIds(prev =>
      prev.includes(unitId)
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedUnitIds.length > 0 && selectedClassification) {
      onDispatch(incident.id, selectedClassification, selectedUnitIds);
      onClose();
    } else {
      alert('Please select a classification and at least one unit.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Dispatch to Incident #{`${incident.id}`.slice(-4)}</h2>
        <p>Location: {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}</p>
        
        <div className="call-description-box">
          <p className="call-description-title">Incoming Call Description:</p>
          <blockquote className="call-description-text">
            "{incident.description}"
          </blockquote>
        </div>

        <form onSubmit={handleSubmit}>
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
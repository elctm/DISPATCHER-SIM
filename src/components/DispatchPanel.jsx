import React from 'react';
import './DispatchPanel.css'; 

const DispatchPanel = ({ units, incidents, onSelectIncident }) => {
  return (
    <div className="dispatch-panel">
      <div className="panel-section unit-status-section">
        <h2>Unit Status</h2>
        <div className="unit-status-list">
          {units.map(unit => (
            <div key={unit.id} className={`unit-card status-${unit.status.replace(' ', '-')}`}>
              <span className="unit-id">{unit.id}</span>
              <span className="unit-status">{unit.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section active-incidents-section">
        <h2>Active Incidents</h2>
        <div className="active-incidents-list">
          {incidents.map(incident => (
            <button 
              key={incident.id} 
              className="incident-card as-button"
              onClick={() => onSelectIncident(incident.id)}
            >
              <div className="incident-info">
                <span className="incident-type">{incident.type || `Incident #${`${incident.id}`.slice(-4)}`}</span>
                <span className="incident-status">{incident.status}</span>
              </div>
            </button>
          ))}
          {incidents.length === 0 && <p className="no-incidents">No active incidents.</p>}
        </div>
      </div>
    </div>
  );
};

export default DispatchPanel;
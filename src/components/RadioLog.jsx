import React, { useState } from 'react';
import './UnitLogPanel.css'; // Reutilizamos estilos para el log

export default function RadioLog({ units }) {
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const activeUnits = units.filter(u => u.status !== 'Available' && u.status !== 'Out of Service');
  const selectedUnit = units.find(u => u.id === selectedUnitId);

  return (
    <div className="unit-log-panel" style={{ marginTop: '20px', background: '#111827', color: '#d1d5db', fontFamily: 'Roboto Mono, monospace', borderLeft: '1px solid #374151', borderRadius: '6px', boxShadow: '0 2px 8px 0 #00000022' }}>
      <h2 style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', borderBottom: '1px solid #374151', paddingBottom: '8px', marginTop: '5px', textAlign: 'center' }}>Radio Log</h2>
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="unit-select" style={{ fontWeight: 'bold', color: '#facc15', fontFamily: 'Roboto Mono, monospace' }}>Selecciona una unidad:</label>
        <select id="unit-select" value={selectedUnitId || ''} onChange={e => setSelectedUnitId(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #7f8c8d', backgroundColor: '#2c50', color: '#111', fontFamily: 'Roboto Mono, monospace', fontSize: '13px', marginTop: '5px' }}>
          <option value="">-- Selecciona --</option>
          {activeUnits.map(unit => (
            <option key={unit.id} value={unit.id}>{unit.id} ({unit.type})</option>
          ))}
        </select>
      </div>
      {selectedUnit ? (
        <div className="unit-log-card">
          <div className="unit-log-header">
            <span className="unit-log-id">{selectedUnit.id}</span>
            <span className={`unit-log-status status-${selectedUnit.status.replace(' ', '-')}`}>{selectedUnit.status}</span>
            <span className="unit-log-crew">👥 Crew: {selectedUnit.crew}</span>
          </div>
          <div className="unit-log-messages">
            {console.log('Estado del log a renderizar:', selectedUnit.log)}
            {selectedUnit.log && selectedUnit.log.length === 0 ? (
              <p className="log-entry empty-log">Sin mensajes aún.</p>
            ) : (
              selectedUnit.log && selectedUnit.log
                .filter(entry => ['6-0', '6-1', '0-5', '6-3', '6-7', '6-9', '6-10'].includes(entry.type))
                .map((entry, index) => (
                  <div key={index} className={`log-entry${index % 2 === 0 ? ' even' : ' odd'}`}>
                    <span className="log-timestamp">{entry.timestamp}</span>
                    <span className="log-message">
                      <strong>{selectedUnit.id}:</strong> {entry.message}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      ) : (
        <p style={{ color: '#6b7280', fontStyle: 'italic', marginTop: '20px' }}>Selecciona una unidad para ver sus mensajes 6-0.</p>
      )}
    </div>
  );
}

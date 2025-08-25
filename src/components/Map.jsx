// src/components/Map.jsx

import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const engineIcon = new L.Icon({
  iconUrl: '/icons/fire-truck.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35]
});

// For the quick fix, we can create placeholder icons that just reuse the engine icon.
const rescueIcon = engineIcon;
const ladderIcon = engineIcon;

// This helper function will now work for all types
const getUnitIcon = (unitType) => {
  switch (unitType) {
    case 'Engine':
      return engineIcon;
    case 'Rescue':
      return rescueIcon;
    case 'Ladder':
      return ladderIcon;
    default:
      return engineIcon; 
  }
};

export default function Map({ units, stations, incidents }) {
  const mapCenter = [-33.447, -70.603];

  return (
    <MapContainer center={mapCenter} zoom={14} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* Station Markers */}
      {stations.map(station => (
        <Marker key={`station-${station.id}`} position={station.coords}>
          <Popup>Station: {station.id}</Popup>
        </Marker>
      ))}

      {/* Unit Markers with Custom Icons */}
      {units.map(unit => (
        <Marker 
          key={`unit-${unit.id}`} 
          position={[unit.lat, unit.lng]}
          icon={getUnitIcon(unit.type)}
        >
          <Popup>Unit: {unit.id} - Status: {unit.status}</Popup>
        </Marker>
      ))}

      {/* Incident Markers */}
      {incidents.map(incident => (
        incident.location && (
          <Marker
            key={`incident-${incident.id}`}
            position={[incident.location.lat, incident.location.lng]}
          >
            <Popup>Incident: {incident.type} - Status: {incident.status}</Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
}
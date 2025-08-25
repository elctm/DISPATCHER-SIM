import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const engineIcon = new L.Icon({
  iconUrl: '/icons/fire-truck.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35]
});
const rescueIcon = engineIcon;
const ladderIcon = engineIcon;

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

// --- NEW HELPER COMPONENT to get control of the map ---
function MapController({ setMapInstance }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      setMapInstance(map);
    }
  }, [map, setMapInstance]);
  return null;
}

// The component now accepts 'setMapInstance' as a prop
export default function Map({ units, stations, incidents, setMapInstance }) {
  const mapCenter = [-33.447, -70.603];

  return (
    <MapContainer center={mapCenter} zoom={14} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {stations.map(station => (
        <Marker key={`station-${station.id}`} position={station.coords}>
          <Popup>Station: {station.id}</Popup>
        </Marker>
      ))}
      {units.map(unit => (
        <Marker 
          key={`unit-${unit.id}`} 
          position={[unit.lat, unit.lng]}
          icon={getUnitIcon(unit.type)}
        >
          <Popup>Unit: {unit.id} - Status: {unit.status}</Popup>
        </Marker>
      ))}
      {incidents.map(incident => (
        incident.location && (
          <Marker
            key={`incident-${incident.id}`}
            position={[incident.location.lat, incident.location.lng]}
          >
            <Popup>Incident: {incident.type || 'Unclassified'} - Status: {incident.status}</Popup>
          </Marker>
        )
      ))}
      {/* This new component gives App.jsx control over the map */}
      <MapController setMapInstance={setMapInstance} />
    </MapContainer>
  );
}
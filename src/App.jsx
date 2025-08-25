import React, { useState, useEffect } from "react";
import Map from "./components/Map.jsx";
import DispatchPanel from "./components/DispatchPanel.jsx";
import DispatchModal from "./components/DispatchModal.jsx";
import { units as initialUnits } from "./data/units.js";
import { stations } from "./data/stations.js";
import { callDescriptions } from "./data/call-descriptions.js";
import "./App.css";
import L from "leaflet";
import "leaflet-routing-machine";

const stationUnitCounter = {};
const offsetAmount = 0.00018;
const enrichedUnits = initialUnits.map(unit => {
  const station = stations.find(s => s.id === unit.station);
  if (!station) {
    console.warn(`Warning: Station "${unit.station}" not found for unit "${unit.id}".`);
    return { ...unit, lat: null, lng: null };
  }
  const count = stationUnitCounter[unit.station] || 0;
  const lngWithOffset = station.coords[1] + (count * offsetAmount);
  stationUnitCounter[unit.station] = count + 1;
  return {
    ...unit,
    lat: station.coords[0],
    lng: lngWithOffset,
    destination: null,
  };
}).filter(unit => unit.lat !== null);

const movementIntervals = {};

const playSound = (audioFile) => {
  if (!audioFile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioFile);
    audio.addEventListener('ended', resolve);
    audio.addEventListener('error', (e) => reject(e));
    audio.play().catch(error => reject(error));
  });
};

export default function App() {
  const [units, setUnits] = useState(enrichedUnits);
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  // --- NEW STATE to hold the map instance ---
  const [mapInstance, setMapInstance] = useState(null);

  const initiateUnitMovement = (unit, incident) => {
    if (movementIntervals[unit.id]) { clearInterval(movementIntervals[unit.id]); }

    const startPos = L.latLng(unit.lat, unit.lng);
    const endPos = L.latLng(incident.location.lat, incident.location.lng);
    const routingControl = L.Routing.control({
      waypoints: [startPos, endPos],
      routeWhileDragging: false, addWaypoints: false, draggableWaypoints: false,
      fitSelectedRoutes: false, show: false, createMarker: () => null
    });

    routingControl.on('routesfound', function (e) {
      const route = e.routes[0];
      const smoothPath = createSmoothPath(route.coordinates, 20);
      const durationMilliseconds = (route.summary.totalDistance / (60 * 1000 / 3600)) * 1000;
      const delay = Math.max(16, durationMilliseconds / smoothPath.length);

      let currentStep = 0;
      movementIntervals[unit.id] = setInterval(() => {
        if (currentStep >= smoothPath.length) {
          clearInterval(movementIntervals[unit.id]);
          setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, status: "On Scene", lat: endPos.lat, lng: endPos.lng } : u));
          setIncidents(prev => prev.map(i => i.id === incident.id ? { ...i, status: "On Scene" } : i));
          setTimeout(() => {
            setIncidents(prev => prev.filter(i => i.id !== incident.id));
            const homeStation = stations.find(s => s.id === unit.station);
            if (homeStation) {
              setUnits(prev =>
                prev.map(u =>
                  u.id === unit.id
                    ? { ...u, status: "Available", lat: homeStation.coords[0], lng: homeStation.coords[1] }
                    : u
                )
              );
            }
          }, 20000);
          return;
        }
        const nextPos = smoothPath[currentStep];
        setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, lat: nextPos.lat, lng: nextPos.lng } : u));
        currentStep++;
      }, delay);
    });
    routingControl.route();
  };

  const handleDispatchSubmit = async (incidentId, classification, selectedUnitIds) => {
    const targetIncident = incidents.find(inc => inc.id === incidentId);
    if (!targetIncident) return;

    setIncidents(prev =>
      prev.map(inc =>
        inc.id === incidentId ? { ...inc, type: classification, status: "Dispatched" } : inc
      )
    );

    for (const unitId of selectedUnitIds) {
      const unitToDispatch = units.find(u => u.id === unitId);
      if (unitToDispatch) {
        setUnits(prev =>
          prev.map(u =>
            u.id === unitId ? { ...u, status: "En Route" } : u
          )
        );
        initiateUnitMovement(unitToDispatch, targetIncident);

        const unitStation = stations.find(s => s.id === unitToDispatch.station);
        if (unitStation && unitStation.tone) {
          await playSound(unitStation.tone);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  // --- NEW FUNCTION to control the map's view ---
  const handleGoToLocation = (location) => {
    if (mapInstance && location) {
      mapInstance.flyTo([location.lat, location.lng], 16);
    }
  };

  const selectedIncident = incidents.find(inc => inc.id === selectedIncidentId);

  useEffect(() => {
    let initialTimerId;
    let incidentTimer;

    const incidentLoop = async () => {
      await generateNewIncident();
      const minDelay = 20000;
      const maxDelay = 90000;
      const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
      incidentTimer = setTimeout(incidentLoop, randomDelay);
    };

    const generateNewIncident = async () => {
      try {
        const randomStation = stations[Math.floor(Math.random() * stations.length)];
        const randomLatOffset = (Math.random() - 0.5) * 0.02;
        const randomLngOffset = (Math.random() - 0.5) * 0.02;
        const incidentLocation = { lat: randomStation.coords[0] + randomLatOffset, lng: randomStation.coords[1] + randomLngOffset };
        const response = await fetch('http://localhost:3001/api/generate-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incidentLocation),
        });
        if (!response.ok) { throw new Error(`Network response was not ok (status: ${response.status})`); }
        const data = await response.json();
        const aiDescription = data.description;
        if (aiDescription) {
          const newIncident = {
            id: Date.now(),
            description: aiDescription,
            correctClassification: "",
            type: "",
            status: "Unassigned",
            location: incidentLocation,
          };
          setIncidents(prevIncidents => [...prevIncidents, newIncident]);
        }
      } catch (error) {
        console.error("Failed to fetch new incident description:", error);
      }
    };
    
    initialTimerId = setTimeout(incidentLoop, 2000);
    return () => {
      clearTimeout(initialTimerId);
      clearTimeout(incidentTimer);
    };
  }, []);

  return (
    <div className="app-container">
      <DispatchPanel
        units={units}
        incidents={incidents}
        onSelectIncident={setSelectedIncidentId}
      />
      <div className="map-container">
        <Map
          units={units}
          stations={stations}
          incidents={incidents}
          setMapInstance={setMapInstance}
        />
      </div>

      {selectedIncident && (
        <DispatchModal
          incident={selectedIncident}
          availableUnits={units.filter(u => u.status === 'Available')}
          onDispatch={handleDispatchSubmit}
          onClose={() => setSelectedIncidentId(null)}
          onGoToLocation={handleGoToLocation}
        />
      )}
    </div>
  );
}

function createSmoothPath(originalPath, stepDistance) {
  const smoothPath = [];
  if (originalPath.length < 2) return originalPath;
  for (let i = 0; i < originalPath.length - 1; i++) {
    const start = originalPath[i];
    const end = originalPath[i + 1];
    const segmentDistance = L.latLng(start).distanceTo(L.latLng(end));
    smoothPath.push(L.latLng(start.lat, start.lng));
    const steps = Math.floor(segmentDistance / stepDistance);
    for (let j = 1; j <= steps; j++) {
      const fraction = j / (steps + 1);
      const interpolatedLat = start.lat + (end.lat - start.lat) * fraction;
      const interpolatedLng = start.lng + (end.lng - start.lng) * fraction;
      smoothPath.push(L.latLng(interpolatedLat, interpolatedLng));
    }
  }
  smoothPath.push(originalPath[originalPath.length - 1]);
  return smoothPath;
}
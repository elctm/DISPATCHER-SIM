import React, { useState, useEffect } from "react";
import Map from "./components/Map.jsx";
import DispatchPanel from "./components/DispatchPanel.jsx";
import DispatchModal from "./components/DispatchModal.jsx";
import RadioLog from './components/RadioLog.jsx';
import { units as initialUnits } from "./data/units.js";
import { stations } from "./data/stations.js";
import { callDescriptions } from "./data/call-descriptions.js";
import "./App.css";
import L from "leaflet";
import "leaflet-routing-machine";
import { generateRadioMessage } from './data/radio-messages.js';
import { cbnRadioMessages, generateCBNRadioMessage } from './data/cbn-radio-messages.js';
import { UnitStateManager } from './utils/unitStateManager.js';

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

// Recommended dispatch mapping by classification code
const recommendedDispatch = {
  '10-0': ['Water Engine', 'Water Engine', 'Ladder'], // Fire
  '10-1': ['Water Engine'], // Vehicle Fire
  '10-2': ['Water Engine'], // Trash/Grass Fire
  '10-3': ['Rescue'], // Rescue
  '10-4': ['Rescue', 'Water Engine'], // Vehicle Crash Rescue
  '10-5': ['Hazmat', 'Water Engine'], // Hazmat
  '10-6': ['Hazmat'], // Gas Leak
};

// Helper to get recommended unit IDs for an incident
function getRecommendedUnitIds(incident, availableUnits) {
  const types = recommendedDispatch[incident.type] || [];
  const selected = [];
  const used = new Set();
  types.forEach(type => {
    const unit = availableUnits.find(u => u.type === type && !used.has(u.id));
    if (unit) {
      selected.push(unit.id);
      used.add(unit.id);
    }
  });
  return selected;
}

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
  const [mapInstance, setMapInstance] = useState(null);
  const [recommendedUnitIds, setRecommendedUnitIds] = useState([]);
  // Estado para la cola de unidades a mover
  const [unitsToMove, setUnitsToMove] = useState([]);

  // Handles state changes for units, including smooth return after 6-7/6-9
  const handleUnitStateChange = (unitId, newState, message) => {
    if (newState === 'SituationControlled') {
      // Log 6-7 (situation controlled)
      setUnits(prev => prev.map(u => u.id === unitId ? { ...u, status: 'SituationControlled', log: [...u.log, message] } : u));
      // Log 6-9 (returning) and start return movement
      const unit = units.find(u => u.id === unitId);
      if (unit) {
        const stationObj = stations.find(s => s.id === unit.station);
        if (stationObj) {
          const returnMsg = {
            timestamp: new Date().toLocaleTimeString('en-GB'),
            message: `${unit.id} 6-9 regresando a cuartel`,
            type: '6-9',
            sender: unit.id
          };
          // Update status and log, do NOT set position to station!
          setUnits(prev => prev.map(u => u.id === unitId ? { ...u, status: 'Returning', log: [...u.log, returnMsg] } : u));
          // Animate movement from emergency (current position) to station using the same function as dispatch
          initiateUnitMovement(unit, { location: { lat: stationObj.coords[0], lng: stationObj.coords[1] } }, true, () => {
            // On arrival, set Available and log 6-10
            setUnits(prev => prev.map(u => {
              if (u.id === unitId) {
                const availableMsg = {
                  timestamp: new Date().toLocaleTimeString('en-GB'),
                  message: `${unit.id} 6-10 disponible, a cargo de ${unit.officer || 'Oficial'} 0-${unit.crew}`,
                  type: '6-10',
                  sender: unit.id
                };
                return {
                  ...u,
                  status: 'Available',
                  log: [...u.log, availableMsg]
                };
              }
              return u;
            }));
          });
        }
      }
    } else if (newState === 'Returning') {
      // For direct 'Returning' state, keep previous logic
      setUnits(prev => prev.map(u => {
        if (u.id === unitId) {
          return {
            ...u,
            status: newState,
            log: [...u.log, message]
          };
        }
        return u;
      }));
      const unit = units.find(u => u.id === unitId);
      if (unit) {
        const stationObj = stations.find(s => s.id === unit.station);
        if (stationObj) {
          initiateUnitMovement(unit, { location: { lat: stationObj.coords[0], lng: stationObj.coords[1] } }, true, () => {
            setUnits(prev => prev.map(u => {
              if (u.id === unitId) {
                const availableMsg = {
                  timestamp: new Date().toLocaleTimeString('en-GB'),
                  message: `${unit.id} 6-10 disponible, a cargo de ${unit.officer || 'Oficial'} 0-${unit.crew}`,
                  type: '6-10',
                  sender: unit.id
                };
                return {
                  ...u,
                  status: 'Available',
                  log: [...u.log, availableMsg]
                };
              }
              return u;
            }));
          });
        }
      }
    } else {
      // For other states, update normally
      setUnits(prev => prev.map(u => {
        if (u.id === unitId) {
          return {
            ...u,
            status: newState,
            log: [...u.log, message]
          };
        }
        return u;
      }));
    }
  };

  const getAiRadioMessage = async (eventType, unit, details) => {
    let prompt;
    const persona = "You are a radio operator for the Cuerpo de Bomberos de Ñuñoa, Chile. Generate a single, brief, and professional radio message based on the situation. Be creative but stay within protocol.";
    
    switch (eventType) {
      case 'ON_DISPATCH':
        prompt = `${persona} The unit ${unit.id} (crew of ${unit.crew}) is being dispatched to a "${details.classification}" emergency. The message must include the code "6-0".`;
        break;
      case 'ON_ARRIVAL':
        prompt = `${persona} The unit ${unit.id} has just arrived at the scene of a "${details.classification}". The message must include the code "6-3" and a brief initial assessment.`;
        break;
      case 'SITUATION_CONTROLLED':
        prompt = `${persona} The unit ${unit.id} reports the situation is under control at the "${details.classification}" incident. The message must include the code "6-7".`;
        break;
      case 'RETURNING_TO_STATION':
        prompt = `${persona} The unit ${unit.id} is returning to its station after controlling the incident. The message must include codes "6-9" and "6-10".`;
        break;
      default:
        return "Unknown event.";
    }

    try {
      const response = await fetch('http://localhost:3001/api/generate-radio-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) throw new Error('Network response was not ok.');
      const data = await response.json();
      return data.message.trim().replace(/"/g, '');
    } catch (error) {
      console.error("Failed to fetch AI message:", error);
      return `Error: Could not contact AI server. (${eventType})`;
    }
  };

  const addLogMessage = async (unitId, eventType, details = {}) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) {
      console.error(`addLogMessage failed: Unit with ID ${unitId} not found.`);
      return;
    }
    let message = '';
    let type = '';
    let sender = '';
    let officer = '';
    if (eventType === 'ON_DISPATCH') {
      // El mensaje 6-0 lo da la unidad
      type = '6-0';
      sender = unit.id;
      officer = unit.officer || 'Oficial';
      message = generateRadioMessage('6-0', unit, { officer });
    } else if (eventType === 'ON_ARRIVAL') {
      type = '6-3';
      sender = unit.id;
      officer = unit.officer || 'Oficial';
      message = generateRadioMessage('6-3', unit, { officer });
    } else if (eventType === 'SITUATION_CONTROLLED') {
      type = '6-7';
      sender = unit.id;
      officer = unit.officer || 'Oficial';
      message = generateRadioMessage('6-7', unit, { officer });
    } else if (eventType === 'RETURNING_TO_STATION') {
      type = '6-9';
      sender = unit.id;
      officer = unit.officer || 'Oficial';
      message = generateRadioMessage('6-9', unit, { officer });
    } else {
      type = 'INFO';
      sender = 'Central';
      message = details.message || '';
    }
    const timestamp = new Date().toLocaleTimeString('en-GB');
    setUnits(prevUnits =>
      prevUnits.map(u =>
        u.id === unitId
          ? { ...u, log: [...u.log, { timestamp, message, type, sender, officer }] }
          : u
      )
    );
    if (details.incidentId) {
      setIncidents(prevIncidents =>
        prevIncidents.map(inc =>
          inc.id === details.incidentId
            ? {
                ...inc,
                log: [...(inc.log || []), { timestamp, unitId, eventType, message, type, sender, officer }]
              }
            : inc
        )
      );
    }
  };

  const initiateUnitMovement = (unit, incident, isReturning = false) => {
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
      // Velocidad de movimiento: 60 km/h
      const speedKmh = 60;
      const speedMs = speedKmh * 1000 / 3600;
      const durationMilliseconds = (route.summary.totalDistance / speedMs);
      const delay = Math.max(16, durationMilliseconds / smoothPath.length);

      let currentStep = 0;
      movementIntervals[unit.id] = setInterval(() => {
        if (currentStep < smoothPath.length) {
          const nextPos = smoothPath[currentStep];
          setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, lat: nextPos.lat, lng: nextPos.lng } : u));
          currentStep++;
        } else {
          clearInterval(movementIntervals[unit.id]);
          delete movementIntervals[unit.id];
          // Solo al finalizar el recorrido, ejecutar el flujo de llegada
          if (isReturning) {
            const unitManager = new UnitStateManager(unit, null, handleUnitStateChange);
            unitManager.returnToStation().then(() => {
              if (typeof onArrival === 'function') {
                onArrival();
              }
            });
          } else {
            const unitManager = new UnitStateManager(unit, incident, handleUnitStateChange);
            unitManager.arriveOnScene().then(() => unitManager.workOnScene());
          }
        }
      }, delay);
    });
    routingControl.route();
  };

  const handleDispatchSubmit = async (incidentId, classification, selectedUnitIds, preaviso) => {
    const targetIncident = incidents.find(inc => inc.id === incidentId);
    if (!targetIncident) return;

    // Registrar el mensaje 0-4 en el log del incidente
    const preavisoLog = {
      timestamp: new Date().toLocaleTimeString('en-GB'),
      eventType: 'PREAVISO_0-4',
      message: preaviso,
      units: selectedUnitIds
    };
    setIncidents(prev =>
      prev.map(inc =>
        inc.id === incidentId
          ? { ...inc, type: classification, status: "Dispatched", log: [...(inc.log || []), preavisoLog, { timestamp: new Date().toLocaleTimeString('en-GB'), eventType: 'DISPATCH_CONFIRMED', units: selectedUnitIds }] }
          : inc
      )
    );

    // Registrar el mensaje 0-4 en el log de cada unidad despachada
    setUnits(prevUnits =>
      prevUnits.map(u =>
        selectedUnitIds.includes(u.id)
          ? { ...u, log: [...(u.log || []), preavisoLog] }
          : u
      )
    );

    // Actualizar todas las unidades seleccionadas primero
    const updatedUnits = units.map(unit => {
      if (selectedUnitIds.includes(unit.id)) {
        return {
          ...unit,
          status: "En Route",
          log: [
            ...(unit.log || []),
            {
              timestamp: new Date().toLocaleTimeString('en-GB'),
              message: `Unidad ${unit.id} despachada a ${classification} en ${targetIncident.description}. Confirme recepción y proceda. Código 6-0`,
              type: 'INFO',
              sender: 'Central'
            }
          ]
        };
      }
      return unit;
    });

    // Actualizar el estado con todas las unidades modificadas
    setUnits(updatedUnits);

    // Despachar cada unidad
    for (const unitId of selectedUnitIds) {
      const unitToDispatch = updatedUnits.find(u => u.id === unitId);
      if (unitToDispatch) {
        // Iniciar el movimiento
        initiateUnitMovement(unitToDispatch, targetIncident);

        // Agregar mensajes
        await addLogMessage(unitId, 'ON_DISPATCH', { classification, incidentId });
        logRadioMessage(unitId, '6-1');
        
        if (Math.random() < 0.1) {
          logRadioMessage(unitId, '0-5');
        }

        const unitStation = stations.find(s => s.id === unitToDispatch.station);
        if (unitStation && unitStation.tone) {
          await playSound(unitStation.tone);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  // Efecto para manejar el movimiento de unidades programadas
  useEffect(() => {
    if (unitsToMove.length > 0) {
      const { unitId, incident } = unitsToMove[0];
      const unit = units.find(u => u.id === unitId);
      if (unit) {
        initiateUnitMovement(unit, incident);
      }
      // Eliminar la unidad de la cola de movimiento
      setUnitsToMove(prev => prev.slice(1));
    }
  }, [unitsToMove, units]);

  const handleGoToLocation = (location) => {
    if (mapInstance && location) {
      mapInstance.flyTo([location.lat, location.lng], 16);
    }
  };

  const selectedIncident = incidents.find(inc => inc.id === selectedIncidentId);

  // When incident is selected, set recommended units
  useEffect(() => {
    if (selectedIncident) {
      const availableUnits = units.filter(u => u.status === 'Available');
      setRecommendedUnitIds(getRecommendedUnitIds(selectedIncident, availableUnits));
    } else {
      setRecommendedUnitIds([]);
    }
  }, [selectedIncident, units]);

  useEffect(() => {
    let initialTimerId;
    let incidentTimer;

    const incidentLoop = async () => {
  try {
    await generateNewIncident();
  } catch (err) {
    console.error("generateNewIncident crashed:", err);
  } finally {
    const minDelay = 20000;
    const maxDelay = 90000;
    const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
    incidentTimer = setTimeout(incidentLoop, randomDelay);
  }
};

    const generateNewIncident = async () => {
      const randomStation = stations[Math.floor(Math.random() * stations.length)];
      const randomLatOffset = (Math.random() - 0.5) * 0.02;
      const randomLngOffset = (Math.random() - 0.5) * 0.02;
      const incidentLocation = { lat: randomStation.coords[0] + randomLatOffset, lng: randomStation.coords[1] + randomLngOffset };;
      
      let aiDescription = "";

      try {
        const response = await fetch('http://localhost:3001/api/generate-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incidentLocation),
        });
        if (!response.ok) { 
          throw new Error(`Network response was not ok (status: ${response.status})`);
        }
        const data = await response.json();
        aiDescription = data.description;
        console.log("Fetched new incident from AI server.");
      } catch (error) {
        console.warn("AI server fetch failed. Using local fallback for incident description.");
        const randomCall = callDescriptions[Math.floor(Math.random() * callDescriptions.length)];
        aiDescription = randomCall.text;
      }
      
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
    };

    initialTimerId = setTimeout(() => {
      incidentLoop();
    }, 5000);

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
          recommendedUnitIds={recommendedUnitIds}
          onDispatch={handleDispatchSubmit}
          onClose={() => setSelectedIncidentId(null)}
          onGoToLocation={handleGoToLocation}
        />
      )}
      <RadioLog units={units} />
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

// Reemplazo el flujo de mensajes de emergencia para usar las claves oficiales
const EMERGENCY_FLOW = ['6-0', '6-1', '0-5', '6-3', '6-7', '6-9', '6-10'];

async function runEmergencyFlow(unitId, incident, options = {}) {
  const unit = units.find(u => u.id === unitId);
  if (!unit) return;
  let flow = [...EMERGENCY_FLOW];
  // Si no aplica 6-1, lo quitamos
  if (!options.include61) flow = flow.filter(code => code !== '6-1');
  // Si no aplica 0-5, lo quitamos
  if (!options.include05) flow = flow.filter(code => code !== '0-5');
  for (const code of flow) {
    const message = generateCBNRadioMessage(code, unit, {});
    const timestamp = new Date().toLocaleTimeString('en-GB');
    setUnits(prevUnits =>
      prevUnits.map(u =>
        u.id === unitId
          ? { ...u, log: [...u.log, { timestamp, message, type: code, sender: unit.id }] }
          : u
      )
    );
    await new Promise(resolve => setTimeout(resolve, 1000)); // Espera 1s entre mensajes
  }
}

// En cada cambio de estado relevante, agrega el mensaje al log de la unidad y al Radio Log
function logRadioMessage(unitId, code) {
  const unit = units.find(u => u.id === unitId);
  if (!unit) return;
  const message = generateCBNRadioMessage(code, unit, {});
  const timestamp = new Date().toLocaleTimeString('en-GB');
  setUnits(prevUnits =>
    prevUnits.map(u =>
      u.id === unitId
        ? { ...u, log: [...u.log, { timestamp, message, type: code, sender: unit.id }] }
        : u
    )
  );
}
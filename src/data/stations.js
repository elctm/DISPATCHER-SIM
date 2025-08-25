// src/data/stations.js

// Updated with corrected addresses and coordinates on August 25, 2025.
// Tones are included only for the first three companies as requested.

export const stations = [
  { 
    id: "Ñuñoa-1", 
    name: "1ª Compañía 'Bomba Ñuñoa'",
    coords: [-33.4474, -70.6015], // Capitán Orella #2164, Ñuñoa
    tone: "/tones/station-1.mp3" 
  },
  { 
    id: "Ñuñoa-2", 
    name: "2ª Compañía", // Name from image differs, using simpler one
    coords: [-33.4533, -70.6120], // Antonio Varas #2778, Ñuñoa
    tone: "/tones/station-2.mp3" 
  },
  { 
    id: "Ñuñoa-3", 
    name: "3ª Compañía 'Bomba Los Guindos'",
    // Address in image "Av. Ossa #430, Ñuñoa" is now La Reina. 
    // Using official CBÑ address for accuracy.
    coords: [-33.4402, -70.5623], // Av. Tobalaba 455, La Reina
    tone: "/tones/station-3.mp3" 
  },
  { 
    id: "Ñuñoa-4", 
    name: "4ª Compañía",
    coords: [-33.4549, -70.5731], // Echeñique #4257, Ñuñoa
  },
  { 
    id: "Ñuñoa-5", 
    name: "5ª Compañía 'Bomba Israel'",
    coords: [-33.4682, -70.5966], // Grecia #2483, Ñuñoa
  },
  { 
    id: "Ñuñoa-6", 
    name: "6ª Compañía 'Bomba La Reina'",
    coords: [-33.4651, -70.5186], // Echeñique #8605, La Reina
  },
  { 
    id: "Ñuñoa-7", 
    name: "7ª Compañía 'Bomba Macul'",
    coords: [-33.4988, -70.5898], // Luis Durand #3364, Macul
  },
  { 
    id: "Ñuñoa-8", 
    name: "8ª Compañía 'Bomba Peñalolén'",
    coords: [-33.4839, -70.5168], // Consistorial #2000, Peñalolén
  },
  { 
    id: "Ñuñoa-9", 
    name: "9ª Compañía 'Bomba La Florida'",
    coords: [-33.5283, -70.5899], // Vicuña Mackenna #8109, La Florida
  },
  { 
    id: "Ñuñoa-10", 
    name: "10ª Compañía",
    coords: [-33.5516, -70.5910], // Colombia #10547, La Florida
  },
  { 
    id: "Ñuñoa-11", 
    name: "11ª Compañía 'Bomba Las Perdices'",
    coords: [-33.5041, -70.5960], // Departamental #3283, La Florida
  }
];
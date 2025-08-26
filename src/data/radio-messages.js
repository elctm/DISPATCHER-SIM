// Diccionario de mensajes radiales CBÑ
// Puedes expandirlo con más claves y plantillas
export const radioMessages = {
  '6-0': 'CONFORME {unitId} A CARGO DE {officer} 0-{crewCount}',
  '6-3': '6-3 {unitId} en el lugar, a cargo de {officer} 0-{crewCount}',
  '6-7': '6-7 {unitId} situación controlada, a cargo de {officer} 0-{crewCount}',
  '6-9': '6-9 {unitId} en cuartel, a cargo de {officer} 0-{crewCount}',
  '6-10': '6-10 {unitId} disponible, a cargo de {officer} 0-{crewCount}',
  // Puedes agregar más claves aquí
};

// Función para generar el mensaje usando la plantilla y datos
export function generateRadioMessage(code, unit, extra = {}) {
  const template = radioMessages[code];
  if (!template) return '';
  // officer y crewCount pueden venir de IA o de los datos del unit
  const officer = extra.officer || 'Oficial';
  const crewCount = unit.crew || 0;
  return template
    .replace('{unitId}', unit.id)
    .replace('{officer}', officer)
    .replace('{crewCount}', crewCount);
}

// Función para generar el mensaje usando la plantilla y datos
export async function generateRadioMessageWithAI(code, unit, extra = {}) {
  // officer y crewCount pueden venir de IA o de los datos del unit
  let officer = extra.officer || 'Oficial';
  // Si no se especifica, pide el nombre por IA
  if (!extra.officer) {
    try {
      const prompt = `Genera solo el nombre completo de un oficial o voluntario para el carro ${unit.id} del Cuerpo de Bomberos de Ñuñoa.`;
      const response = await fetch('http://localhost:3001/api/generate-radio-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (response.ok) {
        const data = await response.json();
        officer = data.message.trim().replace(/"/g, '');
      }
    } catch (error) {
      officer = 'Oficial';
    }
  }
  const crewCount = unit.crew || 0;
  const template = radioMessages[code];
  if (!template) return '';
  return template
    .replace('{unitId}', unit.id)
    .replace('{officer}', officer)
    .replace('{crewCount}', crewCount);
}

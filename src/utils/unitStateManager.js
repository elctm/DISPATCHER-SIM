import { generateRadioMessage } from '../data/radio-messages';

export const UNIT_STATES = {
  AVAILABLE: 'Available',
  EN_ROUTE: 'En Route',
  ON_SCENE: 'On Scene',
  RETURNING: 'Returning'
};

export const EMERGENCY_STAGES = {
  DISPATCH: '6-0',
  EN_ROUTE: '6-1',
  LOCATION_REQUEST: '0-5',
  ARRIVAL: '6-3',
  SITUATION_REPORT: 'INFORME',
  CONTROLLED: '6-7',
  DEPARTING: '6-9',
  AVAILABLE: '6-10'
};

export class UnitStateManager {
  constructor(unit, incident, onStateChange) {
    this.unit = unit;
    this.incident = incident;
    this.onStateChange = onStateChange;
  }

  async generateMessage(stage, extraData = {}) {
    const timestamp = new Date().toLocaleTimeString('en-GB');
    return {
      timestamp,
      message: `${this.unit.id} ${stage}`,
      type: stage,
      sender: this.unit.id
    };
  }

  async updateUnitState(newState, messageType, extraData = {}) {
    const message = await this.generateMessage(messageType, extraData);
    this.onStateChange(this.unit.id, newState, message);
  }

  async startEmergencyFlow() {
    // 6-0: Dispatch confirmation
    await this.updateUnitState(UNIT_STATES.EN_ROUTE, EMERGENCY_STAGES.DISPATCH);

    // 6-1: En route confirmation
    await this.updateUnitState(UNIT_STATES.EN_ROUTE, EMERGENCY_STAGES.EN_ROUTE);

    // 0-5: Location request (10% probability)
    if (Math.random() < 0.1) {
      await this.updateUnitState(UNIT_STATES.EN_ROUTE, EMERGENCY_STAGES.LOCATION_REQUEST);
    }
  }

  async arriveOnScene() {
    await this.updateUnitState(UNIT_STATES.ON_SCENE, EMERGENCY_STAGES.ARRIVAL);
  }

  async workOnScene() {
    return new Promise((resolve) => {
      setTimeout(async () => {
        // Generate and send situation report
        await this.updateUnitState(UNIT_STATES.ON_SCENE, EMERGENCY_STAGES.SITUATION_REPORT, {
          incidentType: this.incident.type,
          description: this.incident.description
        });

        // Send controlled situation message
        await this.updateUnitState(UNIT_STATES.ON_SCENE, EMERGENCY_STAGES.CONTROLLED);

        setTimeout(async () => {
          // Send departing message
          await this.updateUnitState(UNIT_STATES.RETURNING, EMERGENCY_STAGES.DEPARTING);
          // El movimiento de regreso se gestiona desde App.jsx (handleUnitStateChange)
          resolve();
        }, 3000);
      }, 10000);
    });
  }

  async returnToStation() {
    await this.updateUnitState(UNIT_STATES.AVAILABLE, EMERGENCY_STAGES.AVAILABLE);
  }
}

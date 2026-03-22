/**
 * SIMULATION-WORLD INTEGRATION
 * 
 * Connects HumanDesignSimulation to World3D visualization
 */

import { HumanDesignSimulation, AgentState, WorldPlace } from './HumanDesignSimulation';
import { EmbodiedWorldEngine, Agent, Place } from './EmbodiedWorldEngine';

/**
 * Adapter that bridges the realistic simulation to the 3D world
 */
export class SimulationWorldAdapter {
  private simulation: HumanDesignSimulation;
  private engine: EmbodiedWorldEngine;

  constructor(simulation: HumanDesignSimulation, engine: EmbodiedWorldEngine) {
    this.simulation = simulation;
    this.engine = engine;

    this.setupSync();
  }

  private setupSync() {
    // Sync simulation agents to engine agents
    this.simulation.on('update', () => {
      this.syncAgents();
      this.syncPlaces();
    });

    // Handle agent decisions
    this.simulation.on('agentDecision', ({ agent, decision }) => {
      console.log(`[${this.simulation.getWorldTime().toFixed(1)}h] ${agent.name} (${agent.chart.type}) → ${decision.action}`);

      // Show thought bubble or intent in 3D world
      if (decision.targetPlace) {
        const place = this.simulation.getPlace(decision.targetPlace);
        console.log(`  → going to ${place?.name}`);
      }
    });

    // Handle new day
    this.simulation.on('newDay', (day) => {
      console.log(`=== DAY ${day} COMPLETE ===`);

      // Log agent stats
      this.simulation.getAllAgents().forEach(agent => {
        const avgSatisfaction = agent.memory.routines.reduce((a, b) => a + b.satisfaction, 0) / 
                               (agent.memory.routines.length || 1);
        console.log(`${agent.name}: ${avgSatisfaction.toFixed(1)}/10 satisfaction, ${agent.age} days old`);
      });
    });
  }

  private syncAgents() {
    // Convert simulation agents to engine agents for rendering
    this.simulation.getAllAgents().forEach(simAgent => {
      let engineAgent = this.engine.getAgent(simAgent.id);

      if (!engineAgent) {
        // Create new engine agent
        engineAgent = this.createEngineAgent(simAgent);
        this.engine.agents.set(engineAgent.id, engineAgent);
      } else {
        // Update existing
        this.updateEngineAgent(engineAgent, simAgent);
      }
    });
  }

  private syncPlaces() {
    // Sync places
    this.simulation.getAllPlaces().forEach(simPlace => {
      let enginePlace = this.engine.getPlace(simPlace.id);

      if (!enginePlace) {
        enginePlace = this.createEnginePlace(simPlace);
        this.engine.places.set(enginePlace.id, enginePlace);
      } else {
        enginePlace.occupants = simPlace.occupants;
      }
    });
  }

  private createEngineAgent(simAgent: AgentState): Agent {
    // Map element based on type
    const elementMap: Record<string, any> = {
      'manifestor': 'fire',
      'generator': 'earth',
      'manifesting_generator': 'fire',
      'projector': 'water',
      'reflector': 'void'
    };

    return {
      id: simAgent.id,
      name: simAgent.name,
      element: elementMap[simAgent.chart.type] || 'void',
      seed: {
        id: simAgent.id,
        personality_13: this.convertToPlacement13(simAgent.chart),
        design_13: this.convertToPlacement13(simAgent.chart), // Simplified
        incarnation_cross: simAgent.chart.incarnationCross,
        type: simAgent.chart.type === 'manifesting_generator' ? 'generator' : simAgent.chart.type,
        authority: simAgent.chart.authority,
        definition: simAgent.chart.definition
      },
      address: {
        full: `${simAgent.chart.type.toUpperCase()} ${simAgent.chart.incarnationCross}`,
        tropical: simAgent.chart.incarnationCross.split('-')[0],
        gate: simAgent.chart.gates[0]?.toString() || '0',
        line: simAgent.chart.profile.split('/')[0],
        color: '4',
        tone: '4',
        base: '2',
        degree: 25,
        minute: 59,
        second: 31.92,
        arc: 0,
        zodiac: simAgent.chart.incarnationCross.split('-')[0],
        house: 5,
        planet: 'SUN',
        dimension: simAgent.chart.gates[0] % 11 + 1
      },
      position: simAgent.position,
      rotation: simAgent.rotation,
      velocity: simAgent.velocity,
      target: simAgent.targetPosition,
      animationState: simAgent.animationState,
      currentActivity: simAgent.currentAction,
      intent: {
        mode: this.mapActionToIntent(simAgent.currentAction),
        target: simAgent.targetAgent,
        strength: 0.7,
        lastUpdate: Date.now()
      },
      memory: {
        shortTerm: simAgent.memory.shortTerm,
        longTerm: simAgent.memory.longTerm,
        lastConsolidation: simAgent.memory.lastConsolidation
      },
      connections: new Set(simAgent.memory.people.keys()),
      createdAt: simAgent.createdAt,
      lastAction: simAgent.lastUpdate
    };
  }

  private updateEngineAgent(engineAgent: Agent, simAgent: AgentState) {
    engineAgent.position = simAgent.position;
    engineAgent.rotation = simAgent.rotation;
    engineAgent.velocity = simAgent.velocity;
    engineAgent.target = simAgent.targetPosition;
    engineAgent.animationState = simAgent.animationState;
    engineAgent.currentActivity = simAgent.currentAction;
    engineAgent.intent = {
      mode: this.mapActionToIntent(simAgent.currentAction),
      target: simAgent.targetAgent,
      strength: 0.7,
      lastUpdate: Date.now()
    };
    engineAgent.connections = new Set(simAgent.memory.people.keys());
    engineAgent.lastAction = simAgent.lastUpdate;
  }

  private createEnginePlace(simPlace: WorldPlace): Place {
    const typeMap: Record<string, any> = {
      'home': 'temple',
      'kitchen': 'market',
      'bedroom': 'temple',
      'bathroom': 'temple',
      'living': 'node',
      'work': 'node',
      'park': 'wilderness',
      'market': 'market',
      'temple': 'temple'
    };

    return {
      id: simPlace.id,
      name: simPlace.name,
      type: typeMap[simPlace.type] || 'node',
      position: simPlace.position,
      size: { width: simPlace.size.width, depth: simPlace.size.depth },
      color: this.getPlaceColor(simPlace.type),
      capacity: simPlace.capacity,
      occupants: simPlace.occupants,
      resonance: 0.5,
      anchors: []
    };
  }

  private getPlaceColor(type: string): string {
    const colors: Record<string, string> = {
      'home': '#ff6b6b',
      'kitchen': '#f39c12',
      'bedroom': '#9b59b6',
      'bathroom': '#3498db',
      'living': '#2ecc71',
      'work': '#e74c3c',
      'park': '#27ae60',
      'market': '#f1c40f',
      'temple': '#8e44ad'
    };
    return colors[type] || '#95a5a6';
  }

  private convertToPlacement13(chart: any): any {
    // Simplified conversion
    return {
      gate: chart.gates[0] || 1,
      line: parseInt(chart.profile.split('/')[0]) || 1,
      color: 4,
      tone: 4,
      base: 2,
      degree: 25,
      minute: 59,
      second: 31.92,
      arc: 0,
      zodiac: chart.incarnationCross.split('-')[0],
      house: 5,
      planet: 'SUN',
      dimension: (chart.gates[0] || 1) % 11 + 1
    };
  }

  private mapActionToIntent(action: string | null): any {
    const map: Record<string, any> = {
      'sleep': 'idle',
      'eat': 'bond',
      'drink': 'bond',
      'socialize': 'bond',
      'talk': 'bond',
      'work': 'chart',
      'explore': 'chart',
      'meditate': 'idle',
      'rest': 'idle',
      'idle': 'idle'
    };
    return map[action || ''] || 'idle';
  }
}

// ============================================================================
// EXAMPLE: Running the simulation
// ============================================================================

export async function runExample() {
  // Create simulation (24 minutes = 1 day)
  const sim = new HumanDesignSimulation({
    dayLength: 24 * 60 * 1000, // 24 minutes
    tickRate: 1000, // Update every second
    worldSize: 500,
    maxAgents: 10,
    startHour: 6 // Start at 6 AM
  });

  await sim.initialize();

  // Create diverse agents
  const agents = [
    { name: 'Aurora', gender: 'female' as const, birth: new Date(1995, 3, 15) },
    { name: 'Marcus', gender: 'male' as const, birth: new Date(1988, 7, 22) },
    { name: 'Luna', gender: 'female' as const, birth: new Date(1992, 11, 3) },
    { name: 'Orion', gender: 'male' as const, birth: new Date(1990, 5, 10) },
    { name: 'Iris', gender: 'nonbinary' as const, birth: new Date(1997, 1, 28) }
  ];

  agents.forEach(({ name, gender, birth }) => {
    const agent = sim.createAgent(name, gender, birth);
    console.log(`Created ${agent.name}: ${agent.chart.type} with ${agent.chart.authority} authority`);
    console.log(`  Profile: ${agent.chart.profile}, Cross: ${agent.chart.incarnationCross}`);
    console.log(`  Defined centers: ${Object.entries(agent.chart.centers).filter(([k,v]) => v).map(([k]) => k).join(', ')}`);
  });

  // Start simulation
  sim.start();

  // Log every decision
  sim.on('agentDecision', ({ agent, decision, worldTime }) => {
    const timeStr = `${Math.floor(worldTime)}:${Math.floor((worldTime % 1) * 60).toString().padStart(2, '0')}`;
    console.log(`[${timeStr}] ${agent.name} → ${decision.action} (priority: ${decision.priority.toFixed(2)})`);

    // Show needs if critical
    if (agent.needs.hunger < 3) console.log(`  ⚠️  Hungry: ${agent.needs.hunger.toFixed(1)}/10`);
    if (agent.needs.thirst < 3) console.log(`  ⚠️  Thirsty: ${agent.needs.thirst.toFixed(1)}/10`);
    if (agent.needs.sleepiness > 7) console.log(`  😴 Sleepy: ${agent.needs.sleepiness.toFixed(1)}/10`);
    if (agent.needs.bladder > 7) console.log(`  🚽 Bladder: ${agent.needs.bladder.toFixed(1)}/10`);
  });

  // Log arrivals
  sim.on('agentArrived', ({ agent, placeId }) => {
    const place = sim.getPlace(placeId);
    console.log(`  📍 Arrived at ${place?.name}`);
  });

  // Daily summary
  sim.on('newDay', (day) => {
    console.log(`\n📅 END OF DAY ${day}`);
    sim.getAllAgents().forEach(agent => {
      const routines = agent.memory.routines;
      const avgSat = routines.length > 0 
        ? routines.reduce((a, b) => a + b.satisfaction, 0) / routines.length 
        : 5;

      console.log(`${agent.name} (${agent.chart.type}):`);
      console.log(`  Satisfaction: ${avgSat.toFixed(1)}/10`);
      console.log(`  Energy: ${agent.needs.energy.toFixed(1)}/10`);
      console.log(`  Social connections: ${agent.memory.people.size}`);
      console.log(`  Today's actions: ${routines.map(r => r.action).join(', ')}`);
    });
  });

  return sim;
}

// ============================================================================
// REACT HOOK for easy integration
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useSimulation(config?: Partial<SimulationConfig>) {
  const [sim, setSim] = useState<HumanDesignSimulation | null>(null);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [places, setPlaces] = useState<WorldPlace[]>([]);
  const [worldTime, setWorldTime] = useState(6);
  const [dayCount, setDayCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const simulation = new HumanDesignSimulation(config);

    simulation.onUpdate(() => {
      setAgents(simulation.getAllAgents());
      setPlaces(simulation.getAllPlaces());
      setWorldTime(simulation.getWorldTime());
      setDayCount(simulation.getDayCount());
    });

    setSim(simulation);

    return () => {
      simulation.destroy();
    };
  }, []);

  const start = useCallback(() => {
    sim?.start();
    setIsRunning(true);
  }, [sim]);

  const stop = useCallback(() => {
    sim?.stop();
    setIsRunning(false);
  }, [sim]);

  const createAgent = useCallback((name: string, gender?: any, birthDate?: Date) => {
    return sim?.createAgent(name, gender, birthDate);
  }, [sim]);

  return {
    simulation: sim,
    agents,
    places,
    worldTime,
    dayCount,
    isRunning,
    start,
    stop,
    createAgent
  };
}

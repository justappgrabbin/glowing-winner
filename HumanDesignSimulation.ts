/**
 * HUMAN DESIGN AGENT SIMULATION
 * 
 * Agents with:
 * - 11 biological need dimensions (0-10 scale)
 * - Human Design charts (Type, Authority, Profile, Centers)
 * - 24-hour life cycles
 * - ONNX/Trident neural behavior controller
 * - Autonomous decision-making based on their unique design
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as ort from 'onnxruntime-node'; // ONNX Runtime

// ============================================================================
// TYPES - Biological Needs & Human Design
// ============================================================================

export type HumanDesignType = 'manifestor' | 'generator' | 'manifesting_generator' | 'projector' | 'reflector';
export type Authority = 'sacral' | 'emotional' | 'splenic' | 'ego' | 'self' | 'mental' | 'lunar';
export type Gender = 'male' | 'female' | 'nonbinary';

export interface BiologicalNeeds {
  // Physiological (0-10, 0 = critical, 10 = fully satisfied)
  hunger: number;      // 0 = starving, 10 = full
  thirst: number;      // 0 = dehydrated, 10 = hydrated
  sleepiness: number;  // 0 = exhausted, 10 = fully rested (inverted: high = tired)
  energy: number;      // 0 = depleted, 10 = vital
  bladder: number;   // 0 = empty, 10 = urgent need
  bowel: number;     // 0 = empty, 10 = urgent need
  hygiene: number;     // 0 = filthy, 10 = clean
  comfort: number;     // 0 = uncomfortable, 10 = comfortable
  health: number;      // 0 = sick/injured, 10 = perfect health
  temperature: number; // 0 = freezing, 5 = perfect, 10 = overheating

  // Safety & Social
  safety: number;      // 0 = threatened, 10 = secure
  social: number;    // 0 = isolated, 10 = deeply connected
  recognition: number; // 0 = invisible, 10 = fully seen (Projectors need this)

  // Self-actualization
  joy: number;       // 0 = depressed, 10 = ecstatic
  passion: number;   // 0 = apathetic, 10 = fully engaged
  purpose: number;   // 0 = lost, 10 = on track
}

export interface HumanDesignChart {
  type: HumanDesignType;
  authority: Authority;
  profile: string; // e.g., "3/5", "1/3"
  incarnationCross: string;
  definition: 'single' | 'split' | 'triple' | 'quadruple';

  // 9 Centers (defined/undefined)
  centers: {
    head: boolean;     // Crown
    ajna: boolean;     // Mind
    throat: boolean;   // Communication
    g: boolean;        // Identity
    heart: boolean;    // Ego/Will
    spleen: boolean;   // Intuition/Survival
    sacral: boolean;   // Life force/Workforce
    solarPlexus: boolean; // Emotions
    root: boolean;     // Adrenaline/Stress
  };

  // Active gates (1-64)
  gates: number[];

  // Channels (connected gates)
  channels: Array<[number, number]>;

  // Variables (4 arrows)
  variables: {
    digestion: 'consecutive' | 'alternating' | 'open';
    environment: 'caves' | 'markets' | 'kitchens' | 'tents';
    awareness: 'focussed' | 'peripheral';
    motivation: 'internal' | 'external';
  };

  // Birth data
  birth: {
    date: Date;
    location: string;
    timezone: string;
  };
  designDate: Date; // 88-90 days before birth (when brain developed)
}

export interface AgentMemory {
  shortTerm: string[]; // Last 10 actions
  longTerm: Map<string, any>; // Key experiences
  people: Map<string, { lastSeen: number; relationship: number }>; // -1 to 1
  places: Map<string, { visits: number; preference: number }>; // Preference -1 to 1
  routines: Array<{ time: number; action: string; satisfaction: number }>;
  lastConsolidation: number;
}

export interface AgentState {
  id: string;
  name: string;
  gender: Gender;
  age: number; // Days alive
  chart: HumanDesignChart;

  // Biological
  needs: BiologicalNeeds;
  maxNeeds: BiologicalNeeds; // Personal baselines (genetic variation)

  // Physical
  position: { x: number; y: number; z: number };
  rotation: number;
  velocity: { x: number; z: number };

  // Mental
  currentAction: string | null;
  actionStartTime: number;
  targetPosition: { x: number; z: number } | null;
  targetAgent: string | null; // Agent ID
  targetPlace: string | null; // Place ID

  // Social
  isSleeping: boolean;
  isTalking: boolean;
  conversationPartner: string | null;

  // Memory
  memory: AgentMemory;

  // State machine
  animationState: 'idle' | 'walking' | 'running' | 'sleeping' | 'eating' | 'talking' | 'working' | 'resting';

  // Timestamps
  createdAt: number;
  lastUpdate: number;
  lastDecision: number;
}

export interface WorldPlace {
  id: string;
  name: string;
  type: 'home' | 'kitchen' | 'bathroom' | 'bedroom' | 'living' | 'work' | 'park' | 'market' | 'temple' | 'wilderness';
  position: { x: number; z: number };
  size: { width: number; depth: number; height: number };
  capacity: number;
  occupants: Set<string>;

  // What needs this place satisfies
  services: {
    food?: number;      // Quality of food (0-10)
    water?: number;     // Quality of water (0-10)
    rest?: number;      // Quality of rest (0-10)
    bathroom?: boolean;
    shower?: boolean;
    social?: number;    // Social opportunity (0-10)
    safety?: number;    // Safety level (0-10)
    work?: number;      // Work opportunity (0-10)
  };

  // Environment
  temperature: number; // 0-10 (affects agent comfort)
  noise: number;     // 0-10 (affects sleep/rest)
  light: number;     // 0-10 (brightness)
}

export interface SimulationConfig {
  dayLength: number; // ms per day (default: 24 minutes = 1 day)
  tickRate: number;  // ms between updates
  worldSize: number;
  maxAgents: number;
  startHour: number; // 0-23
}

// ============================================================================
// HUMAN DESIGN CHART GENERATOR
// ============================================================================

export class HumanDesignGenerator {
  private static readonly GATES = 64;
  private static readonly ZODIAC = ['ARI', 'TAU', 'GEM', 'CAN', 'LEO', 'VIR', 'LIB', 'SCO', 'SAG', 'CAP', 'AQU', 'PIS'];
  private static readonly PLANETS = ['SUN', 'MOON', 'MER', 'VEN', 'MAR', 'JUP', 'SAT', 'URA', 'NEP', 'PLU'];

  generate(birthDate: Date, location: string = 'Unknown'): HumanDesignChart {
    // Calculate design date (approximately 88 days before birth for sun)
    const designDate = new Date(birthDate.getTime() - (88 * 24 * 60 * 60 * 1000));

    // Calculate planetary positions (simplified)
    const personality = this.calculatePositions(birthDate);
    const design = this.calculatePositions(designDate);

    // Determine type based on motor connections
    const type = this.determineType(personality, design);

    // Determine authority
    const authority = this.determineAuthority(personality, design, type);

    // Determine centers
    const centers = this.calculateCenters(personality.gates, design.gates);

    // Determine channels (connections between gates)
    const channels = this.calculateChannels(personality.gates, design.gates);

    // Profile (line combinations)
    const profile = this.calculateProfile(personality, design);

    // Incarnation cross
    const incarnationCross = this.calculateCross(personality, design);

    // Definition (how many separate groups of defined centers)
    const definition = this.calculateDefinition(centers, channels);

    return {
      type,
      authority,
      profile,
      incarnationCross,
      definition,
      centers,
      gates: [...new Set([...personality.gates, ...design.gates])],
      channels,
      variables: {
        digestion: ['consecutive', 'alternating', 'open'][Math.floor(Math.random() * 3)] as any,
        environment: ['caves', 'markets', 'kitchens', 'tents'][Math.floor(Math.random() * 4)] as any,
        awareness: ['focussed', 'peripheral'][Math.floor(Math.random() * 2)] as any,
        motivation: ['internal', 'external'][Math.floor(Math.random() * 2)] as any
      },
      birth: {
        date: birthDate,
        location,
        timezone: 'UTC'
      },
      designDate
    };
  }

  private calculatePositions(date: Date) {
    const dayOfYear = this.getDayOfYear(date);
    const hour = date.getHours();

    // Sun position determines gate
    const sunGate = ((dayOfYear % 64) + 1);
    const sunLine = ((hour % 6) + 1);

    // Calculate all active gates based on planetary positions
    const gates: number[] = [];
    const planets = ['SUN', 'MOON', 'EARTH', 'NORTH_NODE', 'SOUTH_NODE', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE', 'PLUTO'];

    planets.forEach((planet, i) => {
      const offset = i * 5; // Each planet offset
      const gate = (((dayOfYear + offset) % 64) + 1);
      gates.push(gate);
    });

    return { gates, sunGate, sunLine };
  }

  private determineType(p: any, d: any): HumanDesignType {
    // Check for motor-throat connections (Manifestor)
    const hasMotorToThroat = this.checkMotorThroatConnection(p.gates, d.gates);
    const hasSacral = p.gates.some((g: number) => g >= 3 && g <= 28) || d.gates.some((g: number) => g >= 3 && g <= 28);

    if (hasMotorToThroat && !hasSacral) return 'manifestor';
    if (hasMotorToThroat && hasSacral) return 'manifesting_generator';
    if (hasSacral && !hasMotorToThroat) return 'generator';

    // Check if all centers undefined (Reflector)
    const definedGates = new Set([...p.gates, ...d.gates]);
    if (definedGates.size < 5) return 'reflector';

    return 'projector';
  }

  private determineAuthority(p: any, d: any, type: HumanDesignType): Authority {
    // Check emotional authority (solar plexus defined)
    const hasSolarPlexus = p.gates.some((g: number) => [6, 22, 36, 37].includes(g)) || 
                           d.gates.some((g: number) => [6, 22, 36, 37].includes(g));
    if (hasSolarPlexus) return 'emotional';

    // Check sacral authority (Generators only)
    if (type === 'generator' || type === 'manifesting_generator') {
      const hasSacral = p.gates.some((g: number) => [3, 5, 9, 14, 27, 29, 34, 42, 59].includes(g)) ||
                        d.gates.some((g: number) => [3, 5, 9, 14, 27, 29, 34, 42, 59].includes(g));
      if (hasSacral) return 'sacral';
    }

    // Check splenic authority
    const hasSpleen = p.gates.some((g: number) => [18, 28, 48, 57, 44, 50, 32, 54].includes(g)) ||
                      d.gates.some((g: number) => [18, 28, 48, 57, 44, 50, 32, 54].includes(g));
    if (hasSpleen) return 'splenic';

    // Check ego authority (Manifestors only)
    if (type === 'manifestor') {
      const hasEgo = p.gates.some((g: number) => [21, 26, 40, 51].includes(g)) ||
                     d.gates.some((g: number) => [21, 26, 40, 51].includes(g));
      if (hasEgo) return 'ego';
    }

    // Check self-projected (Projectors with G center defined)
    if (type === 'projector') {
      const hasG = p.gates.some((g: number) => [1, 2, 7, 10, 13, 15, 25, 33, 46].includes(g)) ||
                   d.gates.some((g: number) => [1, 2, 7, 10, 13, 15, 25, 33, 46].includes(g));
      if (hasG) return 'self';
    }

    // Reflector = lunar
    if (type === 'reflector') return 'lunar';

    return 'mental';
  }

  private calculateCenters(personalityGates: number[], designGates: number[]) {
    // Map gates to centers
    const centerGates: Record<string, number[]> = {
      head: [64, 61, 63],
      ajna: [24, 4, 47, 11, 43, 17],
      throat: [62, 23, 56, 35, 12, 45, 33, 8, 31, 44, 13, 30],
      g: [1, 2, 7, 10, 13, 15, 25, 33, 46],
      heart: [21, 26, 40, 51],
      spleen: [18, 28, 48, 57, 44, 50, 32, 54],
      sacral: [3, 5, 9, 14, 27, 29, 34, 42, 59],
      solarPlexus: [6, 22, 36, 37, 49, 55],
      root: [19, 41, 60, 53, 52, 39, 58, 38, 54, 61]
    };

    const allGates = new Set([...personalityGates, ...designGates]);

    return {
      head: centerGates.head.some(g => allGates.has(g)),
      ajna: centerGates.ajna.some(g => allGates.has(g)),
      throat: centerGates.throat.some(g => allGates.has(g)),
      g: centerGates.g.some(g => allGates.has(g)),
      heart: centerGates.heart.some(g => allGates.has(g)),
      spleen: centerGates.spleen.some(g => allGates.has(g)),
      sacral: centerGates.sacral.some(g => allGates.has(g)),
      solarPlexus: centerGates.solarPlexus.some(g => allGates.has(g)),
      root: centerGates.root.some(g => allGates.has(g))
    };
  }

  private calculateChannels(personalityGates: number[], designGates: number[]) {
    // Define all 36 channels as gate pairs
    const channelDefinitions: Array<[number, number]> = [
      [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59], [7, 31], [9, 52],
      [10, 20], [10, 34], [10, 57], [11, 56], [12, 22], [13, 33], [16, 48],
      [17, 62], [18, 58], [19, 49], [20, 34], [20, 57], [21, 45], [23, 43],
      [24, 61], [25, 51], [26, 44], [27, 50], [28, 38], [29, 46], [30, 41],
      [32, 54], [34, 57], [35, 36], [37, 40], [39, 55], [42, 53], [47, 64]
    ];

    const allGates = new Set([...personalityGates, ...designGates]);

    return channelDefinitions.filter(([a, b]) => allGates.has(a) && allGates.has(b));
  }

  private calculateProfile(p: any, d: any): string {
    const lines = [1, 2, 3, 4, 5, 6];
    const pLine = lines[p.sunLine - 1] || 1;
    const dLine = lines[d.sunLine - 1] || 1;
    return `${pLine}/${dLine}`;
  }

  private calculateCross(p: any, d: any): string {
    const sunSign = HumanDesignGenerator.ZODIAC[(p.sunGate % 12)];
    const earthSign = HumanDesignGenerator.ZODIAC[(d.sunGate % 12)];
    return `${sunSign}-${earthSign}`;
  }

  private calculateDefinition(centers: any, channels: any): HumanDesignChart['definition'] {
    // Count connected groups of centers
    const definedCenters = Object.values(centers).filter(Boolean).length;
    if (definedCenters <= 2) return 'single';
    if (definedCenters <= 4) return 'split';
    if (definedCenters <= 6) return 'triple';
    return 'quadruple';
  }

  private checkMotorThroatConnection(pGates: number[], dGates: number[]) {
    // Simplified check - would need full channel logic
    // Check if any motor center gates connect to throat
    const motorGates = [3, 5, 9, 14, 27, 29, 34, 42, 59, 21, 26, 40, 51, 18, 28, 48, 57, 44, 50, 32, 54];
    const throatGates = [62, 23, 56, 35, 12, 45, 33, 8, 31, 44, 13, 30];

    const hasMotor = pGates.some((g: number) => motorGates.includes(g)) || 
                     dGates.some((g: number) => motorGates.includes(g));
    const hasThroat = pGates.some((g: number) => throatGates.includes(g)) || 
                      dGates.some((g: number) => throatGates.includes(g));

    // Check for direct channel connections (simplified)
    const channels = [
      [34, 20], [34, 10], [34, 57], // Sacral to Throat/Root/Spleen
      [54, 32], [54, 57], // Root to Spleen
      [38, 28], [38, 18], // Root to Spleen
      [58, 18], // Root to Spleen
      [9, 52], // Sacral to Root
    ];

    const allGates = new Set([...pGates, ...dGates]);
    const hasChannel = channels.some(([a, b]) => allGates.has(a) && allGates.has(b));

    return hasChannel || (hasMotor && hasThroat);  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

// ============================================================================
// NEURAL BEHAVIOR CONTROLLER (ONNX/TRIDENT)
// ============================================================================

export class NeuralBehaviorController {
  private session: ort.InferenceSession | null = null;
  private modelPath: string;

  constructor(modelPath: string = './behavior_model.onnx') {
    this.modelPath = modelPath;
  }

  async initialize() {
    try {
      this.session = await ort.InferenceSession.create(this.modelPath);
      console.log('Neural behavior model loaded');
    } catch (e) {
      console.warn('Could not load ONNX model, using fallback logic:', e);
      this.session = null;
    }
  }

  /**
   * Decide next action based on:
   * - Current biological needs (11 dimensions)
   * - Human Design chart (encoded as features)
   * - Time of day (circadian rhythms)
   * - Current location/place features
   * - Social context (nearby agents)
   */
  async decideAction(
    agent: AgentState,
    worldTime: number, // 0-24 hours
    nearbyAgents: AgentState[],
    currentPlace: WorldPlace | null,
    availablePlaces: WorldPlace[]
  ): Promise<{
    action: string;
    targetPlace: string | null;
    targetAgent: string | null;
    duration: number; // seconds
    priority: number; // 0-1
  }> {

    if (!this.session) {
      return this.fallbackDecision(agent, worldTime, nearbyAgents, currentPlace, availablePlaces);
    }

    // Encode state as tensor
    const inputTensor = this.encodeState(agent, worldTime, nearbyAgents, currentPlace);

    // Run inference
    const feeds: Record<string, ort.Tensor> = {};
    feeds['input'] = inputTensor;

    const results = await this.session.run(feeds);
    const output = results['output'];

    // Decode output to action
    return this.decodeAction(output, availablePlaces, nearbyAgents);
  }

  private encodeState(
    agent: AgentState,
    worldTime: number,
    nearbyAgents: AgentState[],
    place: WorldPlace | null
  ): ort.Tensor {
    // Create feature vector
    const features: number[] = [];

    // 1. Biological needs (11 dimensions, normalized 0-1)
    features.push(
      agent.needs.hunger / 10,
      agent.needs.thirst / 10,
      agent.needs.sleepiness / 10,
      agent.needs.energy / 10,
      agent.needs.bladder / 10,
      agent.needs.bowel / 10,
      agent.needs.hygiene / 10,
      agent.needs.comfort / 10,
      agent.needs.health / 10,
      agent.needs.safety / 10,
      agent.needs.social / 10
    );

    // 2. Time features (circadian)
    features.push(
      Math.sin((worldTime / 24) * 2 * Math.PI), // Hour as sine
      Math.cos((worldTime / 24) * 2 * Math.PI), // Hour as cosine
      worldTime / 24 // Normalized hour
    );

    // 3. Human Design encoding (one-hot-ish)
    const typeEncoding = this.encodeType(agent.chart.type);
    const authorityEncoding = this.encodeAuthority(agent.chart.authority);
    features.push(...typeEncoding, ...authorityEncoding);

    // 4. Place features
    if (place) {
      features.push(
        place.services.food ? place.services.food / 10 : 0,
        place.services.water ? place.services.water / 10 : 0,
        place.services.rest ? place.services.rest / 10 : 0,
        place.services.bathroom ? 1 : 0,
        place.services.shower ? 1 : 0,
        place.services.social ? place.services.social / 10 : 0,
        place.temperature / 10,
        place.noise / 10
      );
    } else {
      features.push(0, 0, 0, 0, 0, 0, 0.5, 0); // Default outdoor
    }

    // 5. Social context
    const nearbyCount = nearbyAgents.length;
    const avgRelationship = nearbyAgents.reduce((sum, a) => {
      const rel = agent.memory.people.get(a.id)?.relationship || 0;
      return sum + rel;
    }, 0) / (nearbyCount || 1);

    features.push(nearbyCount / 10, (avgRelationship + 1) / 2);

    // Pad to fixed size if needed
    while (features.length < 64) features.push(0);

    return new ort.Tensor('float32', new Float32Array(features), [1, features.length]);
  }

  private encodeType(type: HumanDesignType): number[] {
    const types: HumanDesignType[] = ['manifestor', 'generator', 'manifesting_generator', 'projector', 'reflector'];
    return types.map(t => t === type ? 1 : 0);
  }

  private encodeAuthority(authority: Authority): number[] {
    const authorities: Authority[] = ['sacral', 'emotional', 'splenic', 'ego', 'self', 'mental', 'lunar'];
    return authorities.map(a => a === authority ? 1 : 0);
  }

  private decodeAction(
    output: ort.Tensor,
    places: WorldPlace[],
    agents: AgentState[]
  ): { action: string; targetPlace: string | null; targetAgent: string | null; duration: number; priority: number } {
    const data = output.data as Float32Array;

    // Output: [action_id(20), place_id(one-hot), agent_id(one-hot), duration, priority]
    // Simplified - just return highest probability action
    const actionId = Math.floor(data[0] * 20);

    const actions = [
      'sleep', 'eat', 'drink', 'use_bathroom', 'shower', 'socialize',
      'work', 'rest', 'exercise', 'explore', 'talk', 'move_to',
      'wait', 'respond', 'initiate', 'reflect', 'create', 'study',
      'meditate', 'idle'
    ];

    return {
      action: actions[actionId] || 'idle',
      targetPlace: places.length > 0 ? places[0].id : null,
      targetAgent: agents.length > 0 ? agents[0].id : null,
      duration: 300 + Math.random() * 3600, // 5 min to 1 hour
      priority: data[data.length - 1]
    };
  }

  /**
   * Fallback decision logic when ONNX model not available
   * Uses Human Design strategy + biological needs
   */
  private fallbackDecision(
    agent: AgentState,
    worldTime: number,
    nearbyAgents: AgentState[],
    currentPlace: WorldPlace | null,
    availablePlaces: WorldPlace[]
  ): { action: string; targetPlace: string | null; targetAgent: string | null; duration: number; priority: number } {

    const needs = agent.needs;
    const chart = agent.chart;

    // URGENT NEEDS (override everything)
    if (needs.bladder > 8) {
      return this.findPlaceAction('use_bathroom', availablePlaces, agent, 0.95);
    }
    if (needs.hunger < 2) {
      return this.findPlaceAction('eat', availablePlaces, agent, 0.9);
    }
    if (needs.thirst < 2) {
      return this.findPlaceAction('drink', availablePlaces, agent, 0.9);
    }
    if (needs.sleepiness > 8 && (worldTime > 22 || worldTime < 6)) {
      return this.findPlaceAction('sleep', availablePlaces, agent, 0.85);
    }

    // HUMAN DESIGN STRATEGY
    switch (chart.type) {
      case 'generator':
      case 'manifesting_generator':
        // Wait to respond - look for opportunities
        if (nearbyAgents.length > 0 && needs.social < 5) {
          return {
            action: 'respond',
            targetPlace: currentPlace?.id || null,
            targetAgent: nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)].id,
            duration: 600,
            priority: 0.7
          };
        }
        // Work if energy is high
        if (needs.energy > 7) {
          return this.findPlaceAction('work', availablePlaces, agent, 0.6);
        }
        break;

      case 'projector':
        // Wait for invitation
        if (agent.memory.people.size > 0) {
          // Check for invitations in memory
          const lastInteraction = Array.from(agent.memory.people.entries())
            .sort((a, b) => b[1].lastSeen - a[1].lastSeen)[0];
          if (lastInteraction && lastInteraction[1].relationship > 0.3) {
            return {
              action: 'guide',
              targetPlace: currentPlace?.id || null,
              targetAgent: lastInteraction[0],
              duration: 1200,
              priority: 0.8
            };
          }
        }
        // Rest if energy low (Projectors need more rest)
        if (needs.energy < 4) {
          return this.findPlaceAction('rest', availablePlaces, agent, 0.75);
        }
        break;

      case 'manifestor':
        // Initiate - inform others
        if (needs.passion > 6) {
          return {
            action: 'initiate',
            targetPlace: currentPlace?.id || null,
            targetAgent: nearbyAgents.length > 0 ? nearbyAgents[0].id : null,
            duration: 300,
            priority: 0.8
          };
        }
        break;

      case 'reflector':
        // Sample/taste the environment
        if (availablePlaces.length > 0) {
          const randomPlace = availablePlaces[Math.floor(Math.random() * availablePlaces.length)];
          return {
            action: 'reflect',
            targetPlace: randomPlace.id,
            targetAgent: null,
            duration: 1800,
            priority: 0.5
          };
        }
        break;
    }

    // DEFAULT BEHAVIORS
    if (needs.hygiene < 3) {
      return this.findPlaceAction('shower', availablePlaces, agent, 0.7);
    }
    if (needs.social < 3 && nearbyAgents.length > 0) {
      return {
        action: 'socialize',
        targetPlace: currentPlace?.id || null,
        targetAgent: nearbyAgents[Math.floor(Math.random() * nearbyAgents.length)].id,
        duration: 1800,
        priority: 0.6
      };
    }
    if (needs.joy < 4) {
      return {
        action: 'explore',
        targetPlace: availablePlaces.length > 0 ? availablePlaces[Math.floor(Math.random() * availablePlaces.length)].id : null,
        targetAgent: null,
        duration: 3600,
        priority: 0.5
      };
    }

    // Default: idle/rest
    return {
      action: 'idle',
      targetPlace: currentPlace?.id || null,
      targetAgent: null,
      duration: 300,
      priority: 0.3
    };
  }

  private findPlaceAction(
    action: string,
    places: WorldPlace[],
    agent: AgentState,
    priority: number
  ): { action: string; targetPlace: string | null; targetAgent: string | null; duration: number; priority: number } {

    // Find best place for this action
    let targetPlace: WorldPlace | null = null;
    let minDist = Infinity;

    places.forEach(place => {
      let relevant = false;
      switch (action) {
        case 'sleep': relevant = place.services.rest !== undefined; break;
        case 'eat': relevant = place.services.food !== undefined; break;
        case 'drink': relevant = place.services.water !== undefined; break;
        case 'use_bathroom': relevant = place.services.bathroom; break;
        case 'shower': relevant = place.services.shower; break;
        case 'work': relevant = place.services.work !== undefined; break;
        case 'rest': relevant = place.type === 'bedroom' || place.type === 'living'; break;
      }

      if (relevant) {
        const dx = place.position.x - agent.position.x;
        const dz = place.position.z - agent.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < minDist) {
          minDist = dist;
          targetPlace = place;
        }
      }
    });

    return {
      action,
      targetPlace: targetPlace?.id || null,
      targetAgent: null,
      duration: action === 'sleep' ? 28800 : action === 'eat' ? 1800 : 600,
      priority
    };
  }
}

// ============================================================================
// BIOLOGICAL NEEDS SIMULATOR
// ============================================================================

export class BiologicalSimulator {
  private config: SimulationConfig;

  constructor(config: SimulationConfig) {
    this.config = config;
  }

  /**
   * Update biological needs based on time passage and actions
   */
  updateNeeds(agent: AgentState, deltaTime: number, worldTime: number): void {
    const hoursPassed = deltaTime / (this.config.dayLength / 24); // Convert to sim hours

    // Base decay rates (per hour)
    const decay = {
      hunger: 0.8,      // Get hungry over time
      thirst: 1.2,      // Thirst increases faster
      sleepiness: this.calculateSleepinessRate(worldTime, agent),
      energy: -0.5,     // Energy naturally depletes
      bladder: 0.3,
      bowel: 0.2,
      hygiene: -0.1,    // Get dirty slowly
      comfort: 0,       // Depends on environment
      health: 0,        // Stable unless sick
      temperature: 0,   // Depends on environment
      safety: 0,
      social: -0.2,   // Get lonely over time
      joy: -0.1,
      passion: -0.05,
      purpose: 0
    };

    // Apply decay
    agent.needs.hunger = Math.max(0, Math.min(10, agent.needs.hunger - decay.hunger * hoursPassed));
    agent.needs.thirst = Math.max(0, Math.min(10, agent.needs.thirst - decay.thirst * hoursPassed));
    agent.needs.sleepiness = Math.max(0, Math.min(10, agent.needs.sleepiness + decay.sleepiness * hoursPassed));
    agent.needs.energy = Math.max(0, Math.min(10, agent.needs.energy + decay.energy * hoursPassed));
    agent.needs.bladder = Math.max(0, Math.min(10, agent.needs.bladder + decay.bladder * hoursPassed));
    agent.needs.bowel = Math.max(0, Math.min(10, agent.needs.bowel + decay.bowel * hoursPassed));
    agent.needs.hygiene = Math.max(0, Math.min(10, agent.needs.hygiene + decay.hygiene * hoursPassed));
    agent.needs.social = Math.max(0, Math.min(10, agent.needs.social + decay.social * hoursPassed));
    agent.needs.joy = Math.max(0, Math.min(10, agent.needs.joy + decay.joy * hoursPassed));
    agent.needs.passion = Math.max(0, Math.min(10, agent.needs.passion + decay.passion * hoursPassed));

    // Apply action effects
    this.applyActionEffects(agent, hoursPassed);

    // Apply place effects
    this.applyPlaceEffects(agent, hoursPassed);

    // Critical health effects
    this.applyHealthEffects(agent);
  }

  private calculateSleepinessRate(worldTime: number, agent: AgentState): number {
    // Circadian rhythm
    const isNight = worldTime < 6 || worldTime > 22;
    const isDay = worldTime > 8 && worldTime < 20;

    let rate = 0.2; // Base

    if (isNight) rate += 0.8;
    if (isDay && agent.isSleeping) rate -= 0.3; // Wake up naturally

    // Type-specific sleep needs
    if (agent.chart.type === 'projector') {
      rate *= 1.3; // Projectors need more sleep
    }

    return rate;
  }

  private applyActionEffects(agent: AgentState, hours: number): void {
    if (!agent.currentAction) return;

    switch (agent.currentAction) {
      case 'sleep':
        agent.needs.sleepiness = Math.max(0, agent.needs.sleepiness - 2 * hours);
        agent.needs.energy = Math.min(10, agent.needs.energy + 1.5 * hours);
        agent.needs.health = Math.min(10, agent.needs.health + 0.1 * hours);
        break;

      case 'eat':
        agent.needs.hunger = Math.min(10, agent.needs.hunger + 3 * hours);
        agent.needs.energy = Math.min(10, agent.needs.energy + 0.5 * hours);
        agent.needs.joy = Math.min(10, agent.needs.joy + 0.3 * hours);
        break;

      case 'drink':
        agent.needs.thirst = Math.min(10, agent.needs.thirst + 4 * hours);
        agent.needs.bladder = Math.min(10, agent.needs.bladder + 0.5 * hours); // Drinking fills bladder
        break;

      case 'use_bathroom':
        agent.needs.bladder = 0;
        agent.needs.bowel = 0;
        agent.needs.comfort = Math.min(10, agent.needs.comfort + 2);
        break;

      case 'shower':
        agent.needs.hygiene = 10;
        agent.needs.comfort = Math.min(10, agent.needs.comfort + 1);
        agent.needs.joy = Math.min(10, agent.needs.joy + 0.5);
        break;

      case 'socialize':
      case 'talk':
        agent.needs.social = Math.min(10, agent.needs.social + 2 * hours);
        agent.needs.joy = Math.min(10, agent.needs.joy + 0.5 * hours);
        // Projectors gain recognition
        if (agent.chart.type === 'projector') {
          agent.needs.recognition = Math.min(10, agent.needs.recognition + 1 * hours);
        }
        break;

      case 'work':
        agent.needs.energy = Math.max(0, agent.needs.energy - 0.8 * hours);
        agent.needs.purpose = Math.min(10, agent.needs.purpose + 0.3 * hours);
        // Generators get satisfaction from work
        if (agent.chart.type === 'generator' || agent.chart.type === 'manifesting_generator') {
          agent.needs.joy = Math.min(10, agent.needs.joy + 0.4 * hours);
        }
        break;

      case 'rest':
        agent.needs.energy = Math.min(10, agent.needs.energy + 0.8 * hours);
        agent.needs.comfort = Math.min(10, agent.needs.comfort + 0.5 * hours);
        break;

      case 'exercise':
        agent.needs.energy = Math.max(0, agent.needs.energy - 1 * hours);
        agent.needs.health = Math.min(10, agent.needs.health + 0.3 * hours);
        agent.needs.hunger = Math.max(0, agent.needs.hunger - 0.5 * hours);
        break;

      case 'meditate':
        agent.needs.joy = Math.min(10, agent.needs.joy + 0.3 * hours);
        agent.needs.purpose = Math.min(10, agent.needs.purpose + 0.2 * hours);
        break;
    }
  }

  private applyPlaceEffects(agent: AgentState, hours: number): void {
    // Would check current place and apply environmental effects
    // Temperature, noise, safety, etc.
  }

  private applyHealthEffects(agent: AgentState): void {
    // Critical conditions
    if (agent.needs.hunger < 1) {
      agent.needs.health = Math.max(0, agent.needs.health - 0.1);
    }
    if (agent.needs.thirst < 1) {
      agent.needs.health = Math.max(0, agent.needs.health - 0.2);
    }
    if (agent.needs.sleepiness > 9 && !agent.isSleeping) {
      agent.needs.health = Math.max(0, agent.needs.health - 0.05);
      agent.needs.energy = Math.max(0, agent.needs.energy - 0.5);
    }
  }
}

// ============================================================================
// MAIN SIMULATION ENGINE
// ============================================================================

export class HumanDesignSimulation extends EventEmitter {
  agents: Map<string, AgentState> = new Map();
  places: Map<string, WorldPlace> = new Map();

  private config: SimulationConfig;
  private chartGen: HumanDesignGenerator;
  private neuralController: NeuralBehaviorController;
  private bioSimulator: BiologicalSimulator;

  private isRunning = false;
  private tickInterval: NodeJS.Timeout | null = null;
  private worldTime: number = 6; // Start at 6 AM
  private dayCount = 0;

  private updateCallbacks: Set<() => void> = new Set();

  constructor(config: Partial<SimulationConfig> = {}) {
    super();

    this.config = {
      dayLength: 24 * 60 * 1000, // 24 minutes = 1 day
      tickRate: 1000, // 1 second real time
      worldSize: 1000,
      maxAgents: 50,
      startHour: 6,
      ...config
    };

    this.worldTime = this.config.startHour;
    this.chartGen = new HumanDesignGenerator();
    this.neuralController = new NeuralBehaviorController();
    this.bioSimulator = new BiologicalSimulator(this.config);

    this.initializeWorld();
  }

  async initialize() {
    await this.neuralController.initialize();
  }

  private initializeWorld() {
    // Create a basic house with rooms
    const houseX = 0;
    const houseZ = 0;

    const rooms: Omit<WorldPlace, 'id' | 'occupants'>[] = [
      {
        name: 'Kitchen',
        type: 'kitchen',
        position: { x: houseX - 10, z: houseZ },
        size: { width: 20, depth: 15, height: 3 },
        capacity: 5,
        services: { food: 8, water: 10, social: 6 },
        temperature: 7,
        noise: 4,
        light: 8
      },
      {
        name: 'Living Room',
        type: 'living',
        position: { x: houseX + 15, z: houseZ },
        size: { width: 25, depth: 20, height: 3 },
        capacity: 8,
        services: { rest: 5, social: 8, water: 5 },
        temperature: 7,
        noise: 3,
        light: 7
      },
      {
        name: 'Bedroom 1',
        type: 'bedroom',
        position: { x: houseX + 10, z: houseZ - 20 },
        size: { width: 15, depth: 12, height: 3 },
        capacity: 2,
        services: { rest: 10, social: 2 },
        temperature: 6,
        noise: 1,
        light: 4
      },
      {
        name: 'Bedroom 2',
        type: 'bedroom',
        position: { x: houseX - 5, z: houseZ - 20 },
        size: { width: 15, depth: 12, height: 3 },
        capacity: 2,
        services: { rest: 10, social: 2 },
        temperature: 6,
        noise: 1,
        light: 4
      },
      {
        name: 'Bathroom',
        type: 'bathroom',
        position: { x: houseX - 15, z: houseZ - 10 },
        size: { width: 10, depth: 8, height: 3 },
        capacity: 1,
        services: { bathroom: true, shower: true, water: 10 },
        temperature: 8,
        noise: 2,
        light: 9
      },
      {
        name: 'Office',
        type: 'work',
        position: { x: houseX + 30, z: houseZ - 10 },
        size: { width: 15, depth: 12, height: 3 },
        capacity: 3,
        services: { work: 9, rest: 3, water: 6 },
        temperature: 7,
        noise: 2,
        light: 9
      },
      {
        name: 'Garden',
        type: 'park',
        position: { x: houseX, z: houseZ + 30 },
        size: { width: 50, depth: 40, height: 10 },
        capacity: 20,
        services: { rest: 7, social: 5, work: 3 },
        temperature: 5,
        noise: 2,
        light: 10
      },
      {
        name: 'Market',
        type: 'market',
        position: { x: houseX + 100, z: houseZ },
        size: { width: 60, depth: 60, height: 5 },
        capacity: 50,
        services: { food: 10, water: 8, social: 9, work: 4 },
        temperature: 6,
        noise: 8,
        light: 9
      }
    ];

    rooms.forEach(room => {
      const place: WorldPlace = {
        ...room,
        id: uuidv4(),
        occupants: new Set()
      };
      this.places.set(place.id, place);
    });
  }

  // Subscribe to updates (for React/Three.js integration)
  onUpdate(callback: () => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private notifyUpdate() {
    this.updateCallbacks.forEach(cb => {
      try { cb(); } catch (e) { console.error('Update callback error:', e); }
    });
    this.emit('update', { worldTime: this.worldTime, dayCount: this.dayCount });
  }

  // Create a new agent with full Human Design chart
  createAgent(
    name: string,
    gender: Gender = 'nonbinary',
    birthDate?: Date,
    location?: string
  ): AgentState {
    if (this.agents.size >= this.config.maxAgents) {
      throw new Error('Max agents reached');
    }

    const birth = birthDate || new Date(1990 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28));
    const chart = this.chartGen.generate(birth, location);

    // Initialize needs with genetic variation
    const baseNeeds: BiologicalNeeds = {
      hunger: 5 + Math.random() * 3,
      thirst: 5 + Math.random() * 3,
      sleepiness: 2 + Math.random() * 2,
      energy: 7 + Math.random() * 3,
      bladder: Math.random() * 2,
      bowel: Math.random() * 2,
      hygiene: 7 + Math.random() * 3,
      comfort: 6 + Math.random() * 4,
      health: 8 + Math.random() * 2,
      temperature: 5,
      safety: 8 + Math.random() * 2,
      social: 4 + Math.random() * 4,
      recognition: 3 + Math.random() * 4,
      joy: 5 + Math.random() * 3,
      passion: 4 + Math.random() * 4,
      purpose: 5 + Math.random() * 3
    };

    // Type-specific adjustments
    if (chart.type === 'projector') {
      baseNeeds.energy *= 0.8; // Projectors have less energy
      baseNeeds.recognition *= 1.3; // Need recognition more
    } else if (chart.type === 'generator' || chart.type === 'manifesting_generator') {
      baseNeeds.energy *= 1.2; // More energy
      baseNeeds.passion *= 1.2; // Need satisfying work
    }

    const agent: AgentState = {
      id: uuidv4(),
      name,
      gender,
      age: 0,
      chart,
      needs: { ...baseNeeds },
      maxNeeds: { ...baseNeeds },
      position: { x: (Math.random() - 0.5) * 50, y: 0, z: (Math.random() - 0.5) * 50 },
      rotation: Math.random() * Math.PI * 2,
      velocity: { x: 0, z: 0 },
      currentAction: null,
      actionStartTime: Date.now(),
      targetPosition: null,
      targetAgent: null,
      targetPlace: null,
      isSleeping: false,
      isTalking: false,
      conversationPartner: null,
      memory: {
        shortTerm: [],
        longTerm: new Map(),
        people: new Map(),
        places: new Map(),
        routines: [],
        lastConsolidation: Date.now()
      },
      animationState: 'idle',
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      lastDecision: Date.now()
    };

    this.agents.set(agent.id, agent);
    this.emit('agentCreated', agent);
    this.notifyUpdate();

    return agent;
  }

  // Start the simulation
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.tickInterval = setInterval(() => this.tick(), this.config.tickRate);
    this.emit('started');
    console.log(`Simulation started. Day length: ${this.config.dayLength / 60000} minutes`);
  }

  // Stop the simulation
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.emit('stopped');
  }

  private async tick() {
    const now = Date.now();
    const deltaTime = this.config.tickRate;

    // Update world time
    const hoursPassed = (deltaTime / this.config.dayLength) * 24;
    this.worldTime += hoursPassed;

    if (this.worldTime >= 24) {
      this.worldTime -= 24;
      this.dayCount++;
      this.emit('newDay', this.dayCount);
    }

    // Update all agents
    for (const agent of this.agents.values()) {
      // 1. Update biological needs
      this.bioSimulator.updateNeeds(agent, deltaTime, this.worldTime);

      // 2. Check if current action is complete
      const actionDuration = (now - agent.actionStartTime) / 1000;
      if (agent.currentAction && actionDuration > 3600) { // Max 1 hour actions
        this.completeAction(agent);
      }

      // 3. Make new decision if needed (every 5 seconds or when action complete)
      if (!agent.currentAction || (now - agent.lastDecision > 5000)) {
        await this.makeDecision(agent);
      }

      // 4. Execute movement
      this.updateMovement(agent, deltaTime);

      // 5. Update place occupancy
      this.updatePlaceOccupancy(agent);

      agent.lastUpdate = now;
    }

    this.notifyUpdate();
    this.emit('tick', { worldTime: this.worldTime, dayCount: this.dayCount });
  }

  private async makeDecision(agent: AgentState) {
    const currentPlace = this.getPlaceAt(agent.position);
    const nearbyAgents = this.getNearbyAgents(agent, 20);
    const availablePlaces = Array.from(this.places.values());

    const decision = await this.neuralController.decideAction(
      agent,
      this.worldTime,
      nearbyAgents,
      currentPlace,
      availablePlaces
    );

    // Execute decision
    agent.currentAction = decision.action;
    agent.actionStartTime = Date.now();
    agent.lastDecision = Date.now();
    agent.targetPlace = decision.targetPlace;
    agent.targetAgent = decision.targetAgent;

    // Set target position if moving to place
    if (decision.targetPlace) {
      const place = this.places.get(decision.targetPlace);
      if (place) {
        agent.targetPosition = { x: place.position.x, z: place.position.z };
      }
    }

    // Update animation state
    this.updateAnimationState(agent);

    // Log to memory
    agent.memory.shortTerm.unshift(`${decision.action} at ${this.worldTime.toFixed(1)}h`);
    if (agent.memory.shortTerm.length > 10) agent.memory.shortTerm.pop();

    this.emit('agentDecision', { agent, decision, worldTime: this.worldTime });
  }

  private completeAction(agent: AgentState) {
    // Record satisfaction
    const satisfaction = this.calculateSatisfaction(agent);
    agent.memory.routines.push({
      time: this.worldTime,
      action: agent.currentAction || 'unknown',
      satisfaction
    });

    agent.currentAction = null;
    agent.targetPlace = null;
    agent.targetAgent = null;
    agent.targetPosition = null;
    agent.animationState = 'idle';
    agent.isSleeping = false;
    agent.isTalking = false;
    agent.conversationPartner = null;
  }

  private calculateSatisfaction(agent: AgentState): number {
    // Simple satisfaction based on need fulfillment
    const criticalNeeds = ['hunger', 'thirst', 'sleepiness', 'energy'];
    let score = 5;

    criticalNeeds.forEach(need => {
      const value = agent.needs[need as keyof BiologicalNeeds];
      if (need === 'sleepiness') {
        score += (10 - value) / 2; // Lower sleepiness = better
      } else {
        score += value / 2;
      }
    });

    return score / criticalNeeds.length;
  }

  private updateMovement(agent: AgentState, deltaTime: number) {
    if (!agent.targetPosition) {
      agent.velocity = { x: 0, z: 0 };
      return;
    }

    const dx = agent.targetPosition.x - agent.position.x;
    const dz = agent.targetPosition.z - agent.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 1) {
      // Arrived
      agent.position.x = agent.targetPosition.x;
      agent.position.z = agent.targetPosition.z;
      agent.targetPosition = null;
      agent.velocity = { x: 0, z: 0 };

      // If we arrived at a place, we're "there"
      if (agent.targetPlace) {
        this.emit('agentArrived', { agent, placeId: agent.targetPlace });
      }
    } else {
      // Move toward target
      const speed = agent.animationState === 'running' ? 0.5 : 0.2;
      agent.velocity.x = (dx / dist) * speed * (deltaTime / 1000);
      agent.velocity.z = (dz / dist) * speed * (deltaTime / 1000);

      agent.position.x += agent.velocity.x;
      agent.position.z += agent.velocity.z;
      agent.rotation = Math.atan2(dx, dz);
    }
  }

  private updateAnimationState(agent: AgentState) {
    if (agent.isSleeping) {
      agent.animationState = 'sleeping';
    } else if (agent.currentAction === 'eat') {
      agent.animationState = 'eating';
    } else if (agent.currentAction === 'talk' || agent.currentAction === 'socialize') {
      agent.animationState = 'talking';
    } else if (agent.currentAction === 'work') {
      agent.animationState = 'working';
    } else if (agent.velocity.x !== 0 || agent.velocity.z !== 0) {
      agent.animationState = agent.currentAction === 'run' ? 'running' : 'walking';
    } else {
      agent.animationState = 'idle';
    }
  }

  private updatePlaceOccupancy(agent: AgentState) {
    // Remove from old places
    this.places.forEach(place => {
      place.occupants.delete(agent.id);
    });

    // Add to current place
    const currentPlace = this.getPlaceAt(agent.position);
    if (currentPlace) {
      currentPlace.occupants.add(agent.id);

      // Update place memory
      const placeMemory = agent.memory.places.get(currentPlace.id);
      if (placeMemory) {
        placeMemory.visits++;
      } else {
        agent.memory.places.set(currentPlace.id, { visits: 1, preference: 0 });
      }
    }
  }

  private getPlaceAt(position: { x: number; z: number }): WorldPlace | null {
    for (const place of this.places.values()) {
      const halfWidth = place.size.width / 2;
      const halfDepth = place.size.depth / 2;

      if (
        position.x >= place.position.x - halfWidth &&
        position.x <= place.position.x + halfWidth &&
        position.z >= place.position.z - halfDepth &&
        position.z <= place.position.z + halfDepth
      ) {
        return place;
      }
    }
    return null;
  }

  private getNearbyAgents(agent: AgentState, radius: number): AgentState[] {
    const nearby: AgentState[] = [];

    this.agents.forEach(other => {
      if (other.id === agent.id) return;

      const dx = other.position.x - agent.position.x;
      const dz = other.position.z - agent.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= radius) {
        nearby.push(other);

        // Update social memory
        const rel = agent.memory.people.get(other.id);
        if (rel) {
          rel.lastSeen = Date.now();
          // Slight relationship improvement from proximity
          rel.relationship = Math.min(1, rel.relationship + 0.01);
        } else {
          agent.memory.people.set(other.id, { lastSeen: Date.now(), relationship: 0 });
        }
      }
    });

    return nearby;
  }

  // Getters
  getAgent(id: string): AgentState | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): AgentState[] {
    return Array.from(this.agents.values());
  }

  getPlace(id: string): WorldPlace | undefined {
    return this.places.get(id);
  }

  getAllPlaces(): WorldPlace[] {
    return Array.from(this.places.values());
  }

  getWorldTime(): number {
    return this.worldTime;
  }

  getDayCount(): number {
    return this.dayCount;
  }

  // Force agent action (for user intervention)
  forceAction(agentId: string, action: string, targetPlaceId?: string) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.currentAction = action;
    agent.actionStartTime = Date.now();

    if (targetPlaceId) {
      agent.targetPlace = targetPlaceId;
      const place = this.places.get(targetPlaceId);
      if (place) {
        agent.targetPosition = { x: place.position.x, z: place.position.z };
      }
    }

    this.updateAnimationState(agent);
    this.notifyUpdate();
  }

  // Cleanup
  destroy() {
    this.stop();
    this.agents.clear();
    this.places.clear();
    this.updateCallbacks.clear();
    this.removeAllListeners();
  }
}

// Export singleton for easy use
export const simulation = new HumanDesignSimulation();

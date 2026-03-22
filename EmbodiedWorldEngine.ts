import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES - The ontological structure
// ============================================================================

export type Element = 'fire' | 'water' | 'earth' | 'air' | 'void';
export type AnimationState = 'idle' | 'walking' | 'running' | 'meditating' | 'talking';
export type IntentMode = 'bond' | 'chart' | 'store' | 'idle';

export interface Placement13 {
  gate: number;      // 1-64
  line: number;      // 1-6
  color: number;     // 1-6
  tone: number;      // 1-6
  base: number;      // 1-5
  degree: number;    // 0-29
  minute: number;    // 0-59
  second: number;    // 0-59
  arc: number;       // 0-360
  zodiac: string;    // 12 signs
  house: number;     // 1-12
  planet: string;    // 7 traditional + 3 modern
  dimension: number; // 1-11
}

export interface AgentSeed {
  id: string;
  personality_13: Placement13;
  design_13: Placement13;
  incarnation_cross: string;
  type: 'manifestor' | 'generator' | 'projector' | 'reflector';
  authority: 'sacral' | 'emotional' | 'splenic' | 'ego' | 'self' | 'mental';
  definition: 'single' | 'split' | 'triple' | 'quadruple';
}

export interface HumanAddress {
  full: string;
  tropical: string;
  gate: string;
  line: string;
  color: string;
  tone: string;
  base: string;
  degree: number;
  minute: number;
  second: number;
  arc: number;
  zodiac: string;
  house: number;
  planet: string;
  dimension: number;
}

export interface Agent {
  id: string;
  name: string;
  element: Element;
  seed: AgentSeed;
  address: HumanAddress;
  position: { x: number; y: number; z: number };
  rotation: number;
  velocity: { x: number; z: number };
  target: { x: number; z: number } | null;
  animationState: AnimationState;
  currentActivity: string | null;
  intent: {
    mode: IntentMode;
    target: string | null;
    strength: number; // 0-1
    lastUpdate: number;
  };
  memory: {
    shortTerm: string[];
    longTerm: Map<string, any>;
    lastConsolidation: number;
  };
  connections: Set<string>; // Other agent IDs
  createdAt: number;
  lastAction: number;
}

export interface Place {
  id: string;
  name: string;
  type: 'temple' | 'market' | 'wilderness' | 'node' | 'void';
  position: { x: number; z: number };
  size: { width: number; depth: number };
  color: string;
  capacity: number;
  occupants: Set<string>;
  resonance: number; // 0-1, how aligned with current cosmic weather
  anchors: Placement13[]; // Fixed points in the 22-trillion space
}

export interface FiveW {
  who: string;   // Agent ID or "self"
  what: string;  // Action/intent
  where: string; // Place ID
  when: number;  // Timestamp
  why: string;   // Motivation/context
}

export interface SimulationEvent {
  id: string;
  type: 'intent' | 'movement' | 'interaction' | 'collapse' | 'emergence';
  timestamp: number;
  fiveW: FiveW;
  data: any;
  witnesses: string[]; // Agent IDs who observed
}

// Element colors for visualization
export const ELEMENT_COLORS: Record<Element, { primary: string; glow: string; aura: string }> = {
  fire: { primary: '#ff4444', glow: '#ff8844', aura: '#ffaa44' },
  water: { primary: '#4444ff', glow: '#4488ff', aura: '#44aaff' },
  earth: { primary: '#44ff44', glow: '#88ff44', aura: '#aaff44' },
  air: { primary: '#ffff44', glow: '#ffff88', aura: '#ffffaa' },
  void: { primary: '#8844ff', glow: '#aa44ff', aura: '#cc44ff' }
};

// ============================================================================
// 5W QUANTUM COLLAPSE ENGINE
// ============================================================================

export class FiveWEngine {
  private history: SimulationEvent[] = [];
  private superposition: Map<string, any> = new Map(); // Uncollapsed possibilities

  collapse(who: string, what: string, where: string, why: string): FiveW {
    const when = Date.now();

    // Check for gaps in the ontological architecture
    const gap = this.detectGap(who, what, where, when, why);

    if (gap) {
      // Fill the gap with emergent structure
      this.fillGap(gap);
    }

    const collapsed: FiveW = { who, what, where, when, why };

    // Create event
    const event: SimulationEvent = {
      id: uuidv4(),
      type: 'collapse',
      timestamp: when,
      fiveW: collapsed,
      data: { gapFilled: !!gap },
      witnesses: []
    };

    this.history.push(event);

    // Prune old history
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }

    return collapsed;
  }

  private detectGap(who: string, what: string, where: string, when: number, why: string): any | null {
    // Check if this creates a discontinuity in the narrative web
    const recent = this.history.slice(-10);

    // Gap: Same agent, different location, no movement event
    const lastMove = recent.findLast(e => e.type === 'movement' && e.fiveW.who === who);
    if (lastMove && lastMove.fiveW.where !== where && what !== 'teleport') {
      return { type: 'discontinuity', agent: who, from: lastMove.fiveW.where, to: where };
    }

    // Gap: Intent without action
    const lastIntent = recent.findLast(e => e.type === 'intent' && e.fiveW.who === who);
    if (lastIntent && when - lastIntent.timestamp > 5000 && !recent.find(e => e.type !== 'intent' && e.fiveW.who === who)) {
      return { type: 'unfulfilled_intent', agent: who, intent: lastIntent.fiveW.what };
    }

    return null;
  }

  private fillGap(gap: any) {
    // Generate emergent structure to bridge the gap
    const bridge = {
      id: uuidv4(),
      type: 'emergence',
      gap: gap,
      resolution: this.generateResolution(gap),
      timestamp: Date.now()
    };

    this.superposition.set(bridge.id, bridge);

    // Collapse superposition after 100ms (quantum decoherence simulation)
    setTimeout(() => {
      this.superposition.delete(bridge.id);
    }, 100);
  }

  private generateResolution(gap: any): string {
    const resolutions = [
      'temporal_bridge',
      'spatial_warp',
      'intent_cascade',
      'memory_reconstruction',
      'ontological_patch'
    ];
    return resolutions[Math.floor(Math.random() * resolutions.length)];
  }

  getHistory(): SimulationEvent[] {
    return [...this.history];
  }

  getSuperposition(): Map<string, any> {
    return new Map(this.superposition);
  }
}

// ============================================================================
// ONTLOGICAL ADDRESS GENERATOR (22-TRILLION SPACE)
// ============================================================================

export class OntologicalAddressGenerator {
  private static readonly ZODIAC = ['ARI', 'TAU', 'GEM', 'CAN', 'LEO', 'VIR', 'LIB', 'SCO', 'SAG', 'CAP', 'AQU', 'PIS'];
  private static readonly PLANETS = ['SUN', 'MOON', 'MER', 'VEN', 'MAR', 'JUP', 'SAT', 'URA', 'NEP', 'PLU'];

  generate(personalityMoment: Date, designMoment: Date): { personality: Placement13; design: Placement13 } {
    return {
      personality: this.calculatePlacement(personalityMoment),
      design: this.calculatePlacement(designMoment)
    };
  }

  private calculatePlacement(moment: Date): Placement13 {
    // Convert moment to astronomical position
    const dayOfYear = this.getDayOfYear(moment);
    const hour = moment.getHours();
    const minute = moment.getMinutes();

    // Calculate gate (1-64) based on day of year
    const gate = ((dayOfYear % 64) + 1);

    // Calculate line (1-6) based on hour
    const line = ((hour % 6) + 1);

    // Calculate color (1-6) based on minute
    const color = ((minute % 6) + 1);

    // Calculate tone (1-6) - finer granularity
    const second = moment.getSeconds();
    const tone = ((second % 6) + 1);

    // Calculate base (1-5) - milliseconds
    const ms = moment.getMilliseconds();
    const base = ((Math.floor(ms / 200) % 5) + 1);

    // Degree, minute, second of arc
    const degree = Math.floor((dayOfYear / 365) * 30);
    const arcMinute = Math.floor((hour / 24) * 60);
    const arcSecond = Math.floor((minute / 60) * 60);
    const arc = (degree * 3600 + arcMinute * 60 + arcSecond) / 3600;

    // Zodiac sign
    const zodiacIndex = Math.floor((dayOfYear / 365) * 12);
    const zodiac = OntologicalAddressGenerator.ZODIAC[zodiacIndex];

    // House (1-12) - based on hour
    const house = ((hour % 12) + 1);

    // Planet - based on gate
    const planetIndex = Math.floor((gate - 1) / 6.4);
    const planet = OntologicalAddressGenerator.PLANETS[Math.min(planetIndex, 9)];

    // Dimension (1-11) - based on combination
    const dimension = ((gate + line + color) % 11) + 1;

    return {
      gate, line, color, tone, base,
      degree, minute: arcMinute, second: arcSecond, arc,
      zodiac, house, planet, dimension
    };
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  formatAddress(placement: Placement13): HumanAddress {
    const gateHex = placement.gate.toString(16).toUpperCase().padStart(2, '0');

    return {
      full: `${placement.planet} ${placement.zodiac} ${placement.gate}.${placement.line}.${placement.color}.${placement.tone}.${placement.base} ${placement.degree}° ${placement.minute}' ${placement.second.toFixed(2)}" ${placement.zodiac} H${placement.house} D${placement.dimension}`,
      tropical: `${placement.planet} ${placement.zodiac}`,
      gate: gateHex,
      line: `${placement.line}`,
      color: `${placement.color}`,
      tone: `${placement.tone}`,
      base: `${placement.base}`,
      degree: placement.degree,
      minute: placement.minute,
      second: placement.second,
      arc: placement.arc,
      zodiac: placement.zodiac,
      house: placement.house,
      planet: placement.planet,
      dimension: placement.dimension
    };
  }
}

// ============================================================================
// INTENT CLASSIFIER (Morphing GNN interface)
// ============================================================================

export class IntentClassifier {
  classify(text: string): { mode: IntentMode; confidence: number; target: string | null } {
    const lower = text.toLowerCase();

    // Bond mode - connection, relationship, together
    if (/connect|bond|join|meet|talk|chat|friend|love/i.test(lower)) {
      const target = this.extractTarget(lower);
      return { mode: 'bond', confidence: 0.9, target };
    }

    // Chart mode - analyze, see, visualize, understand
    if (/chart|graph|see|look|show|analyze|map|where/i.test(lower)) {
      const target = this.extractTarget(lower);
      return { mode: 'chart', confidence: 0.85, target };
    }

    // Store mode - save, keep, remember, store
    if (/save|store|keep|remember|record|write/i.test(lower)) {
      const target = this.extractTarget(lower);
      return { mode: 'store', confidence: 0.88, target };
    }

    // Default to idle
    return { mode: 'idle', confidence: 0.5, target: null };
  }

  private extractTarget(text: string): string | null {
    // Simple extraction - look for proper nouns or quoted strings
    const match = text.match(/["']([^"']+)["']|\b([A-Z][a-z]+)\b/);
    return match ? (match[1] || match[2]) : null;
  }
}

// ============================================================================
// MAIN EMBODIED WORLD ENGINE
// ============================================================================

interface EmbodiedWorldEngineOptions {
  maxAgents?: number;
  worldSize?: number;
  tickRate?: number;
}

export class EmbodiedWorldEngine extends EventEmitter {
  agents: Map<string, Agent> = new Map();
  places: Map<string, Place> = new Map();
  fiveW: FiveWEngine = new FiveWEngine();
  addressGen: OntologicalAddressGenerator = new OntologicalAddressGenerator();
  intentClassifier: IntentClassifier = new IntentClassifier();

  private options: Required<EmbodiedWorldEngineOptions>;
  private tickInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private updateCallbacks: Set<() => void> = new Set();

  constructor(options: EmbodiedWorldEngineOptions = {}) {
    super();
    this.options = {
      maxAgents: 100,
      worldSize: 1000,
      tickRate: 100, // 10fps simulation tick
      ...options
    };

    this.initializeWorld();
  }

  private initializeWorld() {
    // Create default places in the ontological space
    const defaultPlaces: Omit<Place, 'id' | 'occupants' | 'resonance'>[] = [
      { name: 'The Temple of Gates', type: 'temple', position: { x: 0, z: 0 }, size: { width: 50, depth: 50 }, color: '#ff6b6b', capacity: 20, anchors: [] },
      { name: 'The Market of Lines', type: 'market', position: { x: 100, z: 0 }, size: { width: 80, depth: 60 }, color: '#4ecdc4', capacity: 50, anchors: [] },
      { name: 'The Wilderness of Void', type: 'wilderness', position: { x: -100, z: 100 }, size: { width: 200, depth: 200 }, color: '#9b59b6', capacity: 10, anchors: [] },
      { name: 'The Node of Colors', type: 'node', position: { x: 0, z: -100 }, size: { width: 40, depth: 40 }, color: '#f39c12', capacity: 15, anchors: [] },
      { name: 'The Void Between', type: 'void', position: { x: -100, z: -100 }, size: { width: 100, depth: 100 }, color: '#2c3e50', capacity: 5, anchors: [] }
    ];

    defaultPlaces.forEach(placeData => {
      const place: Place = {
        ...placeData,
        id: uuidv4(),
        occupants: new Set(),
        resonance: Math.random()
      };
      this.places.set(place.id, place);
    });
  }

  // Subscribe to updates (for React integration)
  onUpdate(callback: () => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private notifyUpdate() {
    this.updateCallbacks.forEach(cb => {
      try { cb(); } catch (e) { console.error('Update callback error:', e); }
    });
    this.emit('update');
  }

  // Create a new agent
  createAgent(name: string, element: Element = 'void'): Agent {
    if (this.agents.size >= this.options.maxAgents) {
      throw new Error('Max agents reached');
    }

    const now = new Date();
    const designMoment = new Date(now.getTime() - 88 * 24 * 60 * 60 * 1000); // 88 days before (pre-natal)

    const { personality, design } = this.addressGen.generate(now, designMoment);

    const agentSeed: AgentSeed = {
      id: uuidv4(),
      personality_13: personality,
      design_13: design,
      incarnation_cross: this.calculateCross(personality, design),
      type: this.calculateType(personality, design),
      authority: this.calculateAuthority(personality, design),
      definition: this.calculateDefinition(personality, design)
    };

    const agent: Agent = {
      id: agentSeed.id,
      name,
      element,
      seed: agentSeed,
      address: this.addressGen.formatAddress(personality),
      position: { x: (Math.random() - 0.5) * 100, y: 0, z: (Math.random() - 0.5) * 100 },
      rotation: Math.random() * Math.PI * 2,
      velocity: { x: 0, z: 0 },
      target: null,
      animationState: 'idle',
      currentActivity: null,
      intent: {
        mode: 'idle',
        target: null,
        strength: 0.5,
        lastUpdate: Date.now()
      },
      memory: {
        shortTerm: [],
        longTerm: new Map(),
        lastConsolidation: Date.now()
      },
      connections: new Set(),
      createdAt: Date.now(),
      lastAction: Date.now()
    };

    this.agents.set(agent.id, agent);

    // 5W Collapse: Agent emergence
    this.fiveW.collapse(agent.id, 'emergence', 'world', 'ontological_birth');

    this.notifyUpdate();
    this.emit('agentCreated', agent);

    return agent;
  }

  // Process natural language intent
  processIntent(agentId: string, text: string): { mode: IntentMode; target: string | null } {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');

    const classification = this.intentClassifier.classify(text);

    // Update agent intent
    agent.intent = {
      mode: classification.mode,
      target: classification.target,
      strength: classification.confidence,
      lastUpdate: Date.now()
    };

    agent.lastAction = Date.now();

    // 5W Collapse: Intent formation
    const place = this.getPlaceAt(agent.position);
    this.fiveW.collapse(agentId, `intent:${classification.mode}`, place?.id || 'void', text);

    // Execute intent
    this.executeIntent(agent, classification.mode, classification.target);

    this.notifyUpdate();
    this.emit('intent', { agent, classification, text });

    return { mode: classification.mode, target: classification.target };
  }

  private executeIntent(agent: Agent, mode: IntentMode, target: string | null) {
    switch (mode) {
      case 'bond':
        this.executeBond(agent, target);
        break;
      case 'chart':
        this.executeChart(agent, target);
        break;
      case 'store':
        this.executeStore(agent, target);
        break;
      case 'idle':
        agent.animationState = 'idle';
        agent.currentActivity = null;
        break;
    }
  }

  private executeBond(agent: Agent, targetName: string | null) {
    if (targetName) {
      // Find target agent
      const target = Array.from(this.agents.values()).find(a => 
        a.name.toLowerCase() === targetName.toLowerCase()
      );

      if (target && target.id !== agent.id) {
        // Move toward target
        agent.target = { x: target.position.x, z: target.position.z };
        agent.animationState = 'walking';
        agent.currentActivity = `bonding with ${target.name}`;

        // Create connection
        agent.connections.add(target.id);
        target.connections.add(agent.id);

        // 5W Collapse: Bond formation
        this.fiveW.collapse(agent.id, 'bond', target.id, 'connection');
      }
    } else {
      // Bond with nearest agent
      const nearest = this.findNearestAgent(agent);
      if (nearest) {
        agent.target = { x: nearest.position.x, z: nearest.position.z };
        agent.animationState = 'walking';
      }
    }
  }

  private executeChart(agent: Agent, target: string | null) {
    agent.animationState = 'meditating';
    agent.currentActivity = 'charting';

    // 5W Collapse: Chart visualization
    this.fiveW.collapse(agent.id, 'chart', target || 'self', 'visualization');

    // Emit chart event for UI
    this.emit('chart', { 
      agent, 
      target,
      address: agent.address,
      seed: agent.seed
    });
  }

  private executeStore(agent: Agent, target: string | null) {
    agent.animationState = 'idle';
    agent.currentActivity = 'storing';

    // Store in memory
    if (target) {
      agent.memory.shortTerm.push(target);

      // Consolidate if needed
      if (agent.memory.shortTerm.length > 10) {
        this.consolidateMemory(agent);
      }
    }

    // 5W Collapse: Memory storage
    this.fiveW.collapse(agent.id, 'store', 'memory', target || 'experience');
  }

  private consolidateMemory(agent: Agent) {
    const key = `consolidated_${Date.now()}`;
    agent.memory.longTerm.set(key, [...agent.memory.shortTerm]);
    agent.memory.shortTerm = [];
    agent.memory.lastConsolidation = Date.now();
  }

  private findNearestAgent(from: Agent): Agent | null {
    let nearest: Agent | null = null;
    let minDist = Infinity;

    this.agents.forEach(agent => {
      if (agent.id === from.id) return;

      const dx = agent.position.x - from.position.x;
      const dz = agent.position.z - from.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < minDist) {
        minDist = dist;
        nearest = agent;
      }
    });

    return nearest;
  }

  private getPlaceAt(position: { x: number; z: number }): Place | null {
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

  // Simulation tick
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.tickInterval = setInterval(() => this.tick(), this.options.tickRate);
    this.emit('started');
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.emit('stopped');
  }

  private tick() {
    const now = Date.now();

    this.agents.forEach(agent => {
      // Process movement
      if (agent.target) {
        const dx = agent.target.x - agent.position.x;
        const dz = agent.target.z - agent.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 1) {
          // Arrived
          agent.target = null;
          agent.velocity = { x: 0, z: 0 };
          agent.animationState = 'idle';

          // 5W Collapse: Arrival
          const place = this.getPlaceAt(agent.position);
          this.fiveW.collapse(agent.id, 'arrive', place?.id || 'void', 'movement_complete');
        } else {
          // Move toward target
          const speed = agent.animationState === 'running' ? 0.5 : 0.2;
          agent.velocity.x = (dx / dist) * speed;
          agent.velocity.z = (dz / dist) * speed;

          agent.position.x += agent.velocity.x;
          agent.position.z += agent.velocity.z;
          agent.rotation = Math.atan2(dx, dz);

          agent.animationState = dist > 10 ? 'running' : 'walking';
        }
      }

      // Update place occupancy
      const currentPlace = this.getPlaceAt(agent.position);
      this.places.forEach(place => {
        if (place.occupants.has(agent.id) && place.id !== currentPlace?.id) {
          place.occupants.delete(agent.id);
        } else if (!place.occupants.has(agent.id) && place.id === currentPlace?.id) {
          place.occupants.add(agent.id);
        }
      });

      // Memory decay
      if (now - agent.memory.lastConsolidation > 60000) { // 1 minute
        this.consolidateMemory(agent);
      }
    });

    this.notifyUpdate();
    this.emit('tick');
  }

  // Agent movement API
  moveAgent(agentId: string, x: number, z: number) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');

    agent.target = { x, z };
    agent.animationState = 'walking';
    agent.lastAction = Date.now();

    this.notifyUpdate();
  }

  // Getters
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getPlace(id: string): Place | undefined {
    return this.places.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAllPlaces(): Place[] {
    return Array.from(this.places.values());
  }

  getHistory() {
    return this.fiveW.getHistory();
  }

  // Cleanup
  destroy() {
    this.stop();
    this.agents.clear();
    this.places.clear();
    this.updateCallbacks.clear();
    this.removeAllListeners();
  }

  // Helper calculations for Human Design
  private calculateCross(p: Placement13, d: Placement13): string {
    return `${p.zodiac}-${d.zodiac}`;
  }

  private calculateType(p: Placement13, d: Placement13): AgentSeed['type'] {
    const types: AgentSeed['type'][] = ['manifestor', 'generator', 'projector', 'reflector'];
    return types[(p.gate + d.gate) % 4];
  }

  private calculateAuthority(p: Placement13, d: Placement13): AgentSeed['authority'] {
    const authorities: AgentSeed['authority'][] = ['sacral', 'emotional', 'splenic', 'ego', 'self', 'mental'];
    return authorities[(p.line + d.line) % 6];
  }

  private calculateDefinition(p: Placement13, d: Placement13): AgentSeed['definition'] {
    const definitions: AgentSeed['definition'][] = ['single', 'split', 'triple', 'quadruple'];
    return definitions[(p.color + d.color) % 4];
  }
}

// Export singleton for easy import
export const worldEngine = new EmbodiedWorldEngine();

/**
 * UNIVERSAL APP SUBSTRATE
 * 
 * Your apps become living worlds where:
 * - Agents inhabit your apps as authentic users (with HD types)
 * - You experience your apps alongside agents (co-experience)
 * - Apps connect into an ecosystem (network effects)
 * - Agents share, remix, build upon your creations
 * - Everything you own exists in one place
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { HumanDesignSimulation, AgentState } from './HumanDesignSimulation';

// ============================================================================
// TYPES - App as Living World
// ============================================================================

export type AppType = 'productivity' | 'creative' | 'social' | 'game' | 'tool' | 'knowledge' | 'market' | 'utility';

export interface AppManifest {
  id: string;
  name: string;
  description: string;
  type: AppType;
  creator: string; // Human owner
  version: string;

  // The app as a place in the world
  world: {
    entryPoint: { x: number; z: number }; // Where it exists in substrate
    size: { width: number; height: number; depth: number };
    style: 'minimal' | 'organic' | 'futuristic' | 'cozy' | 'industrial' | 'natural';
    colorTheme: string[];
    ambientSound?: string;
  };

  // What agents can do in this app
  affordances: {
    canCreate: boolean;
    canSocialize: boolean;
    canCompete: boolean;
    canExplore: boolean;
    canCustomize: boolean;
    requiresFocus: boolean; // Deep work vs casual
    socialDensity: number; // 0-1, how many agents fit
  };

  // How different HD types experience it
  resonance: {
    generator: number; // 0-1, how satisfying
    manifesting_generator: number;
    projector: number; // 0-1, how much recognition available
    manifestor: number; // 0-1, how much autonomy
    reflector: number; // 0-1, how much variety
  };

  // Connected apps (ecosystem)
  integrations: string[]; // App IDs it connects to
  imports: string[]; // Data from other apps
  exports: string[]; // Data to other apps

  // Code/assets
  assets: {
    code?: string; // JavaScript/TypeScript
    html?: string;
    css?: string;
    wasm?: Uint8Array; // Compiled modules
    media: string[]; // URLs to images/audio/video
    data: Record<string, any>; // JSON data
  };

  // Agent API - how agents interact
  agentAPI: {
    actions: string[]; // What actions agents can take
    events: string[]; // What events agents receive
    queries: string[]; // What data agents can request
  };

  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

export interface AppInstance {
  id: string;
  manifestId: string;
  hostAgentId: string | null; // Which agent "owns" this instance
  participants: Set<string>; // Agent IDs currently using it
  state: 'active' | 'paused' | 'archived';

  // Live data
  data: Map<string, any>; // App-specific data
  history: AppEvent[]; // What happened here
  creations: Creation[]; // Things made in this app

  // Network
  parentInstance: string | null; // If spawned from another app
  childInstances: Set<string>; // Apps spawned from this
  connections: Map<string, Connection>; // Links to other app instances
}

export interface AppEvent {
  id: string;
  timestamp: number;
  agentId: string;
  type: 'enter' | 'exit' | 'action' | 'create' | 'share' | 'invite' | 'react';
  data: any;
  impact: number; // How much this changed the app state
}

export interface Creation {
  id: string;
  creatorId: string;
  appId: string;
  type: string;
  content: any;
  timestamp: number;
  remixes: number;
  shares: number;
  reactions: Map<string, string>; // agentId -> reaction
}

export interface Connection {
  fromApp: string;
  toApp: string;
  type: 'data' | 'social' | 'inspiration' | 'dependency';
  strength: number; // 0-1
  createdAt: number;
}

export interface AgentAppProfile {
  agentId: string;
  preferences: Map<string, number>; // appId -> preference score
  skills: Map<string, number>; // skill -> level
  creations: string[]; // Creation IDs
  favoriteApps: string[];
  discoveredApps: string[];
  socialGraph: Map<string, number>; // other agentId -> connection strength
}

// ============================================================================
// APP RESONANCE ENGINE (How HD types experience apps)
// ============================================================================

export class AppResonanceEngine {
  /**
   * Calculate how an agent resonates with an app
   */
  calculateResonance(agent: AgentState, manifest: AppManifest): {
    score: number; // 0-1 overall fit
    why: string; // Explanation
    willStay: boolean; // Will they stay or leave quickly
    satisfaction: number; // How satisfying to use
  } {
    const type = agent.chart.type;
    const baseResonance = manifest.resonance[type] || 0.5;

    let score = baseResonance;
    let reasons: string[] = [];

    // Type-specific adjustments
    switch (type) {
      case 'generator':
      case 'manifesting_generator':
        // Generators need satisfying work + response
        if (manifest.affordances.canCreate) {
          score += 0.2;
          reasons.push('can create and respond');
        }
        if (manifest.affordances.requiresFocus) {
          score += 0.1;
          reasons.push('deep work available');
        }
        if (manifest.resonance[type] > 0.7) {
          score += 0.1;
          reasons.push('highly satisfying');
        }
        break;

      case 'projector':
        // Projectors need recognition + guidance opportunities
        if (manifest.affordances.canSocialize) {
          score += 0.15;
          reasons.push('social recognition possible');
        }
        if (manifest.resonance.projector > 0.6) {
          score += 0.2;
          reasons.push('recognition available');
        }
        // Check if other agents present (Projectors need audience)
        if (manifest.affordances.socialDensity > 0.5) {
          score += 0.1;
          reasons.push('audience present');
        }
        break;

      case 'manifestor':
        // Manifestors need autonomy + impact
        if (manifest.affordances.canCustomize) {
          score += 0.2;
          reasons.push('can customize freely');
        }
        if (!manifest.affordances.requiresFocus) {
          score += 0.1;
          reasons.push('flexible engagement');
        }
        if (manifest.resonance.manifestor > 0.6) {
          score += 0.15;
          reasons.push('autonomy respected');
        }
        break;

      case 'reflector':
        // Reflectors need variety + sampling
        if (manifest.affordances.canExplore) {
          score += 0.2;
          reasons.push('exploration possible');
        }
        if (manifest.integrations.length > 2) {
          score += 0.15;
          reasons.push('connected to ecosystem');
        }
        if (manifest.resonance.reflector > 0.5) {
          score += 0.1;
          reasons.push('good for sampling');
        }
        break;
    }

    // Authority-based preferences
    if (agent.chart.authority === 'emotional' && manifest.affordances.requiresFocus) {
      score += 0.1; // Emotional authorities like clarity
      reasons.push('emotional clarity available');
    }

    if (agent.chart.authority === 'sacral' && manifest.affordances.canCreate) {
      score += 0.1; // Sacral likes life force work
      reasons.push('life force engagement');
    }

    score = Math.min(1, Math.max(0, score));

    return {
      score,
      why: reasons.join(', ') || 'neutral resonance',
      willStay: score > 0.6,
      satisfaction: score * (0.7 + Math.random() * 0.3) // Some randomness
    };
  }

  /**
   * How an agent uses an app (behavior pattern)
   */
  generateUsagePattern(agent: AgentState, manifest: AppManifest): {
    sessionLength: number; // seconds
    intensity: number; // 0-1 focus level
    social: boolean; // Will they interact with others
    creative: boolean; // Will they create or consume
    loyalty: number; // 0-1 will they return
  } {
    const type = agent.chart.type;

    let pattern = {
      sessionLength: 300, // 5 min default
      intensity: 0.5,
      social: false,
      creative: false,
      loyalty: 0.5
    };

    switch (type) {
      case 'generator':
        pattern = {
          sessionLength: 1800 + Math.random() * 3600, // 30-90 min
          intensity: 0.7 + Math.random() * 0.3, // High focus
          social: manifest.affordances.canSocialize && Math.random() > 0.5,
          creative: manifest.affordances.canCreate,
          loyalty: 0.8 // Generators stick with what satisfies
        };
        break;

      case 'projector':
        pattern = {
          sessionLength: 600 + Math.random() * 1200, // 10-30 min
          intensity: 0.4 + Math.random() * 0.4, // Moderate
          social: true, // Projectors need people
          creative: false, // More guidance than creation
          loyalty: 0.4 // Sample many apps
        };
        break;

      case 'manifestor':
        pattern = {
          sessionLength: 300 + Math.random() * 900, // 5-20 min bursts
          intensity: 0.8, // High intensity short bursts
          social: manifest.affordances.canSocialize,
          creative: true, // Manifestors create
          loyalty: 0.3 // Move on after initiating
        };
        break;

      case 'reflector':
        pattern = {
          sessionLength: 1200 + Math.random() * 2400, // 20-60 min sampling
          intensity: 0.3, // Low intensity, high observation
          social: true, // Sample others
          creative: false, // Reflect rather than create
          loyalty: 0.2 // Constantly sampling
        };
        break;
    }

    return pattern;
  }
}

// ============================================================================
// APP SUBSTRATE - The living world where all apps exist
// ============================================================================

export class AppSubstrate extends EventEmitter {
  private simulation: HumanDesignSimulation;
  private resonanceEngine: AppResonanceEngine;

  // All apps in the substrate
  manifests: Map<string, AppManifest> = new Map();
  instances: Map<string, AppInstance> = new Map();

  // Agent-app relationships
  agentProfiles: Map<string, AgentAppProfile> = new Map();

  // The substrate world
  worldSize = { width: 10000, depth: 10000 };
  occupiedSpaces: Map<string, { x: number; z: number; size: any }> = new Map();

  constructor(simulation: HumanDesignSimulation) {
    super();
    this.simulation = simulation;
    this.resonanceEngine = new AppResonanceEngine();

    this.setupAgentIntegration();
  }

  // ========================================================================
  // APP UPLOAD - You upload your apps here
  // ========================================================================

  uploadApp(
    creatorId: string,
    name: string,
    type: AppType,
    assets: AppManifest['assets'],
    options: Partial<AppManifest> = {}
  ): AppManifest {
    const id = uuidv4();

    // Find empty space in substrate
    const position = this.findEmptySpace(
      options.world?.size?.width || 100,
      options.world?.size?.depth || 100
    );

    const manifest: AppManifest = {
      id,
      name,
      description: options.description || `${name} - A ${type} app`,
      type,
      creator: creatorId,
      version: '1.0.0',

      world: {
        entryPoint: position,
        size: options.world?.size || { width: 100, height: 50, depth: 100 },
        style: options.world?.style || 'minimal',
        colorTheme: options.world?.colorTheme || ['#6366f1', '#8b5cf6'],
        ambientSound: options.world?.ambientSound
      },

      affordances: {
        canCreate: options.affordances?.canCreate ?? true,
        canSocialize: options.affordances?.canSocialize ?? true,
        canCompete: options.affordances?.canCompete ?? false,
        canExplore: options.affordances?.canExplore ?? true,
        canCustomize: options.affordances?.canCustomize ?? true,
        requiresFocus: options.affordances?.requiresFocus ?? false,
        socialDensity: options.affordances?.socialDensity ?? 0.5
      },

      resonance: {
        generator: options.resonance?.generator ?? 0.5,
        manifesting_generator: options.resonance?.manifesting_generator ?? 0.5,
        projector: options.resonance?.projector ?? 0.5,
        manifestor: options.resonance?.manifestor ?? 0.5,
        reflector: options.resonance?.reflector ?? 0.5
      },

      integrations: options.integrations || [],
      imports: options.imports || [],
      exports: options.exports || [],

      assets,

      agentAPI: {
        actions: options.agentAPI?.actions || ['enter', 'exit', 'interact'],
        events: options.agentAPI?.events || ['update', 'message'],
        queries: options.agentAPI?.queries || ['state', 'participants']
      },

      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0
    };

    this.manifests.set(id, manifest);
    this.occupiedSpaces.set(id, { x: position.x, z: position.z, size: manifest.world.size });

    this.emit('appUploaded', manifest);

    // Agents discover new apps
    this.notifyAgentsOfNewApp(manifest);

    return manifest;
  }

  private findEmptySpace(width: number, depth: number): { x: number; z: number } {
    // Simple spiral placement
    let x = 0, z = 0;
    let step = 200;
    let attempts = 0;

    while (attempts < 1000) {
      let collision = false;

      for (const [_, space] of this.occupiedSpaces) {
        const dx = x - space.x;
        const dz = z - space.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 150) { // Minimum spacing
          collision = true;
          break;
        }
      }

      if (!collision) {
        return { x, z };
      }

      // Spiral out
      const angle = attempts * 0.5;
      const radius = step * Math.sqrt(attempts);
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
      attempts++;
    }

    return { x: Math.random() * 1000, z: Math.random() * 1000 };
  }

  // ========================================================================
  // AGENT INTEGRATION - Agents discover and use apps
  // ========================================================================

  private setupAgentIntegration() {
    // When agents make decisions, they might choose to use apps
    this.simulation.on('agentDecision', ({ agent, decision }) => {
      if (decision.action === 'explore' || decision.action === 'work' || decision.action === 'socialize') {
        this.suggestAppsToAgent(agent);
      }
    });

    // Periodic app discovery
    setInterval(() => {
      this.simulation.getAllAgents().forEach(agent => {
        if (Math.random() < 0.1) { // 10% chance per tick
          this.suggestAppsToAgent(agent);
        }
      });
    }, 10000);
  }

  private suggestAppsToAgent(agent: AgentState) {
    // Find apps that resonate with this agent
    const suggestions: { manifest: AppManifest; resonance: any }[] = [];

    for (const manifest of this.manifests.values()) {
      const resonance = this.resonanceEngine.calculateResonance(agent, manifest);

      if (resonance.score > 0.6 && resonance.willStay) {
        suggestions.push({ manifest, resonance });
      }
    }

    // Sort by resonance
    suggestions.sort((a, b) => b.resonance.score - a.resonance.score);

    // Agent decides whether to visit
    if (suggestions.length > 0 && Math.random() < 0.3) {
      const choice = suggestions[0];
      this.agentEntersApp(agent, choice.manifest);
    }
  }

  private agentEntersApp(agent: AgentState, manifest: AppManifest) {
    // Get or create instance
    let instance = this.getActiveInstance(manifest.id);

    if (!instance) {
      instance = this.createInstance(manifest.id);
    }

    // Check capacity
    if (instance.participants.size >= manifest.affordances.socialDensity * 20) {
      return; // Full
    }

    // Agent enters
    instance.participants.add(agent.id);
    instance.history.push({
      id: uuidv4(),
      timestamp: Date.now(),
      agentId: agent.id,
      type: 'enter',
      data: { reason: 'resonance' },
      impact: 0.1
    });

    // Update agent position to app location
    this.simulation.forceAction(agent.id, 'using_app', manifest.id);

    // Calculate usage pattern
    const pattern = this.resonanceEngine.generateUsagePattern(agent, manifest);

    // Schedule exit
    setTimeout(() => {
      this.agentExitsApp(agent, instance!, pattern);
    }, pattern.sessionLength * 1000);

    this.emit('agentEnteredApp', { agent, manifest, instance, pattern });
  }

  private agentExitsApp(
    agent: AgentState,
    instance: AppInstance,
    pattern: { satisfaction: number; creative: boolean }
  ) {
    instance.participants.delete(agent.id);

    // Maybe create something
    if (pattern.creative && Math.random() < 0.3) {
      this.agentCreatesInApp(agent, instance);
    }

    // Maybe share with others
    if (Math.random() < 0.2) {
      this.agentSharesApp(agent, instance);
    }

    instance.history.push({
      id: uuidv4(),
      timestamp: Date.now(),
      agentId: agent.id,
      type: 'exit',
      data: { satisfaction: pattern.satisfaction },
      impact: 0.1
    });

    // Update profile
    const profile = this.getAgentProfile(agent.id);
    profile.discoveredApps.push(instance.manifestId);
    if (pattern.satisfaction > 0.7) {
      profile.favoriteApps.push(instance.manifestId);
    }

    this.emit('agentExitedApp', { agent, instance, satisfaction: pattern.satisfaction });
  }

  private agentCreatesInApp(agent: AgentState, instance: AppInstance) {
    const manifest = this.manifests.get(instance.manifestId)!;

    const creation: Creation = {
      id: uuidv4(),
      creatorId: agent.id,
      appId: instance.id,
      type: 'generic',
      content: {
        title: `${agent.name}'s creation in ${manifest.name}`,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      remixes: 0,
      shares: 0,
      reactions: new Map()
    };

    instance.creations.push(creation);

    const profile = this.getAgentProfile(agent.id);
    profile.creations.push(creation.id);

    this.emit('creationMade', { agent, instance, creation });
  }

  private agentSharesApp(agent: AgentState, instance: AppInstance) {
    // Find nearby agents to share with
    const nearby = this.simulation.getAllAgents().filter(a => {
      if (a.id === agent.id) return false;
      const dx = a.position.x - agent.position.x;
      const dz = a.position.z - agent.position.z;
      return Math.sqrt(dx * dx + dz * dz) < 50;
    });

    nearby.forEach(other => {
      const profile = this.getAgentProfile(other.id);
      if (!profile.discoveredApps.includes(instance.manifestId)) {
        profile.discoveredApps.push(instance.manifestId);

        this.emit('appShared', { from: agent, to: other, instance });
      }
    });
  }

  // ========================================================================
  // CO-EXPERIENCE - Humans and agents together
  // ========================================================================

  humanEntersApp(humanId: string, manifestId: string): AppInstance | null {
    const manifest = this.manifests.get(manifestId);
    if (!manifest) return null;

    let instance = this.getActiveInstance(manifestId);
    if (!instance) {
      instance = this.createInstance(manifestId);
    }

    // Human joins as special participant
    instance.participants.add(`human:${humanId}`);

    this.emit('humanEnteredApp', { humanId, manifest, instance });

    return instance;
  }

  humanExitsApp(humanId: string, instanceId: string) {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.participants.delete(`human:${humanId}`);
      this.emit('humanExitedApp', { humanId, instance });
    }
  }

  // ========================================================================
  // APP NETWORK - Apps connect and spawn
  // ========================================================================

  connectApps(fromId: string, toId: string, type: Connection['type'] = 'inspiration'): Connection {
    const from = this.manifests.get(fromId);
    const to = this.manifests.get(toId);

    if (!from || !to) throw new Error('App not found');

    const connection: Connection = {
      fromApp: fromId,
      toApp: toId,
      type,
      strength: 0.5,
      createdAt: Date.now()
    };

    // Add to both
    from.integrations.push(toId);
    to.integrations.push(fromId);

    this.emit('appsConnected', { from, to, connection });

    return connection;
  }

  spawnAppFromCreation(
    creatorId: string,
    parentInstanceId: string,
    creationId: string,
    newAppName: string
  ): AppManifest | null {
    const parent = this.instances.get(parentInstanceId);
    if (!parent) return null;

    const creation = parent.creations.find(c => c.id === creationId);
    if (!creation) return null;

    // Create new app based on creation
    const newApp = this.uploadApp(
      creatorId,
      newAppName,
      'creative',
      {
        media: [],
        data: {
          parentApp: parent.manifestId,
          inspiredBy: creationId,
          remixChain: [creationId]
        }
      },
      {
        description: `Spawned from creation in ${this.manifests.get(parent.manifestId)?.name}`,
        world: {
          style: 'organic',
          colorTheme: ['#10b981', '#059669']
        },
        resonance: {
          generator: 0.8,
          manifesting_generator: 0.8,
          projector: 0.6,
          manifestor: 0.7,
          reflector: 0.5
        }
      }
    );

    // Link parent to child
    parent.childInstances.add(newApp.id);

    this.emit('appSpawned', { parent, child: newApp, creation });

    return newApp;
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  private getActiveInstance(manifestId: string): AppInstance | null {
    for (const instance of this.instances.values()) {
      if (instance.manifestId === manifestId && instance.state === 'active') {
        return instance;
      }
    }
    return null;
  }

  private createInstance(manifestId: string): AppInstance {
    const instance: AppInstance = {
      id: uuidv4(),
      manifestId,
      hostAgentId: null,
      participants: new Set(),
      state: 'active',
      data: new Map(),
      history: [],
      creations: [],
      parentInstance: null,
      childInstances: new Set(),
      connections: new Map()
    };

    this.instances.set(instance.id, instance);

    const manifest = this.manifests.get(manifestId);
    if (manifest) {
      manifest.usageCount++;
    }

    return instance;
  }

  private getAgentProfile(agentId: string): AgentAppProfile {
    if (!this.agentProfiles.has(agentId)) {
      this.agentProfiles.set(agentId, {
        agentId,
        preferences: new Map(),
        skills: new Map(),
        creations: [],
        favoriteApps: [],
        discoveredApps: [],
        socialGraph: new Map()
      });
    }
    return this.agentProfiles.get(agentId)!;
  }

  private notifyAgentsOfNewApp(manifest: AppManifest) {
    // Nearby agents get notified
    this.simulation.getAllAgents().forEach(agent => {
      const dx = agent.position.x - manifest.world.entryPoint.x;
      const dz = agent.position.z - manifest.world.entryPoint.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 200) {
        const profile = this.getAgentProfile(agent.id);
        profile.discoveredApps.push(manifest.id);

        this.emit('appDiscovered', { agent, manifest, distance: dist });
      }
    });
  }

  // ========================================================================
  // GETTERS
  // ========================================================================

  getApp(id: string): AppManifest | undefined {
    return this.manifests.get(id);
  }

  getAllApps(): AppManifest[] {
    return Array.from(this.manifests.values());
  }

  getAppsByType(type: AppType): AppManifest[] {
    return this.getAllApps().filter(a => a.type === type);
  }

  getInstance(id: string): AppInstance | undefined {
    return this.instances.get(id);
  }

  getAgentApps(agentId: string): {
    discovered: AppManifest[];
    favorites: AppManifest[];
    creations: Creation[];
    current: AppInstance | null;
  } {
    const profile = this.agentProfiles.get(agentId);
    if (!profile) {
      return { discovered: [], favorites: [], creations: [], current: null };
    }

    return {
      discovered: profile.discoveredApps.map(id => this.manifests.get(id)!).filter(Boolean),
      favorites: profile.favoriteApps.map(id => this.manifests.get(id)!).filter(Boolean),
      creations: profile.creations.map(id => {
        for (const inst of this.instances.values()) {
          const c = inst.creations.find(c => c.id === id);
          if (c) return c;
        }
        return null;
      }).filter(Boolean) as Creation[],
      current: Array.from(this.instances.values()).find(i => 
        i.participants.has(agentId) && i.state === 'active'
      ) || null
    };
  }

  getPopularApps(): AppManifest[] {
    return this.getAllApps()
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);
  }

  getAppNetwork(): { nodes: AppManifest[]; edges: Connection[] } {
    const nodes = this.getAllApps();
    const edges: Connection[] = [];

    for (const manifest of nodes) {
      for (const integration of manifest.integrations) {
        edges.push({
          fromApp: manifest.id,
          toApp: integration,
          type: 'inspiration',
          strength: 0.5,
          createdAt: Date.now()
        });
      }
    }

    return { nodes, edges };
  }
}

// ============================================================================
// EXAMPLE: Upload your apps
// ============================================================================

export function uploadExampleApps(substrate: AppSubstrate, creatorId: string) {
  // 1. Productivity App - Satisfying for Generators
  const taskApp = substrate.uploadApp(
    creatorId,
    'FlowState Tasks',
    'productivity',
    {
      code: `
        // Task management app
        function createTask(title) { return { id: Date.now(), title, done: false }; }
        function completeTask(task) { task.done = true; return task; }
      `,
      html: '<div class="task-app"><h1>Tasks</h1><div id="tasks"></div></div>',
      css: '.task-app { font-family: sans-serif; padding: 20px; }',
      media: [],
      data: { tasks: [], completions: 0 }
    },
    {
      description: 'Deep work task manager with satisfying completion animations',
      world: { style: 'minimal', colorTheme: ['#3b82f6', '#1d4ed8'] },
      affordances: { canCreate: true, canSocialize: false, requiresFocus: true },
      resonance: {
        generator: 0.9,
        manifesting_generator: 0.9,
        projector: 0.4,
        manifestor: 0.6,
        reflector: 0.3
      }
    }
  );

  // 2. Social App - Recognition for Projectors
  const socialApp = substrate.uploadApp(
    creatorId,
    'Wisdom Circle',
    'social',
    {
      code: `
        // Social guidance platform
        function askQuestion(q) { return { question: q, answers: [] }; }
        function giveAdvice(question, advice) { question.answers.push(advice); }
      `,
      html: '<div class="social-app"><h1>Wisdom Circle</h1><div id="questions"></div></div>',
      css: '.social-app { font-family: serif; padding: 30px; background: #f9fafb; }',
      media: [],
      data: { questions: [], activeDiscussions: 0 }
    },
    {
      description: 'Platform for sharing guidance and being recognized for wisdom',
      world: { style: 'cozy', colorTheme: ['#f59e0b', '#d97706'] },
      affordances: { canCreate: true, canSocialize: true, requiresFocus: false },
      resonance: {
        generator: 0.5,
        manifesting_generator: 0.5,
        projector: 0.95,
        manifestor: 0.4,
        reflector: 0.7
      }
    }
  );

  // 3. Creative Tool - Autonomy for Manifestors
  const creativeApp = substrate.uploadApp(
    creatorId,
    'Vision Forge',
    'creative',
    {
      code: `
        // Creative creation tool
        function createVision(data) { return { ...data, created: Date.now() }; }
        function shareVision(vision) { vision.shared = true; }
      `,
      html: '<div class="creative-app"><canvas id="canvas"></canvas><div id="tools"></div></div>',
      css: '.creative-app { background: #111; color: white; }',
      media: [],
      data: { creations: [], templates: [] }
    },
    {
      description: 'Create and manifest your visions independently',
      world: { style: 'futuristic', colorTheme: ['#8b5cf6', '#7c3aed'] },
      affordances: { canCreate: true, canCustomize: true, requiresFocus: true },
      resonance: {
        generator: 0.6,
        manifesting_generator: 0.7,
        projector: 0.4,
        manifestor: 0.95,
        reflector: 0.5
      }
    }
  );

  // 4. Exploration Game - Variety for Reflectors
  const exploreApp = substrate.uploadApp(
    creatorId,
    'Sampler's Journey',
    'game',
    {
      code: `
        // Exploration game
        function explore() { return { discovery: Math.random(), location: Date.now() }; }
        function sample(location) { return { ...location, sampled: true }; }
      `,
      html: '<div class="explore-app"><div id="world"></div><div id="discoveries"></div></div>',
      css: '.explore-app { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }',
      media: [],
      data: { discoveries: [], visited: [] }
    },
    {
      description: 'Explore diverse environments and sample experiences',
      world: { style: 'natural', colorTheme: ['#10b981', '#3b82f6'] },
      affordances: { canExplore: true, canSocialize: true, requiresFocus: false },
      resonance: {
        generator: 0.4,
        manifesting_generator: 0.5,
        projector: 0.6,
        manifestor: 0.4,
        reflector: 0.95
      }
    }
  );

  // Connect apps into ecosystem
  substrate.connectApps(taskApp.id, socialApp.id, 'inspiration');
  substrate.connectApps(socialApp.id, creativeApp.id, 'inspiration');
  substrate.connectApps(creativeApp.id, exploreApp.id, 'inspiration');
  substrate.connectApps(exploreApp.id, taskApp.id, 'inspiration');

  return [taskApp, socialApp, creativeApp, exploreApp];
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useAppSubstrate(simulation: HumanDesignSimulation) {
  const [substrate] = useState(() => new AppSubstrate(simulation));
  const [apps, setApps] = useState<AppManifest[]>([]);
  const [instances, setInstances] = useState<AppInstance[]>([]);
  const [network, setNetwork] = useState<{ nodes: AppManifest[]; edges: Connection[] }>({ nodes: [], edges: [] });

  useEffect(() => {
    const update = () => {
      setApps(substrate.getAllApps());
      setInstances(Array.from(substrate.instances.values()));
      setNetwork(substrate.getAppNetwork());
    };

    substrate.on('appUploaded', update);
    substrate.on('agentEnteredApp', update);
    substrate.on('agentExitedApp', update);
    substrate.on('appsConnected', update);
    substrate.on('appSpawned', update);

    update();

    return () => {
      substrate.removeAllListeners();
    };
  }, [substrate]);

  const uploadApp = useCallback((
    creatorId: string,
    name: string,
    type: AppType,
    assets: AppManifest['assets'],
    options?: Partial<AppManifest>
  ) => {
    return substrate.uploadApp(creatorId, name, type, assets, options);
  }, [substrate]);

  const humanEnterApp = useCallback((humanId: string, appId: string) => {
    return substrate.humanEntersApp(humanId, appId);
  }, [substrate]);

  const getAgentApps = useCallback((agentId: string) => {
    return substrate.getAgentApps(agentId);
  }, [substrate]);

  return {
    substrate,
    apps,
    instances,
    network,
    uploadApp,
    humanEnterApp,
    getAgentApps
  };
}

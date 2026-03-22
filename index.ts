/**
 * UNIVERSAL APP SUBSTRATE - Main Export
 * 
 * Everything you need to run the complete system:
 * - Human Design Agent Simulation
 * - Interactive Influence System  
 * - Universal App Substrate
 * - Complete UI Components
 */

// Core Simulation
export { 
  HumanDesignSimulation,
  HumanDesignGenerator,
  NeuralBehaviorController,
  BiologicalSimulator,
  type AgentState,
  type HumanDesignChart,
  type BiologicalNeeds,
  type HumanDesignType,
  type Authority,
  type Gender
} from './engine/HumanDesignSimulation';

// Influence System
export { 
  InfluenceManager,
  AgentResponseGenerator,
  type HumanPlayer,
  type Conversation,
  type Nudge,
  type ChoiceEvent,
  useInfluenceManager
} from './engine/InfluenceManager';

// App Substrate
export { 
  AppSubstrate,
  AppResonanceEngine,
  type AppManifest,
  type AppInstance,
  type AppType,
  type Creation,
  type Connection,
  uploadExampleApps,
  useAppSubstrate
} from './engine/AppSubstrate';

// Integration
export { 
  SimulationWorldAdapter,
  runExample,
  useSimulation
} from './engine/SimulationIntegration';

// UI Components
export { 
  SimulationDashboard,
  Lobby,
  AgentCard,
  ChatInterface,
  NudgeInterface,
  AdviceInterface,
  ChoiceInterface,
  CallInterface,
  App
} from './components/SimulationUI';

export {
  SubstrateDashboard,
  AppUploader,
  AppCard,
  NetworkView,
  CoExperienceView,
  initializeDemoSubstrate
} from './components/SubstrateUI';

// 3D Components
export { World3D, cleanupWorld3D } from './components/World3D';
export { CharacterCreator } from './components/CharacterCreator';
export { ReadyPlayerMeAvatar } from './components/ReadyPlayerMeAvatar';

// Legacy/Embodied World Engine
export {
  EmbodiedWorldEngine,
  FiveWEngine,
  OntologicalAddressGenerator,
  IntentClassifier,
  type Agent,
  type Place,
  type FiveW,
  type SimulationEvent,
  type IntentMode,
  type Element,
  ELEMENT_COLORS
} from './engine/EmbodiedWorldEngine';

// ============================================================================
// QUICK START
// ============================================================================

/**
 * Minimal setup to get running:
 * 
 * import { HumanDesignSimulation, AppSubstrate, SubstrateDashboard } from './index';
 * 
 * // 1. Create simulation
 * const sim = new HumanDesignSimulation({ dayLength: 24 * 60 * 1000 });
 * await sim.initialize();
 * 
 * // 2. Create substrate
 * const substrate = new AppSubstrate(sim);
 * 
 * // 3. Upload your apps
 * substrate.uploadApp('user123', 'My App', 'creative', {
 *   code: '// your app code',
 *   html: '<div>My App</div>',
 *   css: 'body { margin: 0; }',
 *   media: [],
 *   data: {}
 * });
 * 
 * // 4. Start simulation
 * sim.start();
 * 
 * // 5. Render UI
 * // <SubstrateDashboard simulation={sim} substrate={substrate} influence={influence} />
 */

/**
 * Complete React App:
 * 
 * import { App } from './index';
 * 
 * function MyApp() {
 *   return <App />;
 * }
 */

// Shared Session
export { SharedSessionManager, SharedSessionView, useSharedSession, detectFileType, formatTime, fileTypeIcon } from './components/SharedSessionUI';
export type { SharedFile, SharedSession, SessionMessage, AgentReaction, FileType, PlaybackState } from './engine/SharedSession';

// Synthia Server Client
export * from './engine/SynthiaClient';

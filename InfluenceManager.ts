/**
 * INTERACTIVE INFLUENCE SYSTEM
 * 
 * Humans can:
 * - Call/text agents (agents respond via their HD authority)
 * - Give nudges/advice (agents decide to follow based on type/strategy)
 * - Ask for advice (agents give guidance from their chart)
 * - Make choices that affect agent learning
 * - Multiple humans can join the same world
 */

import { EventEmitter } from 'events';
import { askAsAgent, askOracle, saveMemory } from './SynthiaClient';
import { v4 as uuidv4 } from 'uuid';
import { HumanDesignSimulation, AgentState, WorldPlace, HumanDesignType, Authority } from './HumanDesignSimulation';

// ============================================================================
// TYPES - Human-Agent Interaction
// ============================================================================

export interface HumanPlayer {
  id: string;
  name: string;
  avatar: string;
  position: { x: number; y: number; z: number };
  currentPlace: string | null;
  activeCall: string | null; // Agent ID they're talking to
  influenceScore: number; // How much agents trust this human
  conversationHistory: Map<string, Conversation[]>; // agentId -> messages
}

export interface Conversation {
  id: string;
  from: 'human' | 'agent';
  content: string;
  timestamp: number;
  type: 'text' | 'call' | 'nudge' | 'advice_request' | 'choice';
  sentiment: number; // -1 to 1
  acknowledged: boolean;
  actedUpon: boolean | null; // Did agent follow the advice?
}

export interface Nudge {
  id: string;
  fromHumanId: string;
  toAgentId: string;
  content: string;
  type: 'suggestion' | 'warning' | 'encouragement' | 'command';
  urgency: number; // 0-1
  timestamp: number;
  accepted: boolean | null;
  reason: string | null; // Why agent accepted/rejected
}

export interface ChoiceEvent {
  id: string;
  agentId: string;
  humanId: string;
  question: string;
  options: string[];
  selectedOption: number | null;
  timestamp: number;
  timeout: number;
  consequence: string | null;
}

export interface AgentLearning {
  humanTrust: Map<string, number>; // humanId -> trust score (-1 to 1)
  adviceQuality: Map<string, number>; // Track which humans give good advice
  patternRecognition: Map<string, number>; // Learned patterns
  lastInteraction: Map<string, number>; // humanId -> timestamp
}

// ============================================================================
// AGENT RESPONSE GENERATOR (Based on Human Design)
// ============================================================================

export class AgentResponseGenerator {
  generateResponse(
    agent: AgentState,
    human: HumanPlayer,
    message: string,
    type: 'text' | 'call' | 'advice_request'
  ): {
    response: string;
    sentiment: number;
    willFollowAdvice: boolean;
    internalMonologue: string;
  } {
    const chart = agent.chart;
    const trust = agent.memory.people.get(human.id)?.relationship || 0;

    // Different response patterns based on type
    switch (chart.type) {
      case 'generator':
      case 'manifesting_generator':
        return this.generatorResponse(agent, human, message, type, trust);

      case 'projector':
        return this.projectorResponse(agent, human, message, type, trust);

      case 'manifestor':
        return this.manifestorResponse(agent, human, message, type, trust);

      case 'reflector':
        return this.reflectorResponse(agent, human, message, type, trust);

      default:
        return this.defaultResponse(agent, human, message, trust);
    }
  }

  private generatorResponse(
    agent: AgentState,
    human: HumanPlayer,
    message: string,
    type: string,
    trust: number
  ) {
    const lowerMsg = message.toLowerCase();

    // Generators need to respond - check if message is a question/request
    const isQuestion = /\?|what|how|should|can you|will you/i.test(message);
    const isCommand = /do this|go there|eat now|sleep now/i.test(message);

    let response = '';
    let willFollow = false;
    let sentiment = 0;
    let monologue = '';

    if (isCommand && trust < 0.5) {
      // Generators resist commands without trust
      response = "Hmm... I need to feel into that first. Let me check my gut response.";
      willFollow = false;
      sentiment = -0.2;
      monologue = `My sacral isn't responding to ${human.name}'s command. I should wait for something that feels right.`;
    } else if (isQuestion) {
      // Generators respond to questions
      const sacralResponse = Math.random() > 0.3 ? 'uh-huh' : 'un-un';
      if (sacralResponse === 'uh-huh') {
        response = "Uh-huh, that feels right to me. I'll do that.";
        willFollow = true;
        sentiment = 0.6;
        monologue = `${human.name}'s question resonates with my sacral. This feels satisfying.`;
      } else {
        response = "Un-un, that doesn't feel right for me right now.";
        willFollow = false;
        sentiment = -0.1;
        monologue = `My sacral says no to ${human.name}'s suggestion. Not the right energy.`;
      }
    } else {
      response = "Thanks for reaching out. I'm doing my thing right now.";
      willFollow = trust > 0.7;
      sentiment = 0.3;
      monologue = `Casual chat with ${human.name}. I'll consider their advice if I trust them.`;
    }

    return { response, sentiment, willFollowAdvice: willFollow, internalMonologue: monologue };
  }

  private projectorResponse(
    agent: AgentState,
    human: HumanPlayer,
    message: string,
    type: string,
    trust: number
  ) {
    const isInvitation = /would you like|invite|join me|i'd value your input|what do you think/i.test(message);
    const isCommand = /do this|you should|you must/i.test(message);

    let response = '';
    let willFollow = false;
    let sentiment = 0;
    let monologue = '';

    // Projectors need recognition and invitation
    if (isInvitation) {
      if (trust > 0.3) {
        response = "Thank you for the invitation. I can see what you're asking... here's my guidance...";
        willFollow = true;
        sentiment = 0.8;
        monologue = `${human.name} recognized me with a proper invitation. I can guide them now.`;
      } else {
        response = "I appreciate the invitation, but I need to feel recognized first.";
        willFollow = false;
        sentiment = 0.2;
        monologue = `The invitation is there but I don't feel fully seen by ${human.name} yet.`;
      }
    } else if (isCommand) {
      // Projectors HATE commands - major bitterness trigger
      response = "I don't respond well to being told what to do. If you want my guidance, invite me properly.";
      willFollow = false;
      sentiment = -0.7;
      monologue = `${human.name} is trying to control me. Classic not-self behavior for them.`;
    } else {
      // Casual conversation
      if (agent.needs.recognition < 5) {
        response = "It's nice to hear from you. I've been observing the patterns around here...";
        sentiment = 0.4;
        monologue = `Chatting with ${human.name}. I need more recognition though.`;
      } else {
        response = "Yes, I see you. What would you like to know?";
        sentiment = 0.6;
        monologue = `I feel recognized. Ready to guide ${human.name}.`;
      }
      willFollow = trust > 0.6;
    }

    return { response, sentiment, willFollowAdvice: willFollow, internalMonologue: monologue };
  }

  private manifestorResponse(
    agent: AgentState,
    human: HumanPlayer,
    message: string,
    type: string,
    trust: number
  ) {
    const isInforming = /just so you know|i wanted to tell you|heads up/i.test(message);
    const isQuestioning = /why|how come|what are you doing/i.test(message);

    let response = '';
    let willFollow = false;
    let sentiment = 0;
    let monologue = '';

    // Manifestors need to inform, not be questioned
    if (isQuestioning && trust < 0.6) {
      response = "I don't need to explain myself to you. I act when I'm moved to act.";
      willFollow = false;
      sentiment = -0.4;
      monologue = `${human.name} is questioning me. I don't answer to them.`;
    } else if (isInforming) {
      response = "Thank you for informing me. I appreciate being kept in the loop.";
      willFollow = true;
      sentiment = 0.7;
      monologue = `${human.name} understands how to communicate with me. Good.`;
    } else {
      response = "I'm initiating something important right now. I'll inform you when it's done.";
      willFollow = trust > 0.5;
      sentiment = 0.3;
      monologue = `Engaging with ${human.name} on my terms.`;
    }

    return { response, sentiment, willFollowAdvice: willFollow, internalMonologue: monologue };
  }

  private reflectorResponse(
    agent: AgentState,
    human: HumanPlayer,
    message: string,
    type: string,
    trust: number
  ) {
    // Reflectors need time and lunar cycle
    const moonPhase = this.getMoonPhase();

    let response = '';
    let willFollow = false;
    let sentiment = 0;
    let monologue = '';

    if (moonPhase === 'full') {
      response = "The moon is full and I'm feeling clear. Here's what I see in your situation...";
      willFollow = trust > 0.2;
      sentiment = 0.6;
      monologue = `Full moon clarity. I can reflect ${human.name}'s situation clearly.`;
    } else if (moonPhase === 'new') {
      response = "It's a new moon. I'm still sampling this cycle. Ask me again in a few days.";
      willFollow = false;
      sentiment = 0.1;
      monologue = `New moon - I'm not ready to commit to advice for ${human.name}.`;
    } else {
      response = "I'm tasting this moment. Let me reflect on what you're asking...";
      willFollow = trust > 0.7;
      sentiment = 0.3;
      monologue = `Sampling ${human.name}'s energy and the environment.`;
    }

    return { response, sentiment, willFollowAdvice: willFollow, internalMonologue: monologue };
  }

  private defaultResponse(agent: AgentState, human: HumanPlayer, message: string, trust: number) {
    return {
      response: "Thanks for your message. I'll consider it.",
      sentiment: 0.2,
      willFollowAdvice: trust > 0.5,
      internalMonologue: `Generic response to ${human.name}.`
    };
  }

  private getMoonPhase(): string {
    const phases = ['new', 'waxing', 'full', 'waning'];
    return phases[Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) % 4];
  }

  // Generate advice based on agent's chart
  generateAdvice(agent: AgentState, human: HumanPlayer, situation: string): {
    advice: string;
    basedOn: string;
    confidence: number;
  } {
    const chart = agent.chart;

    // Advice based on defined centers
    const definedCenters = Object.entries(chart.centers)
      .filter(([_, defined]) => defined)
      .map(([center]) => center);

    let advice = '';
    let basedOn = '';

    if (definedCenters.includes('spleen')) {
      advice += "Trust your intuition in this moment. ";
      basedOn += "splenic knowing; ";
    }
    if (definedCenters.includes('solarPlexus')) {
      advice += "Wait for emotional clarity before deciding. ";
      basedOn += "emotional wave; ";
    }
    if (definedCenters.includes('ajna')) {
      advice += "Your mind can see the patterns clearly here. ";
      basedOn += "mental awareness; ";
    }
    if (definedCenters.includes('sacral')) {
      advice += "Check what your gut response is. ";
      basedOn += "sacral response; ";
    }

    // Add type-specific guidance
    switch (chart.type) {
      case 'generator':
        advice += "Wait for something to respond to, then pour your energy into it.";
        break;
      case 'projector':
        advice += "Wait for the invitation that recognizes your gifts.";
        break;
      case 'manifestor':
        advice += "Inform those who will be impacted before you act.";
        break;
      case 'reflector':
        advice += "Give yourself a full lunar cycle to see clearly.";
        break;
    }

    return {
      advice: advice || "I'm still learning about this situation.",
      basedOn: basedOn || "my experience",
      confidence: definedCenters.length / 9
    };
  }
}

// ============================================================================
// INFLUENCE MANAGER - Main controller for human-agent interaction
// ============================================================================

export class InfluenceManager extends EventEmitter {
  private simulation: HumanDesignSimulation;
  private humans: Map<string, HumanPlayer> = new Map();
  private conversations: Map<string, Conversation[]> = new Map();
  private nudges: Map<string, Nudge[]> = new Map();
  private activeChoices: Map<string, ChoiceEvent> = new Map();
  private responseGen: AgentResponseGenerator;

  constructor(simulation: HumanDesignSimulation) {
    super();
    this.simulation = simulation;
    this.responseGen = new AgentResponseGenerator();
  }

  // ========================================================================
  // HUMAN PLAYER MANAGEMENT
  // ========================================================================

  joinWorld(name: string, avatar: string = '👤'): HumanPlayer {
    const human: HumanPlayer = {
      id: uuidv4(),
      name,
      avatar,
      position: { x: 0, y: 0, z: 0 },
      currentPlace: null,
      activeCall: null,
      influenceScore: 0.5,
      conversationHistory: new Map()
    };

    this.humans.set(human.id, human);
    this.emit('humanJoined', human);

    return human;
  }

  leaveWorld(humanId: string) {
    const human = this.humans.get(humanId);
    if (human) {
      // End any active calls
      if (human.activeCall) {
        this.endCall(humanId, human.activeCall);
      }
      this.humans.delete(humanId);
      this.emit('humanLeft', human);
    }
  }

  moveHuman(humanId: string, x: number, z: number) {
    const human = this.humans.get(humanId);
    if (human) {
      human.position = { x, y: 0, z };

      // Check if entered a place
      const place = this.simulation.getAllPlaces().find(p => {
        const dx = x - p.position.x;
        const dz = z - p.position.z;
        return Math.abs(dx) < p.size.width / 2 && Math.abs(dz) < p.size.depth / 2;
      });

      if (place && human.currentPlace !== place.id) {
        human.currentPlace = place.id;
        this.emit('humanEnteredPlace', { human, place });
      }
    }
  }

  // ========================================================================
  // COMMUNICATION
  // ========================================================================

  async sendText(humanId: string, agentId: string, message: string): Promise<{
    conversation: Conversation;
    agentResponse: Conversation;
  }> {
    const human = this.humans.get(humanId);
    const agent = this.simulation.getAgent(agentId);

    if (!human || !agent) throw new Error('Human or agent not found');

    // Create human message
    const humanMsg: Conversation = {
      id: uuidv4(),
      from: 'human',
      content: message,
      timestamp: Date.now(),
      type: 'text',
      sentiment: this.analyzeSentiment(message),
      acknowledged: false,
      actedUpon: null
    };

    // Store conversation
    if (!this.conversations.has(agentId)) {
      this.conversations.set(agentId, []);
    }
    this.conversations.get(agentId)!.push(humanMsg);

    // Add to human history
    if (!human.conversationHistory.has(agentId)) {
      human.conversationHistory.set(agentId, []);
    }
    human.conversationHistory.get(agentId)!.push(humanMsg);

    // Generate agent response
    const response = this.responseGen.generateResponse(agent, human, message, 'text');

    // Update relationship based on sentiment
    this.updateRelationship(agent, humanId, response.sentiment);

    // Create agent response message
    const agentMsg: Conversation = {
      id: uuidv4(),
      from: 'agent',
      content: response.response,
      timestamp: Date.now(),
      type: 'text',
      sentiment: response.sentiment,
      acknowledged: true,
      actedUpon: null
    };

    this.conversations.get(agentId)!.push(agentMsg);
    human.conversationHistory.get(agentId)!.push(agentMsg);

    // Emit events
    this.emit('messageSent', { human, agent, message: humanMsg });
    this.emit('messageReceived', { human, agent, message: agentMsg, internalMonologue: response.internalMonologue });

    // If agent will follow advice, queue it
    if (response.willFollowAdvice) {
      this.queueNudge(humanId, agentId, message, 'suggestion', 0.7);
    }

    return { conversation: humanMsg, agentResponse: agentMsg };
  }

  startCall(humanId: string, agentId: string): boolean {
    const human = this.humans.get(humanId);
    const agent = this.simulation.getAgent(agentId);

    if (!human || !agent) return false;
    if (human.activeCall) return false; // Already on a call

    // Check if agent accepts call based on their state
    if (agent.isSleeping) {
      this.emit('callRejected', { human, agent, reason: 'sleeping' });
      return false;
    }

    human.activeCall = agentId;

    // Generate greeting based on type
    const greeting = this.generateGreeting(agent, human);

    this.emit('callStarted', { human, agent, greeting });

    return true;
  }

  endCall(humanId: string, agentId: string) {
    const human = this.humans.get(humanId);
    if (human && human.activeCall === agentId) {
      const agent = this.simulation.getAgent(agentId);
      human.activeCall = null;
      this.emit('callEnded', { human, agent });
    }
  }

  // ========================================================================
  // NUDGES & ADVICE
  // ========================================================================

  giveNudge(
    humanId: string,
    agentId: string,
    content: string,
    type: Nudge['type'] = 'suggestion',
    urgency: number = 0.5
  ): Nudge {
    const human = this.humans.get(humanId);
    const agent = this.simulation.getAgent(agentId);

    if (!human || !agent) throw new Error('Human or agent not found');

    const nudge: Nudge = {
      id: uuidv4(),
      fromHumanId: humanId,
      toAgentId: agentId,
      content,
      type,
      urgency,
      timestamp: Date.now(),
      accepted: null,
      reason: null
    };

    if (!this.nudges.has(agentId)) {
      this.nudges.set(agentId, []);
    }
    this.nudges.get(agentId)!.push(nudge);

    // Agent decides whether to accept
    const decision = this.agentDecidesOnNudge(agent, human, nudge);
    nudge.accepted = decision.accept;
    nudge.reason = decision.reason;

    // If accepted, influence agent behavior
    if (decision.accept) {
      this.applyNudge(agent, nudge);
      this.updateRelationship(agent, humanId, 0.2);
    } else {
      this.updateRelationship(agent, humanId, -0.1);
    }

    this.emit('nudgeGiven', { nudge, human, agent, decision });

    return nudge;
  }

  askForAdvice(humanId: string, agentId: string, situation: string): {
    advice: string;
    basedOn: string;
    confidence: number;
    conversation: Conversation;
  } {
    const human = this.humans.get(humanId);
    const agent = this.simulation.getAgent(agentId);

    if (!human || !agent) throw new Error('Human or agent not found');

    // Generate advice — try real AI first
    const heuristicGuidance = this.responseGen.generateAdvice(agent, human, situation);
    let aiAdvice = '';
    try {
      const definedCenters = Object.entries(agent.chart.centers)
        .filter(([,v]) => v).map(([k]) => k);
      aiAdvice = await askAsAgent({
        agentName: agent.name,
        hdType: agent.chart.type,
        authority: agent.chart.authority,
        definedCenters,
        gates: agent.chart.gates,
        message: situation,
        context: `Give specific guidance on this situation from your HD wisdom.`,
        userId: humanId,
      });
    } catch {}
    const guidance = {
      ...heuristicGuidance,
      advice: aiAdvice || heuristicGuidance.advice,
    };

    const conversation: Conversation = {
      id: uuidv4(),
      from: 'agent',
      content: guidance.advice,
      timestamp: Date.now(),
      type: 'advice_request',
      sentiment: 0.6,
      acknowledged: true,
      actedUpon: null
    };

    // Store
    if (!human.conversationHistory.has(agentId)) {
      human.conversationHistory.set(agentId, []);
    }
    human.conversationHistory.get(agentId)!.push(conversation);

    // Projectors gain recognition from being asked
    if (agent.chart.type === 'projector') {
      agent.needs.recognition = Math.min(10, agent.needs.recognition + 1);
    }

    this.emit('adviceGiven', { human, agent, situation, guidance });

    return { ...guidance, conversation };
  }

  // ========================================================================
  // CHOICES & CONSEQUENCES
  // ========================================================================

  presentChoice(
    humanId: string,
    agentId: string,
    question: string,
    options: string[],
    timeoutSeconds: number = 30
  ): ChoiceEvent {
    const human = this.humans.get(humanId);
    const agent = this.simulation.getAgent(agentId);

    if (!human || !agent) throw new Error('Human or agent not found');

    const choice: ChoiceEvent = {
      id: uuidv4(),
      agentId,
      humanId,
      question,
      options,
      selectedOption: null,
      timestamp: Date.now(),
      timeout: timeoutSeconds * 1000,
      consequence: null
    };

    this.activeChoices.set(choice.id, choice);

    // Agent considers options based on their design
    const preference = this.agentChooses(agent, options);

    this.emit('choicePresented', { choice, human, agent, preference });

    // Auto-resolve if timeout
    setTimeout(() => {
      if (this.activeChoices.has(choice.id) && choice.selectedOption === null) {
        this.resolveChoice(choice.id, preference, 'timeout');
      }
    }, choice.timeout);

    return choice;
  }

  makeChoice(choiceId: string, optionIndex: number, humanId: string): boolean {
    const choice = this.activeChoices.get(choiceId);
    if (!choice) return false;
    if (choice.humanId !== humanId) return false;

    return this.resolveChoice(choiceId, optionIndex, 'human');
  }

  private resolveChoice(
    choiceId: string,
    optionIndex: number,
    resolvedBy: string
  ): boolean {
    const choice = this.activeChoices.get(choiceId);
    if (!choice) return false;

    choice.selectedOption = optionIndex;

    const agent = this.simulation.getAgent(choice.agentId);
    const human = this.humans.get(choice.humanId);

    // Calculate consequence
    const consequence = this.calculateConsequence(agent!, choice, optionIndex);
    choice.consequence = consequence;

    // Apply to agent
    this.applyConsequence(agent!, consequence);

    // Learning
    if (agent) {
      agent.memory.longTerm.set(`choice_${choiceId}`, {
        question: choice.question,
        chosen: choice.options[optionIndex],
        consequence,
        resolvedBy
      });
    }

    this.activeChoices.delete(choiceId);
    this.emit('choiceResolved', { choice, agent, human, consequence });

    return true;
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  private analyzeSentiment(message: string): number {
    const positive = /good|great|awesome|love|happy|thanks|please/i.test(message);
    const negative = /bad|hate|angry|stupid|wrong|don't/i.test(message);

    if (positive && !negative) return 0.6;
    if (negative && !positive) return -0.6;
    return 0;
  }

  private updateRelationship(agent: AgentState, humanId: string, delta: number) {
    const rel = agent.memory.people.get(humanId);
    if (rel) {
      rel.relationship = Math.max(-1, Math.min(1, rel.relationship + delta));
    } else {
      agent.memory.people.set(humanId, {
        lastSeen: Date.now(),
        relationship: delta
      });
    }
  }

  private generateGreeting(agent: AgentState, human: HumanPlayer): string {
    const trust = agent.memory.people.get(human.id)?.relationship || 0;

    if (trust > 0.7) {
      return `Hello ${human.name}! It's good to see you.`;
    } else if (trust > 0.3) {
      return `Hi ${human.name}. What can I do for you?`;
    } else {
      return `Yes? I'm ${agent.name}.`;
    }
  }

  private agentDecidesOnNudge(
    agent: AgentState,
    human: HumanPlayer,
    nudge: Nudge
  ): { accept: boolean; reason: string } {
    const trust = agent.memory.people.get(human.id)?.relationship || 0;
    const chart = agent.chart;

    // Type-specific decision making
    switch (chart.type) {
      case 'generator':
        // Generators respond to sacral - check if nudge "feels" right
        const feelsRight = Math.random() < (0.3 + trust * 0.5);
        if (feelsRight) {
          return { accept: true, reason: 'My sacral responded to this suggestion' };
        } else {
          return { accept: false, reason: "My sacral isn't responding to this" };
        }

      case 'projector':
        // Projectors need invitation AND recognition
        if (nudge.type === 'command') {
          return { accept: false, reason: 'I need an invitation, not a command' };
        }
        if (trust < 0.4) {
          return { accept: false, reason: "I don't feel recognized by you yet" };
        }
        return { accept: true, reason: 'Your invitation recognizes my guidance' };

      case 'manifestor':
        // Manifestors do what they want, but appreciate being informed
        if (nudge.type === 'warning' || nudge.type === 'encouragement') {
          return { accept: Math.random() < 0.7, reason: 'I appreciate being informed' };
        }
        return { accept: Math.random() < 0.3, reason: 'I act on my own terms' };

      case 'reflector':
        // Reflectors need time - urgent nudges rejected
        if (nudge.urgency > 0.7) {
          return { accept: false, reason: 'I need time to reflect on this' };
        }
        return { accept: Math.random() < (0.2 + trust * 0.6), reason: 'This feels right after reflection' };

      default:
        return { accept: trust > 0.5, reason: 'Based on our relationship' };
    }
  }

  private queueNudge(humanId: string, agentId: string, content: string, type: Nudge['type'], urgency: number) {
    // Store for later application
    // In real implementation, this would queue for the agent's next decision
  }

  private applyNudge(agent: AgentState, nudge: Nudge) {
    // Influence the agent's next decision
    // This would integrate with the neural controller
    agent.memory.shortTerm.unshift(`Accepted advice: ${nudge.content}`);
  }

  private agentChooses(agent: AgentState, options: string[]): number {
    // Agent picks based on their design
    const chart = agent.chart;

    // Emotional authority - wait for clarity
    if (chart.authority === 'emotional') {
      return Math.floor(Math.random() * options.length); // Random after waiting
    }

    // Sacral - respond to options
    if (chart.authority === 'sacral') {
      // Pick what "resounds"
      return Math.floor(Math.random() * options.length);
    }

    // Splenic - spontaneous
    if (chart.authority === 'splenic') {
      return 0; // First instinct
    }

    return Math.floor(Math.random() * options.length);
  }

  private calculateConsequence(agent: AgentState, choice: ChoiceEvent, optionIndex: number): string {
    const consequences = [
      'positive_learning',
      'negative_learning',
      'relationship_boost',
      'need_fulfilled',
      'unexpected_discovery'
    ];
    return consequences[Math.floor(Math.random() * consequences.length)];
  }

  private applyConsequence(agent: AgentState, consequence: string) {
    switch (consequence) {
      case 'positive_learning':
        agent.needs.joy = Math.min(10, agent.needs.joy + 1);
        agent.needs.purpose = Math.min(10, agent.needs.purpose + 0.5);
        break;
      case 'need_fulfilled':
        agent.needs.hunger = Math.min(10, agent.needs.hunger + 2);
        break;
      case 'relationship_boost':
        agent.needs.social = Math.min(10, agent.needs.social + 2);
        break;
    }
  }

  // ========================================================================
  // GETTERS
  // ========================================================================

  getHuman(id: string): HumanPlayer | undefined {
    return this.humans.get(id);
  }

  getAllHumans(): HumanPlayer[] {
    return Array.from(this.humans.values());
  }

  getConversation(agentId: string): Conversation[] {
    return this.conversations.get(agentId) || [];
  }

  getNudges(agentId: string): Nudge[] {
    return this.nudges.get(agentId) || [];
  }

  getActiveChoices(): ChoiceEvent[] {
    return Array.from(this.activeChoices.values());
  }
}

// ============================================================================
// REACT HOOK for multiplayer interaction
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useInfluenceManager(simulation: HumanDesignSimulation) {
  const [manager] = useState(() => new InfluenceManager(simulation));
  const [humans, setHumans] = useState<HumanPlayer[]>([]);
  const [activeCalls, setActiveCalls] = useState<Map<string, string>>(new Map());
  const [pendingChoices, setPendingChoices] = useState<ChoiceEvent[]>([]);

  useEffect(() => {
    const updateHumans = () => setHumans(manager.getAllHumans());
    const updateChoices = () => setPendingChoices(manager.getActiveChoices());

    manager.on('humanJoined', updateHumans);
    manager.on('humanLeft', updateHumans);
    manager.on('callStarted', ({ human, agent }) => {
      setActiveCalls(prev => new Map(prev).set(human.id, agent.id));
    });
    manager.on('callEnded', ({ human }) => {
      setActiveCalls(prev => {
        const next = new Map(prev);
        next.delete(human.id);
        return next;
      });
    });
    manager.on('choicePresented', updateChoices);
    manager.on('choiceResolved', updateChoices);

    return () => {
      manager.removeAllListeners();
    };
  }, [manager]);

  const join = useCallback((name: string, avatar?: string) => {
    return manager.joinWorld(name, avatar);
  }, [manager]);

  const leave = useCallback((humanId: string) => {
    manager.leaveWorld(humanId);
  }, [manager]);

  const sendMessage = useCallback(async (humanId: string, agentId: string, message: string) => {
    return manager.sendText(humanId, agentId, message);
  }, [manager]);

  const call = useCallback((humanId: string, agentId: string) => {
    return manager.startCall(humanId, agentId);
  }, [manager]);

  const endCall = useCallback((humanId: string, agentId: string) => {
    manager.endCall(humanId, agentId);
  }, [manager]);

  const nudge = useCallback((humanId: string, agentId: string, content: string, type?: any, urgency?: number) => {
    return manager.giveNudge(humanId, agentId, content, type, urgency);
  }, [manager]);

  const askAdvice = useCallback((humanId: string, agentId: string, situation: string) => {
    return manager.askForAdvice(humanId, agentId, situation);
  }, [manager]);

  const presentChoice = useCallback((humanId: string, agentId: string, question: string, options: string[]) => {
    return manager.presentChoice(humanId, agentId, question, options);
  }, [manager]);

  const makeChoice = useCallback((choiceId: string, optionIndex: number, humanId: string) => {
    return manager.makeChoice(choiceId, optionIndex, humanId);
  }, [manager]);

  return {
    manager,
    humans,
    activeCalls,
    pendingChoices,
    join,
    leave,
    sendMessage,
    call,
    endCall,
    nudge,
    askAdvice,
    presentChoice,
    makeChoice
  };
}

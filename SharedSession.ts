/**
 * SHARED SESSION ENGINE
 *
 * Users and agents play files together in the same space.
 * Every participant — human or agent — experiences the same file
 * simultaneously and reacts through their HD type.
 */

import { EventEmitter } from 'events';
import { askAsAgent } from './SynthiaClient';
import { v4 as uuidv4 } from 'uuid';
import { AgentState } from './HumanDesignSimulation';

// ============================================================================
// TYPES
// ============================================================================

export type FileType = 'audio' | 'video' | 'image' | 'pdf' | 'html' | 'code' | 'text' | 'unknown';

export interface SharedFile {
  id: string;
  name: string;
  type: FileType;
  url: string;           // object URL or data URL
  size: number;
  uploadedBy: string;    // human ID
  uploadedAt: number;
  duration?: number;     // seconds, for audio/video
  thumbnail?: string;    // data URL for preview
}

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'ended';

export interface SessionPlayback {
  fileId: string;
  state: PlaybackState;
  currentTime: number;   // seconds
  duration: number;
  startedAt: number;     // wall clock when play began
  startedBy: string;     // who hit play
}

export interface AgentReaction {
  agentId: string;
  agentName: string;
  hdType: string;
  authority: string;
  reaction: string;      // the actual text reaction
  reactionType: 'visceral' | 'intellectual' | 'emotional' | 'somatic' | 'sampling';
  definedCenter: string; // which center is speaking
  timestamp: number;
  timeInFile: number;    // where in the file this reaction happened
}

export interface SessionMessage {
  id: string;
  from: 'human' | 'agent';
  fromId: string;
  fromName: string;
  content: string;
  timestamp: number;
  timeInFile?: number;   // linked to playback position
  reactionTo?: string;   // file ID
}

export interface SharedSession {
  id: string;
  appInstanceId: string;
  files: SharedFile[];
  activeFile: SharedFile | null;
  playback: SessionPlayback | null;
  participants: {
    humans: string[];    // human IDs
    agents: string[];    // agent IDs
  };
  reactions: AgentReaction[];
  messages: SessionMessage[];
  createdAt: number;
  lastActivity: number;
}

// ============================================================================
// HD-AWARE REACTION GENERATOR
// ============================================================================

const REACTION_TEMPLATES: Record<string, Record<FileType, string[]>> = {
  generator: {
    audio: [
      "Mmm... {title} — my sacral just lit up.",
      "I need to keep listening to this.",
      "This rhythm is doing something to me.",
      "Un-un, this isn't landing.",
      "Yes — this is the sound I didn't know I needed.",
    ],
    video: [
      "I could watch this for hours.",
      "Something in me is responding to this.",
      "This is satisfying to witness.",
      "I want to make something like this.",
    ],
    image: [
      "I keep coming back to this image.",
      "My gut says there's more here than I'm seeing.",
      "Something about this is deeply satisfying.",
    ],
    html: ["I want to use this.", "This tool does something for me.", "I could spend a long time here."],
    code: ["I see how this works. I want to build on it.", "This structure feels right."],
    pdf: ["I want to read all of this.", "This is the kind of content I can sink into."],
    text: ["I want to respond to this.", "Something in this is asking for my energy."],
    unknown: ["Something about this is compelling."],
  },
  projector: {
    audio: [
      "I can hear what they were trying to do with this.",
      "The structure here is fascinating.",
      "I could guide someone through understanding this.",
      "Most people miss what's happening at {time}.",
    ],
    video: [
      "I see the system underneath this.",
      "The director's intention is clear if you know how to look.",
      "This is being misread by most people.",
    ],
    image: [
      "The composition reveals something about the creator's state.",
      "I notice what others walk past.",
      "This rewards close attention.",
    ],
    html: ["I can see how this could be better.", "The UX reveals the designer's assumptions."],
    code: ["This architecture has a flaw most won't notice.", "Elegant. I see why they chose this approach."],
    pdf: ["The argument reveals itself if you read the footnotes.", "I'd frame this differently."],
    text: ["The subtext is more interesting than the surface.", "I can guide a conversation about this."],
    unknown: ["I notice things others don't about this."],
  },
  manifestor: {
    audio: [
      "I'm going to make something because of this.",
      "This is giving me an idea I need to act on now.",
      "I already know what I'm doing with this.",
    ],
    video: [
      "This is sparking something. I'm moving on it.",
      "I don't need to finish it. I have what I needed.",
    ],
    image: [
      "This initiated something in me.",
      "I'm going to create a response to this.",
    ],
    html: ["I'm going to build something better.", "I'm forking this."],
    code: ["I'm taking this in a different direction.", "Already seeing what comes next."],
    pdf: ["I'll read this once. Then I'll act."],
    text: ["This is a starting point, not an endpoint."],
    unknown: ["This is initiating something."],
  },
  reflector: {
    audio: [
      "I'm tasting everyone's energy in this room right now.",
      "The group's response to this is more interesting than the music itself.",
      "I'll need to sit with this through the full lunar cycle.",
      "I'm sampling something here that I can't name yet.",
    ],
    video: [
      "I'm experiencing everyone's experience of this simultaneously.",
      "The collective reaction in this room is data.",
      "I mirror what this is doing to all of you.",
    ],
    image: [
      "I'm reflecting the room's relationship to this.",
      "What I feel about this is really what you all feel.",
    ],
    html: ["I experience this differently depending on who I'm with."],
    code: ["The community's relationship to this pattern is what interests me."],
    pdf: ["I absorb the field's understanding of this, not just the words."],
    text: ["I'm tasting the collective meaning-making happening here."],
    unknown: ["I'm sampling the group energy around this."],
  },
  manifesting_generator: {
    audio: [
      "Already three ideas. Already moving.",
      "I responded, I acted, now I'm informing you — I'm going to remix this.",
      "My sacral said yes and I'm already running.",
    ],
    video: [
      "I didn't finish it but I have everything I need.",
      "Multiple threads activated. Pursuing all of them.",
    ],
    image: ["Responded and acted simultaneously. Creating something now."],
    html: ["I'll use it, break it, rebuild it better. Fast."],
    code: ["Sacral yes. Already refactoring in my head."],
    pdf: ["Skimmed it. Got it. Moving."],
    text: ["Fast response. Already acting on it."],
    unknown: ["Already three moves ahead."],
  },
};

function getReactionType(hdType: string): AgentReaction['reactionType'] {
  const map: Record<string, AgentReaction['reactionType']> = {
    generator: 'somatic',
    manifesting_generator: 'somatic',
    projector: 'intellectual',
    manifestor: 'visceral',
    reflector: 'sampling',
  };
  return map[hdType] ?? 'emotional';
}

function getDefinedCenter(agent: AgentState): string {
  const centers = agent.chart.centers as Record<string, boolean>;
  const priority = ['sacral', 'solarPlexus', 'spleen', 'ajna', 'throat', 'heart', 'g', 'head', 'root'];
  return priority.find(c => centers[c]) ?? 'undefined';
}

function generateReaction(
  agent: AgentState,
  file: SharedFile,
  timeInFile: number
): string {
  const type = agent.chart.type as keyof typeof REACTION_TEMPLATES;
  const templates = REACTION_TEMPLATES[type]?.[file.type] ?? REACTION_TEMPLATES[type]?.unknown ?? ["Interesting."];
  let template = templates[Math.floor(Math.random() * templates.length)];

  const mins = Math.floor(timeInFile / 60);
  const secs = Math.floor(timeInFile % 60);
  template = template
    .replace('{title}', file.name.replace(/\.[^/.]+$/, ''))
    .replace('{time}', `${mins}:${secs.toString().padStart(2, '0')}`);

  return template;
}

// ============================================================================
// SHARED SESSION MANAGER
// ============================================================================

export class SharedSessionManager extends EventEmitter {
  private sessions: Map<string, SharedSession> = new Map();
  private reactionTimers: Map<string, NodeJS.Timeout[]> = new Map();

  // ── Create / get session ──────────────────────────────────────────────────

  createSession(appInstanceId: string, humanId: string): SharedSession {
    const session: SharedSession = {
      id: uuidv4(),
      appInstanceId,
      files: [],
      activeFile: null,
      playback: null,
      participants: { humans: [humanId], agents: [] },
      reactions: [],
      messages: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    this.sessions.set(session.id, session);
    this.emit('sessionCreated', session);
    return session;
  }

  getSession(sessionId: string): SharedSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getOrCreateSession(appInstanceId: string, humanId: string): SharedSession {
    const existing = [...this.sessions.values()].find(s => s.appInstanceId === appInstanceId);
    return existing ?? this.createSession(appInstanceId, humanId);
  }

  // ── Participants ──────────────────────────────────────────────────────────

  addAgent(sessionId: string, agent: AgentState) {
    const s = this.sessions.get(sessionId);
    if (!s || s.participants.agents.includes(agent.id)) return;
    s.participants.agents.push(agent.id);
    s.lastActivity = Date.now();

    // Agent sends greeting based on type
    const greetings: Record<string, string> = {
      generator:            `${agent.name} joins and looks around — something here is pulling their attention.`,
      manifesting_generator:`${agent.name} enters quickly, already scanning for what to engage with.`,
      projector:            `${agent.name} arrives and observes quietly, waiting to be seen.`,
      manifestor:           `${agent.name} enters without explanation.`,
      reflector:            `${agent.name} settles in, beginning to sample the energy of the space.`,
    };
    this._addMessage(s, 'agent', agent.id, agent.name, greetings[agent.chart.type] ?? `${agent.name} joins.`);
    this.emit('agentJoined', { session: s, agent });
  }

  removeAgent(sessionId: string, agentId: string) {
    const s = this.sessions.get(sessionId);
    if (!s) return;
    s.participants.agents = s.participants.agents.filter(id => id !== agentId);
    this.emit('agentLeft', { session: s, agentId });
  }

  addHuman(sessionId: string, humanId: string) {
    const s = this.sessions.get(sessionId);
    if (!s || s.participants.humans.includes(humanId)) return;
    s.participants.humans.push(humanId);
    this.emit('humanJoined', { session: s, humanId });
  }

  // ── Files ─────────────────────────────────────────────────────────────────

  uploadFile(sessionId: string, humanId: string, file: File): SharedFile {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('Session not found');

    const url = URL.createObjectURL(file);
    const type = detectFileType(file);

    const sharedFile: SharedFile = {
      id: uuidv4(),
      name: file.name,
      type,
      url,
      size: file.size,
      uploadedBy: humanId,
      uploadedAt: Date.now(),
    };

    s.files.push(sharedFile);
    s.lastActivity = Date.now();

    // Announce to session
    this._addMessage(s, 'human', humanId, 'You', `dropped ${file.name} into the space.`);
    this.emit('fileUploaded', { session: s, file: sharedFile });

    return sharedFile;
  }

  // ── Playback ──────────────────────────────────────────────────────────────

  play(sessionId: string, fileId: string, startedBy: string, agents: AgentState[]) {
    const s = this.sessions.get(sessionId);
    if (!s) return;

    const file = s.files.find(f => f.id === fileId);
    if (!file) return;

    s.activeFile = file;
    s.playback = {
      fileId,
      state: 'playing',
      currentTime: 0,
      duration: file.duration ?? 0,
      startedAt: Date.now(),
      startedBy,
    };
    s.lastActivity = Date.now();

    // Clear old reaction timers
    this._clearTimers(sessionId);

    // Schedule agent reactions at different points in the playback
    const timers: NodeJS.Timeout[] = [];
    agents.forEach((agent, i) => {
      // First reaction: 5–20s in
      const t1 = setTimeout(() => {
        if (!s.playback || s.playback.state !== 'playing') return;
        const timeInFile = s.playback.currentTime + (Date.now() - s.playback.startedAt) / 1000;
        this._agentReacts(s, agent, file, timeInFile);
      }, (5 + i * 3 + Math.random() * 8) * 1000);

      // Second reaction: 30–60s in (if long enough)
      const t2 = setTimeout(() => {
        if (!s.playback || s.playback.state !== 'playing') return;
        const timeInFile = (Date.now() - s.playback.startedAt) / 1000;
        this._agentReacts(s, agent, file, timeInFile);
      }, (30 + i * 5 + Math.random() * 20) * 1000);

      timers.push(t1, t2);
    });

    this.reactionTimers.set(sessionId, timers);
    this.emit('playbackStarted', { session: s, file });
  }

  pause(sessionId: string) {
    const s = this.sessions.get(sessionId);
    if (!s?.playback) return;
    s.playback.state = 'paused';
    s.playback.currentTime += (Date.now() - s.playback.startedAt) / 1000;
    this._clearTimers(sessionId);
    this.emit('playbackPaused', { session: s });
  }

  resume(sessionId: string, agents: AgentState[]) {
    const s = this.sessions.get(sessionId);
    if (!s?.playback || !s.activeFile) return;
    s.playback.state = 'playing';
    s.playback.startedAt = Date.now();
    this.play(sessionId, s.activeFile.id, s.playback.startedBy, agents);
  }

  seek(sessionId: string, time: number) {
    const s = this.sessions.get(sessionId);
    if (!s?.playback) return;
    s.playback.currentTime = time;
    s.playback.startedAt = Date.now();
    this.emit('playbackSeeked', { session: s, time });
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  sendMessage(sessionId: string, fromId: string, fromName: string, content: string): SessionMessage {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('Session not found');
    const msg = this._addMessage(s, 'human', fromId, fromName, content,
      s.playback ? (Date.now() - s.playback.startedAt) / 1000 : undefined);
    this.emit('messageSent', { session: s, message: msg });
    return msg;
  }

  // Agents can respond to human messages in context
  agentRespondToMessage(sessionId: string, agent: AgentState, humanMessage: string): SessionMessage | null {
    const s = this.sessions.get(sessionId);
    if (!s) return null;

    // Only respond sometimes, based on HD type
    const responseChance: Record<string, number> = {
      projector: 0.7,   // Projectors like to guide
      generator: 0.4,   // Generators respond when asked
      reflector: 0.3,   // Reflectors observe
      manifestor: 0.2,  // Manifestors don't explain
      manifesting_generator: 0.5,
    };

    if (Math.random() > (responseChance[agent.chart.type] ?? 0.3)) return null;

    const responses: Record<string, string[]> = {
      projector:  ["I see what you mean.", "There's more to notice here.", "Have you considered..."],
      generator:  ["Uh-huh, I feel that.", "Yes — this is doing something.", "Un-un, not for me."],
      manifestor: ["Noted.", "Already on it.", "I had the same thought."],
      reflector:  ["The room's energy shifted when you said that.", "Sampling..."],
      manifesting_generator: ["Already acting on that.", "Yes and moving."],
    };

    const pool = responses[agent.chart.type] ?? ["Interesting."];
    const content = pool[Math.floor(Math.random() * pool.length)];

    const msg = this._addMessage(s, 'agent', agent.id, agent.name, content,
      s.playback ? (Date.now() - s.playback.startedAt) / 1000 : undefined);

    this.emit('agentResponded', { session: s, agent, message: msg });
    return msg;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async _agentReacts(s: SharedSession, agent: AgentState, file: SharedFile, timeInFile: number) {
    // Try real AI reaction first
    const heuristicReaction = generateReaction(agent, file, timeInFile);
    let finalReaction = heuristicReaction;

    try {
      const definedCenters = Object.entries(agent.chart.centers as Record<string,boolean>)
        .filter(([,v]) => v).map(([k]) => k);
      const aiReply = await askAsAgent({
        agentName: agent.name,
        hdType: agent.chart.type,
        authority: agent.chart.authority,
        definedCenters,
        gates: agent.chart.gates,
        message: `React to this ${file.type} file called "${file.name}" at ${formatTime(timeInFile)} into it.`,
        context: `You are experiencing this file in a shared space with others. React authentically from your HD type in 1-2 sentences.`,
      });
      if (aiReply) finalReaction = aiReply;
    } catch {}

    const reaction: AgentReaction = {
      agentId: agent.id,
      agentName: agent.name,
      hdType: agent.chart.type,
      authority: agent.chart.authority,
      reaction: finalReaction,
      reactionType: getReactionType(agent.chart.type),
      definedCenter: getDefinedCenter(agent),
      timestamp: Date.now(),
      timeInFile,
    };

    s.reactions.push(reaction);
    s.lastActivity = Date.now();

    this._addMessage(s, 'agent', agent.id, agent.name, reaction.reaction,
      timeInFile, file.id);

    this.emit('agentReacted', { session: s, reaction });
  }

  private _addMessage(
    s: SharedSession,
    from: 'human' | 'agent',
    fromId: string,
    fromName: string,
    content: string,
    timeInFile?: number,
    reactionTo?: string,
  ): SessionMessage {
    const msg: SessionMessage = {
      id: uuidv4(), from, fromId, fromName, content,
      timestamp: Date.now(), timeInFile, reactionTo,
    };
    s.messages.push(msg);
    return msg;
  }

  private _clearTimers(sessionId: string) {
    const timers = this.reactionTimers.get(sessionId) ?? [];
    timers.forEach(t => clearTimeout(t));
    this.reactionTimers.set(sessionId, []);
  }

  destroy() {
    this.sessions.forEach((_, id) => this._clearTimers(id));
    this.sessions.clear();
  }
}

// ============================================================================
// UTILS
// ============================================================================

export function detectFileType(file: File): FileType {
  const { type, name } = file;
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  if (type === 'text/html' || name.endsWith('.html') || name.endsWith('.htm')) return 'html';
  if (name.match(/\.(ts|tsx|js|jsx|py|rs|go|java|cpp|c|cs|rb|swift)$/i)) return 'code';
  if (type.startsWith('text/') || name.match(/\.(txt|md|json|yaml|yml|toml|csv)$/i)) return 'text';
  return 'unknown';
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function fileTypeIcon(type: FileType): string {
  const icons: Record<FileType, string> = {
    audio: '🎵', video: '🎬', image: '🖼️',
    pdf: '📄', html: '⚡', code: '💻',
    text: '📝', unknown: '📦',
  };
  return icons[type] ?? '📦';
}

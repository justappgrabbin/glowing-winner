'use client';

/**
 * APP SUBSTRATE UI
 * 
 * Complete interface for:
 * - Uploading your apps
 * - Seeing agents use your apps
 * - Co-experiencing apps with agents
 * - App network visualization
 * - Agent discovery and sharing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, Box, Users, Share2, Network, Zap, 
  MapPin, Heart, Star, Activity, Plus, X,
  Code, Image, Music, FileText, Gamepad2, Briefcase
} from 'lucide-react';
import { useAppSubstrate, AppManifest, AppInstance, AppType } from '../engine/AppSubstrate';
import { useSimulation, AgentState } from '../engine/SimulationIntegration';
import { useInfluenceManager } from '../engine/InfluenceManager';
import { useSharedSession, SharedSessionView } from './SharedSessionUI';

// ============================================================================
// APP UPLOADER - Upload your apps to the substrate
// ============================================================================

interface AppUploaderProps {
  onUpload: (name: string, type: AppType, assets: any, options: any) => void;
  onClose: () => void;
}

export function AppUploader({ onUpload, onClose }: AppUploaderProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AppType>('creative');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [html, setHtml] = useState('<div>My App</div>');
  const [css, setCss] = useState('body { margin: 0; }');
  const [resonance, setResonance] = useState({
    generator: 0.5,
    manifesting_generator: 0.5,
    projector: 0.5,
    manifestor: 0.5,
    reflector: 0.5
  });

  const appTypes: { id: AppType; icon: any; label: string; description: string }[] = [
    { id: 'productivity', icon: Briefcase, label: 'Productivity', description: 'Task management, tools, work' },
    { id: 'creative', icon: Image, label: 'Creative', description: 'Art, design, creation tools' },
    { id: 'social', icon: Users, label: 'Social', description: 'Communication, community' },
    { id: 'game', icon: Gamepad2, label: 'Game', description: 'Play, exploration, fun' },
    { id: 'knowledge', icon: FileText, label: 'Knowledge', description: 'Learning, reference, data' },
    { id: 'utility', icon: Zap, label: 'Utility', description: 'Tools, helpers, functions' }
  ];

  const handleSubmit = () => {
    if (!name.trim()) return;

    onUpload(name, type, {
      code,
      html,
      css,
      media: [],
      data: {}
    }, {
      description,
      resonance,
      affordances: {
        canCreate: ['creative', 'game'].includes(type),
        canSocialize: ['social', 'game'].includes(type),
        canExplore: ['game', 'knowledge'].includes(type),
        requiresFocus: ['productivity', 'creative'].includes(type)
      }
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-500/30">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-400" />
            Upload App to Substrate
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">App Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome App"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">App Type</label>
            <div className="grid grid-cols-3 gap-3">
              {appTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    type === t.id 
                      ? 'border-purple-500 bg-purple-500/20' 
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <t.icon className={`w-5 h-5 mb-2 ${type === t.id ? 'text-purple-400' : 'text-gray-500'}`} />
                  <div className="text-sm font-medium text-white">{t.label}</div>
                  <div className="text-xs text-gray-500">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your app do?"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
              rows={2}
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              <Code className="w-4 h-4 inline mr-1" />
              JavaScript Code
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="// Your app logic here
function init() {
  return 'Hello World';
}"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-purple-500 resize-none"
              rows={6}
            />
          </div>

          {/* Resonance Tuning */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Agent Resonance (Who will love this app?)
            </label>
            <div className="space-y-3">
              {Object.entries(resonance).map(([key, value]) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-sm text-gray-400 w-32 capitalize">
                    {key.replace('_', ' ')}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={value}
                    onChange={(e) => setResonance({ ...resonance, [key]: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-sm text-white w-12 text-right">{(value * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Upload to Substrate
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// APP CARD - Display app with live usage
// ============================================================================

interface AppCardProps {
  app: AppManifest;
  instances: AppInstance[];
  activeAgents: AgentState[];
  onEnter: () => void;
  isHumanInside: boolean;
}

export function AppCard({ app, instances, activeAgents, onEnter, isHumanInside }: AppCardProps) {
  const [expanded, setExpanded] = useState(false);

  const activeInstance = instances.find(i => i.manifestId === app.id && i.state === 'active');
  const participantCount = activeInstance?.participants.size || 0;
  const totalCreations = instances.reduce((sum, i) => sum + i.creations.length, 0);

  const typeColors: Record<AppType, string> = {
    productivity: 'bg-blue-500',
    creative: 'bg-purple-500',
    social: 'bg-yellow-500',
    game: 'bg-green-500',
    tool: 'bg-gray-500',
    knowledge: 'bg-indigo-500',
    market: 'bg-orange-500',
    utility: 'bg-cyan-500'
  };

  return (
    <div className={`bg-gray-800 rounded-lg border transition-all ${
      isHumanInside ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-gray-700'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg ${typeColors[app.type]} flex items-center justify-center`}>
              <Box className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{app.name}</h3>
              <p className="text-xs text-gray-400">{app.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded capitalize">
                  {app.type}
                </span>
                <span className="text-xs text-gray-500">
                  v{app.version}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {isHumanInside && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                You are here
              </span>
            )}
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Users className="w-4 h-4" />
              {participantCount}
            </div>
          </div>
        </div>

        {/* Live Activity */}
        {activeAgents.length > 0 && (
          <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
            <div className="text-xs text-gray-400 mb-2">Currently active:</div>
            <div className="flex flex-wrap gap-2">
              {activeAgents.slice(0, 5).map(agent => (
                <div key={agent.id} className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded-full">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs text-white font-bold">
                    {agent.name[0]}
                  </div>
                  <span className="text-xs text-gray-300">{agent.name}</span>
                  <span className="text-xs text-gray-500">({agent.chart.type.slice(0, 3)})</span>
                </div>
              ))}
              {activeAgents.length > 5 && (
                <span className="text-xs text-gray-500">+{activeAgents.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-white">{app.usageCount}</div>
            <div className="text-xs text-gray-500">Total Uses</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-white">{totalCreations}</div>
            <div className="text-xs text-gray-500">Creations</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-white">{app.integrations.length}</div>
            <div className="text-xs text-gray-500">Connections</div>
          </div>
        </div>

        {/* Resonance Bars */}
        {expanded && (
          <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
            <div className="text-xs text-gray-400 mb-2">Agent Resonance:</div>
            <div className="space-y-2">
              {Object.entries(app.resonance).map(([type, score]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24 capitalize">
                    {type.replace('_', ' ')}
                  </span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${score * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8">{(score * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onEnter}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              isHumanInside
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {isHumanInside ? 'Return to App' : 'Enter App'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-2 bg-gray-700 text-gray-400 hover:bg-gray-600 rounded-lg transition-colors"
          >
            {expanded ? 'Less' : 'More'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// APP NETWORK VISUALIZATION
// ============================================================================

interface NetworkViewProps {
  apps: AppManifest[];
  connections: any[];
  onSelectApp: (app: AppManifest) => void;
}

export function NetworkView({ apps, connections, onSelectApp }: NetworkViewProps) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Network className="w-5 h-5 text-purple-400" />
        App Ecosystem Network
      </h3>

      <div className="relative h-96 bg-gray-800/50 rounded-lg overflow-hidden">
        {/* Simple force-directed visualization */}
        <svg className="w-full h-full">
          {/* Connections */}
          {connections.map((conn, i) => {
            const from = apps.find(a => a.id === conn.fromApp);
            const to = apps.find(a => a.id === conn.toApp);
            if (!from || !to) return null;

            // Calculate positions (simplified layout)
            const fromIndex = apps.indexOf(from);
            const toIndex = apps.indexOf(to);
            const fromX = 100 + (fromIndex % 3) * 200;
            const fromY = 100 + Math.floor(fromIndex / 3) * 150;
            const toX = 100 + (toIndex % 3) * 200;
            const toY = 100 + Math.floor(toIndex / 3) * 150;

            return (
              <line
                key={i}
                x1={fromX}
                y1={fromY}
                x2={toX}
                y2={toY}
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeOpacity="0.5"
              />
            );
          })}

          {/* Nodes */}
          {apps.map((app, i) => {
            const x = 100 + (i % 3) * 200;
            const y = 100 + Math.floor(i / 3) * 150;

            return (
              <g key={app.id} onClick={() => onSelectApp(app)} className="cursor-pointer">
                <circle
                  cx={x}
                  cy={y}
                  r="30"
                  fill="#1f2937"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                />
                <text
                  x={x}
                  y={y + 5}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                >
                  {app.name.slice(0, 8)}
                </text>
                <text
                  x={x}
                  y={y + 50}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize="8"
                >
                  {app.type}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 text-sm text-gray-400">
        {apps.length} apps • {connections.length} connections • Agents flow between connected apps
      </div>
    </div>
  );
}

// ============================================================================
// CO-EXPERIENCE VIEW - Human and agents together in app
// ============================================================================

interface CoExperienceViewProps {
  app: AppManifest;
  instance: AppInstance;
  agents: AgentState[];
  humanId: string;
  onExit: () => void;
  onInteract: (agentId: string) => void;
}

export function CoExperienceView({ app, instance, agents, humanId, onExit, onInteract }: CoExperienceViewProps) {
  const [chatMessage, setChatMessage] = useState('');
  const [chatLog, setChatLog] = useState<{ from: string; message: string; time: number }[]>([]);
  const [showSharedSession, setShowSharedSession] = useState(false);
  const { manager: sessionManager, openSession } = useSharedSession();
  const sharedSession = openSession(instance.id, humanId);

  const handleSend = () => {
    if (!chatMessage.trim()) return;

    setChatLog(prev => [...prev, { from: 'You', message: chatMessage, time: Date.now() }]);
    setChatMessage('');

    // Agents might respond
    setTimeout(() => {
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      if (randomAgent && Math.random() < 0.3) {
        const responses = [
          "Interesting perspective!",
          "I'm exploring this too.",
          "What do you think about the features?",
          "This app feels good to use.",
          "Have you tried creating something here?"
        ];
        setChatLog(prev => [...prev, {
          from: randomAgent.name,
          message: responses[Math.floor(Math.random() * responses.length)],
          time: Date.now()
        }]);
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex">
      {/* App View */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold">{app.name}</h2>
              <p className="text-xs text-gray-400">Co-experiencing with {agents.length} agents</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSharedSession(true)}
              className="px-4 py-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg transition-colors text-sm font-medium"
            >
              🎵 Play Together
            </button>
            <button
              onClick={onExit}
              className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
            >
              Exit App
            </button>
          </div>
        </div>

        {/* App Content (iframe or rendered) */}
        <div className="flex-1 bg-gray-800 m-4 rounded-lg overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Box className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">{app.name}</p>
              <p className="text-sm">Your app is running here</p>
              <p className="text-xs text-gray-600 mt-2">Agents are using this alongside you</p>
            </div>
          </div>

          {/* Agent Presence Indicators */}
          <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => onInteract(agent.id)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-900/90 backdrop-blur rounded-full border border-gray-700 hover:border-purple-500 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs text-white font-bold">
                  {agent.name[0]}
                </div>
                <span className="text-xs text-gray-300">{agent.name}</span>
                <span className="text-xs text-gray-500">({agent.chart.type.slice(0, 3)})</span>
                {agent.currentAction && (
                  <span className="text-xs text-purple-400">• {agent.currentAction}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Live Chat
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatLog.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Say hello to the agents!</p>
            </div>
          )}

          {chatLog.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === 'You' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-lg ${
                msg.from === 'You' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300'
              }`}>
                <div className="text-xs opacity-70 mb-1">{msg.from}</div>
                <div className="text-sm">{msg.message}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Message..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={handleSend}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showSharedSession && (
        <SharedSessionView
          sessionManager={sessionManager}
          sessionId={sharedSession.id}
          humanId={humanId}
          humanName="You"
          agents={agents}
          onClose={() => setShowSharedSession(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// MAIN SUBSTRATE DASHBOARD
// ============================================================================

interface SubstrateDashboardProps {
  simulation: ReturnType<typeof useSimulation>;
  substrate: ReturnType<typeof useAppSubstrate>;
  influence: ReturnType<typeof useInfluenceManager>;
}

export function SubstrateDashboard({ simulation, substrate, influence }: SubstrateDashboardProps) {
  const { agents, worldTime } = simulation;
  const { apps, instances, network, uploadApp, humanEnterApp, getAgentApps } = substrate;
  const { humans, join, currentHumanId } = influence;

  const [showUploader, setShowUploader] = useState(false);
  const [activeApp, setActiveApp] = useState<{ app: AppManifest; instance: AppInstance } | null>(null);
  const [view, setView] = useState<'grid' | 'network'>('grid');
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);

  // Join as human on mount
  useEffect(() => {
    if (!currentHumanId) {
      join('Observer');
    }
  }, []);

  const handleEnterApp = (app: AppManifest) => {
    const instance = humanEnterApp(currentHumanId!, app.id);
    if (instance) {
      setActiveApp({ app, instance });
    }
  };

  const handleExitApp = () => {
    if (activeApp && currentHumanId) {
      substrate.substrate.humanExitsApp(currentHumanId, activeApp.instance.id);
      setActiveApp(null);
    }
  };

  // Get agents in each app
  const getAgentsInApp = (appId: string) => {
    const instance = instances.find(i => i.manifestId === appId && i.state === 'active');
    if (!instance) return [];

    return agents.filter(a => instance.participants.has(a.id));
  };

  // Check if human is in app
  const isHumanInApp = (appId: string) => {
    const instance = instances.find(i => i.manifestId === appId);
    return instance?.participants.has(`human:${currentHumanId}`) || false;
  };

  if (activeApp) {
    return (
      <CoExperienceView
        app={activeApp.app}
        instance={activeApp.instance}
        agents={getAgentsInApp(activeApp.app.id)}
        humanId={currentHumanId!}
        onExit={handleExitApp}
        onInteract={(agentId) => setSelectedAgent(agents.find(a => a.id === agentId) || null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-purple-400">Universal App Substrate</h1>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{apps.length} apps</span>
              <span>•</span>
              <span>{agents.length} agents</span>
              <span>•</span>
              <span>Day {Math.floor(worldTime / 24)} {Math.floor(worldTime % 24)}:00</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-1 rounded text-sm transition-colors ${view === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setView('network')}
                className={`px-3 py-1 rounded text-sm transition-colors ${view === 'network' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                Network
              </button>
            </div>

            <button
              onClick={() => setShowUploader(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Upload App
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map(app => (
              <AppCard
                key={app.id}
                app={app}
                instances={instances.filter(i => i.manifestId === app.id)}
                activeAgents={getAgentsInApp(app.id)}
                onEnter={() => handleEnterApp(app)}
                isHumanInside={isHumanInApp(app.id)}
              />
            ))}

            {apps.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-500">
                <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No apps yet</p>
                <p className="text-sm mt-2">Upload your first app to the substrate</p>
                <button
                  onClick={() => setShowUploader(true)}
                  className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                >
                  Upload App
                </button>
              </div>
            )}
          </div>
        ) : (
          <NetworkView
            apps={apps}
            connections={network.edges}
            onSelectApp={(app) => handleEnterApp(app)}
          />
        )}

        {/* Agent Activity Feed */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-gray-900 rounded-lg border border-gray-800 p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Live Agent Activity
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {instances.slice(0, 10).map(instance => {
                const app = apps.find(a => a.id === instance.manifestId);
                const recentEvents = instance.history.slice(-3);

                return (
                  <div key={instance.id} className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{app?.name}</span>
                      <span className="text-xs text-gray-500">
                        {instance.participants.size} active
                      </span>
                    </div>
                    <div className="space-y-1">
                      {recentEvents.map((event, i) => (
                        <div key={i} className="text-xs text-gray-400 flex items-center gap-2">
                          <span className="text-purple-400">
                            {simulation.agents.find(a => a.id === event.agentId)?.name}
                          </span>
                          <span>{event.type}</span>
                          <span className="text-gray-600">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Popular Apps
            </h3>
            <div className="space-y-2">
              {apps
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 5)
                .map((app, i) => (
                  <div key={app.id} className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded-lg cursor-pointer">
                    <span className="text-lg font-bold text-gray-600">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="text-sm text-white">{app.name}</div>
                      <div className="text-xs text-gray-500">{app.usageCount} uses</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showUploader && (
        <AppUploader
          onUpload={uploadApp}
          onClose={() => setShowUploader(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE: Initialize with demo apps
// ============================================================================

export function initializeDemoSubstrate(substrate: ReturnType<typeof useAppSubstrate>, creatorId: string) {
  if (substrate.apps.length === 0) {
    // Upload example apps
    const taskApp = substrate.uploadApp(
      creatorId,
      'FlowState Tasks',
      'productivity',
      {
        code: `function createTask(t) { return {id: Date.now(), title: t, done: false}; }`,
        html: '<div class="task-app"><h1>Tasks</h1><div id="tasks"></div></div>',
        css: '.task-app { padding: 20px; }',
        media: [],
        data: {}
      },
      {
        description: 'Deep work task manager',
        resonance: { generator: 0.9, manifesting_generator: 0.9, projector: 0.4, manifestor: 0.6, reflector: 0.3 }
      }
    );

    const socialApp = substrate.uploadApp(
      creatorId,
      'Wisdom Circle',
      'social',
      {
        code: `function ask(q) { return {q, answers: []}; }`,
        html: '<div class="social"><h1>Wisdom Circle</h1></div>',
        css: '.social { padding: 30px; background: #f9fafb; }',
        media: [],
        data: {}
      },
      {
        description: 'Share guidance and be recognized',
        resonance: { generator: 0.5, manifesting_generator: 0.5, projector: 0.95, manifestor: 0.4, reflector: 0.7 }
      }
    );

    // Connect them
    substrate.substrate.connectApps(taskApp.id, socialApp.id, 'inspiration');
  }
}

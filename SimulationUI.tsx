'use client';

/**
 * MULTIPLAYER UI INTEGRATION
 * 
 * Complete React components for:
 * - Lobby/room system
 * - Chat interface with agents
 * - Voice call simulation
 * - Nudge/advice interface
 * - Choice/consequence UI
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Phone, PhoneOff, MessageCircle, Send, Users, 
  MapPin, Heart, Brain, Zap, Star, AlertCircle,
  CheckCircle, XCircle, Clock, Volume2, VolumeX
} from 'lucide-react';
import { useInfluenceManager, HumanPlayer, Conversation, ChoiceEvent } from '../engine/InfluenceManager';
import { useSimulation, AgentState, WorldPlace } from '../engine/SimulationIntegration';

// ============================================================================
// LOBBY COMPONENT - Multiplayer room
// ============================================================================

interface LobbyProps {
  onJoin: (name: string) => void;
  humans: HumanPlayer[];
  currentHumanId: string | null;
}

export function Lobby({ onJoin, humans, currentHumanId }: LobbyProps) {
  const [name, setName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = () => {
    if (name.trim()) {
      setIsJoining(true);
      onJoin(name.trim());
    }
  };

  if (currentHumanId) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Active Observers ({humans.length})
          </h3>
          <div className="flex gap-2">
            {humans.map(h => (
              <div 
                key={h.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  h.id === currentHumanId 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-700 text-gray-300'
                }`}
                title={h.name}
              >
                {h.name[0]}
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-400">
          {humans.length === 1 
            ? "You're the only observer. Invite friends to join!" 
            : `${humans.length - 1} other observer${humans.length > 2 ? 's' : ''} online`}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-purple-500/30 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        Enter the Simulation
      </h2>
      <p className="text-gray-400 mb-6 text-center">
        Join as an observer to interact with the agents
      </p>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-4"
        onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
      />

      <button
        onClick={handleJoin}
        disabled={!name.trim() || isJoining}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {isJoining ? 'Joining...' : 'Join World'}
      </button>
    </div>
  );
}

// ============================================================================
// AGENT CARD - Interactive agent display
// ============================================================================

interface AgentCardProps {
  agent: AgentState;
  isSelected: boolean;
  isCalling: boolean;
  onSelect: () => void;
  onCall: () => void;
  onMessage: () => void;
  onNudge: () => void;
  onAskAdvice: () => void;
  distance?: number;
}

export function AgentCard({ 
  agent, 
  isSelected, 
  isCalling,
  onSelect, 
  onCall, 
  onMessage, 
  onNudge,
  onAskAdvice,
  distance 
}: AgentCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'generator': 'bg-green-500',
      'manifesting_generator': 'bg-orange-500',
      'projector': 'bg-blue-500',
      'manifestor': 'bg-red-500',
      'reflector': 'bg-purple-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const getCriticalNeeds = () => {
    const critical = [];
    if (agent.needs.hunger < 3) critical.push('hungry');
    if (agent.needs.thirst < 3) critical.push('thirsty');
    if (agent.needs.sleepiness > 7) critical.push('tired');
    if (agent.needs.bladder > 7) critical.push('needs bathroom');
    if (agent.needs.social < 3) critical.push('lonely');
    return critical;
  };

  const criticalNeeds = getCriticalNeeds();

  return (
    <div 
      className={`bg-gray-800 rounded-lg p-4 border transition-all cursor-pointer ${
        isSelected ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-gray-700 hover:border-gray-600'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full ${getTypeColor(agent.chart.type)} flex items-center justify-center text-white font-bold text-lg`}>
            {agent.name[0]}
          </div>
          <div>
            <h4 className="text-white font-semibold">{agent.name}</h4>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="capitalize">{agent.chart.type.replace('_', ' ')}</span>
              <span>•</span>
              <span>{agent.chart.profile}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {isCalling && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
              <Phone className="w-3 h-3" />
              On Call
            </span>
          )}
          {criticalNeeds.length > 0 && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
              {criticalNeeds.join(', ')}
            </span>
          )}
          {distance !== undefined && (
            <span className="text-xs text-gray-500">
              {distance.toFixed(0)}m away
            </span>
          )}
        </div>
      </div>

      {/* Current Action */}
      {agent.currentAction && (
        <div className="mb-3 px-3 py-2 bg-gray-700/50 rounded-lg">
          <span className="text-sm text-gray-300">
            Currently: <span className="text-purple-400 capitalize">{agent.currentAction}</span>
          </span>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center">
          <div className="text-xs text-gray-500">Energy</div>
          <div className={`text-sm font-semibold ${agent.needs.energy > 5 ? 'text-green-400' : 'text-red-400'}`}>
            {agent.needs.energy.toFixed(0)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Joy</div>
          <div className={`text-sm font-semibold ${agent.needs.joy > 5 ? 'text-green-400' : 'text-yellow-400'}`}>
            {agent.needs.joy.toFixed(0)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Social</div>
          <div className={`text-sm font-semibold ${agent.needs.social > 5 ? 'text-green-400' : 'text-blue-400'}`}>
            {agent.needs.social.toFixed(0)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500">Trust</div>
          <div className="text-sm font-semibold text-purple-400">
            {(agent.memory.people.get('current')?.relationship || 0).toFixed(1)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isSelected && (
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-700">
          <button
            onClick={(e) => { e.stopPropagation(); onCall(); }}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isCalling 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {isCalling ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            {isCalling ? 'End Call' : 'Call'}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onMessage(); }}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm font-medium transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Message
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onNudge(); }}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg text-sm font-medium transition-colors"
          >
            <Zap className="w-4 h-4" />
            Nudge
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onAskAdvice(); }}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg text-sm font-medium transition-colors"
          >
            <Brain className="w-4 h-4" />
            Ask Advice
          </button>
        </div>
      )}

      {/* Expandable Details */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
        className="w-full mt-2 text-xs text-gray-500 hover:text-gray-400 transition-colors"
      >
        {showDetails ? 'Hide Details ▲' : 'Show Details ▼'}
      </button>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
          <div className="text-xs text-gray-400">
            <span className="text-gray-500">Authority:</span> {agent.chart.authority}
          </div>
          <div className="text-xs text-gray-400">
            <span className="text-gray-500">Cross:</span> {agent.chart.incarnationCross}
          </div>
          <div className="text-xs text-gray-400">
            <span className="text-gray-500">Defined Centers:</span>{' '}
            {Object.entries(agent.chart.centers)
              .filter(([_, v]) => v)
              .map(([k]) => k)
              .join(', ')}
          </div>
          <div className="text-xs text-gray-400">
            <span className="text-gray-500">Active Gates:</span> {agent.chart.gates.slice(0, 5).join(', ')}...
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CHAT INTERFACE - Messaging with agents
// ============================================================================

interface ChatInterfaceProps {
  agent: AgentState;
  humanId: string;
  conversation: Conversation[];
  onSendMessage: (message: string) => void;
  onClose: () => void;
}

export function ChatInterface({ agent, conversation, onSendMessage, onClose }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-lg h-[80vh] flex flex-col border border-purple-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
              {agent.name[0]}
            </div>
            <div>
              <h3 className="text-white font-semibold">{agent.name}</h3>
              <p className="text-xs text-gray-400 capitalize">{agent.chart.type.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversation.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Start a conversation with {agent.name}</p>
              <p className="text-sm mt-2">
                As a {agent.chart.type}, they respond to {agent.chart.authority} authority
              </p>
            </div>
          )}

          {conversation.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from === 'human' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-lg ${
                  msg.from === 'human'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-200'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <div className={`text-xs mt-1 ${msg.from === 'human' ? 'text-purple-200' : 'text-gray-500'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.sentiment !== undefined && msg.sentiment !== 0 && (
                    <span className="ml-2">
                      {msg.sentiment > 0 ? '💚' : '💔'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Message ${agent.name}...`}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Quick suggestions based on agent type */}
          <div className="flex gap-2 mt-2 overflow-x-auto">
            {agent.chart.type === 'generator' && (
              <>
                <button onClick={() => { setMessage('Would you like to join me?'); }} className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 whitespace-nowrap">
                  "Would you like to...?"
                </button>
                <button onClick={() => { setMessage('Can you help me with something?'); }} className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 whitespace-nowrap">
                  "Can you help...?"
                </button>
              </>
            )}
            {agent.chart.type === 'projector' && (
              <>
                <button onClick={() => { setMessage("I'd value your input on something"); }} className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 whitespace-nowrap">
                  "I'd value your input..."
                </button>
                <button onClick={() => { setMessage('Would you be willing to guide me?'); }} className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 whitespace-nowrap">
                  "Would you guide me?"
                </button>
              </>
            )}
            {agent.chart.type === 'manifestor' && (
              <>
                <button onClick={() => { setMessage('Just so you know, I appreciate you'); }} className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 whitespace-nowrap">
                  "Just so you know..."
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NUDGE INTERFACE - Give advice/influence
// ============================================================================

interface NudgeInterfaceProps {
  agent: AgentState;
  onSendNudge: (content: string, type: string, urgency: number) => void;
  onClose: () => void;
}

export function NudgeInterface({ agent, onSendNudge, onClose }: NudgeInterfaceProps) {
  const [content, setContent] = useState('');
  const [type, setType] = useState('suggestion');
  const [urgency, setUrgency] = useState(0.5);

  const nudgeTypes = [
    { id: 'suggestion', label: 'Suggestion', color: 'bg-blue-500' },
    { id: 'warning', label: 'Warning', color: 'bg-yellow-500' },
    { id: 'encouragement', label: 'Encouragement', color: 'bg-green-500' },
    { id: 'command', label: 'Command', color: 'bg-red-500' }
  ];

  const handleSend = () => {
    if (content.trim()) {
      onSendNudge(content.trim(), type, urgency);
      onClose();
    }
  };

  // Warning about commands
  const showCommandWarning = type === 'command' && (agent.chart.type === 'projector' || agent.chart.type === 'generator');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-md border border-purple-500/30">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Nudge {agent.name}
          </h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Type Selection */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Type of Nudge</label>
            <div className="grid grid-cols-2 gap-2">
              {nudgeTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    type === t.id 
                      ? `${t.color} text-white` 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Warning for commands */}
          {showCommandWarning && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-400">
                  <strong>Warning:</strong> {agent.chart.type === 'projector' 
                    ? 'Projectors resist commands and need invitations instead.' 
                    : 'Generators respond to questions, not commands.'}
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Your Message</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`What do you want to tell ${agent.name}?`}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              rows={3}
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              Urgency: {urgency < 0.3 ? 'Low' : urgency < 0.7 ? 'Medium' : 'High'}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={urgency}
              onChange={(e) => setUrgency(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Tips based on type */}
          <div className="p-3 bg-gray-800/50 rounded-lg text-sm text-gray-400">
            <strong className="text-gray-300">Tip:</strong>{' '}
            {agent.chart.type === 'generator' && "Ask questions to get their sacral response."}
            {agent.chart.type === 'projector' && "Use proper invitations and recognize their gifts."}
            {agent.chart.type === 'manifestor' && "Inform them, don't question their actions."}
            {agent.chart.type === 'reflector' && "Give them time to reflect on your suggestion."}
            {agent.chart.type === 'manifesting_generator' && "Ask, then let them inform you of their response."}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Send Nudge
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADVICE INTERFACE - Ask agent for guidance
// ============================================================================

interface AdviceInterfaceProps {
  agent: AgentState;
  onAskAdvice: (situation: string) => void;
  advice: { advice: string; basedOn: string; confidence: number } | null;
  onClose: () => void;
}

export function AdviceInterface({ agent, onAskAdvice, advice, onClose }: AdviceInterfaceProps) {
  const [situation, setSituation] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleAsk = async () => {
    if (situation.trim()) {
      setIsAsking(true);
      await onAskAdvice(situation.trim());
      setIsAsking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-lg border border-purple-500/30">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Ask {agent.name} for Guidance
          </h3>
        </div>

        <div className="p-4 space-y-4">
          {!advice ? (
            <>
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">
                  {agent.name} is a <span className="text-white capitalize">{agent.chart.type.replace('_', ' ')}</span> with{' '}
                  <span className="text-white">{agent.chart.authority}</span> authority.
                </p>
                <p className="text-sm text-gray-400">
                  Their defined centers:{' '}
                  <span className="text-purple-400">
                    {Object.entries(agent.chart.centers)
                      .filter(([_, v]) => v)
                      .map(([k]) => k)
                      .join(', ')}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Describe your situation</label>
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="What do you need guidance on?"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                  rows={4}
                />
              </div>

              <button
                onClick={handleAsk}
                disabled={!situation.trim() || isAsking}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                {isAsking ? 'Consulting...' : 'Get Guidance'}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-lg text-white italic">"{advice.advice}"</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="text-gray-500 mb-1">Based On</div>
                  <div className="text-gray-300">{advice.basedOn}</div>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="text-gray-500 mb-1">Confidence</div>
                  <div className="text-purple-400">{(advice.confidence * 100).toFixed(0)}%</div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CHOICE INTERFACE - Present dilemmas to agents
// ============================================================================

interface ChoiceInterfaceProps {
  choice: ChoiceEvent;
  onMakeChoice: (optionIndex: number) => void;
  onClose: () => void;
}

export function ChoiceInterface({ choice, onMakeChoice, onClose }: ChoiceInterfaceProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = () => {
    if (selected !== null) {
      onMakeChoice(selected);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-md border border-purple-500/30">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            Decision Required
          </h3>
          <div className="flex items-center gap-1 text-yellow-400">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{timeLeft}s</span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-gray-300">{choice.question}</p>

          <div className="space-y-2">
            {choice.options.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelected(index)}
                className={`w-full p-4 rounded-lg text-left transition-colors ${
                  selected === index
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selected === index ? 'border-white' : 'border-gray-500'
                  }`}>
                    {selected === index && <div className="w-3 h-3 bg-white rounded-full" />}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={selected === null}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
          >
            Make Choice
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CALL INTERFACE - Voice call simulation
// ============================================================================

interface CallInterfaceProps {
  agent: AgentState;
  onEndCall: () => void;
}

export function CallInterface({ agent, onEndCall }: CallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center">
      {/* Background animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Agent avatar */}
      <div className="relative z-10 mb-8">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold text-white">
          {agent.name[0]}
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-900" />
      </div>

      {/* Info */}
      <div className="relative z-10 text-center mb-12">
        <h2 className="text-2xl font-bold text-white mb-2">{agent.name}</h2>
        <p className="text-gray-400 capitalize">{agent.chart.type.replace('_', ' ')}</p>
        <p className="text-purple-400 font-mono mt-2">{formatTime(callDuration)}</p>
      </div>

      {/* Controls */}
      <div className="relative z-10 flex items-center gap-6">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-full transition-colors ${
            isMuted ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>

        <button
          onClick={onEndCall}
          className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
        >
          <PhoneOff className="w-8 h-8" />
        </button>
      </div>

      {/* Current status */}
      {agent.currentAction && (
        <div className="relative z-10 mt-8 px-4 py-2 bg-gray-800 rounded-full text-sm text-gray-400">
          {agent.name} is currently: <span className="text-purple-400 capitalize">{agent.currentAction}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD - Complete UI
// ============================================================================

interface SimulationDashboardProps {
  simulation: ReturnType<typeof useSimulation>;
  influence: ReturnType<typeof useInfluenceManager>;
}

export function SimulationDashboard({ simulation, influence }: SimulationDashboardProps) {
  const { agents, places, worldTime, dayCount, isRunning, start, createAgent } = simulation;
  const { 
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
  } = influence;

  const [currentHumanId, setCurrentHumanId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [adviceResponse, setAdviceResponse] = useState<any>(null);
  const [conversations, setConversations] = useState<Map<string, Conversation[]>>(new Map());

  // Join as human
  const handleJoin = (name: string) => {
    const human = join(name);
    setCurrentHumanId(human.id);
  };

  // Handle messaging
  const handleSendMessage = async (message: string) => {
    if (!currentHumanId || !selectedAgent) return;

    const result = await sendMessage(currentHumanId, selectedAgent.id, message);
    setConversations(prev => {
      const next = new Map(prev);
      next.set(selectedAgent.id, [...(next.get(selectedAgent.id) || []), result.conversation, result.agentResponse]);
      return next;
    });
  };

  // Handle call
  const handleCall = () => {
    if (!currentHumanId || !selectedAgent) return;

    if (activeCalls.get(currentHumanId) === selectedAgent.id) {
      endCall(currentHumanId, selectedAgent.id);
    } else {
      call(currentHumanId, selectedAgent.id);
    }
  };

  // Handle nudge
  const handleSendNudge = (content: string, type: string, urgency: number) => {
    if (!currentHumanId || !selectedAgent) return;
    nudge(currentHumanId, selectedAgent.id, content, type as any, urgency);
  };

  // Handle advice
  const handleAskAdvice = async (situation: string) => {
    if (!currentHumanId || !selectedAgent) return;
    const result = askAdvice(currentHumanId, selectedAgent.id, situation);
    setAdviceResponse(result);
  };

  // Format time
  const formatTime = (time: number) => {
    const hours = Math.floor(time);
    const minutes = Math.floor((time % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-purple-400">Human Design Simulation</h1>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Day {dayCount} • {formatTime(worldTime)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!isRunning ? (
              <button
                onClick={start}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
              >
                Start Simulation
              </button>
            ) : (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                Running
              </span>
            )}

            {currentHumanId && (
              <button
                onClick={() => leave(currentHumanId)}
                className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm transition-colors"
              >
                Leave World
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Panel - Lobby & Places */}
        <div className="space-y-4">
          <Lobby 
            onJoin={handleJoin}
            humans={humans}
            currentHumanId={currentHumanId}
          />

          {/* Places */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              Places ({places.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {places.map(place => (
                <div key={place.id} className="p-2 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{place.name}</span>
                    <span className="text-xs text-gray-500">
                      {place.occupants.size}/{place.capacity}
                    </span>
                  </div>
                  {place.occupants.size > 0 && (
                    <div className="mt-1 flex gap-1">
                      {Array.from(place.occupants).map(agentId => {
                        const agent = agents.find(a => a.id === agentId);
                        return agent ? (
                          <span key={agentId} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                            {agent.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center - 3D View Placeholder */}
        <div className="lg:col-span-1">
          <div className="bg-gray-900 rounded-lg border border-gray-800 h-[600px] flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-4xl">🌍</span>
              </div>
              <p>3D World View</p>
              <p className="text-sm mt-2">Connect World3D.tsx here</p>
              <p className="text-xs text-gray-600 mt-1">{agents.length} agents active</p>
            </div>
          </div>
        </div>

        {/* Right Panel - Agents */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Agents ({agents.length})
            </h3>
            <button
              onClick={() => createAgent(`Agent ${agents.length + 1}`)}
              className="text-sm px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              + Add
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {agents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isSelected={selectedAgent?.id === agent.id}
                isCalling={activeCalls.get(currentHumanId || '') === agent.id}
                onSelect={() => setSelectedAgent(agent)}
                onCall={handleCall}
                onMessage={() => { setSelectedAgent(agent); setShowChat(true); }}
                onNudge={() => { setSelectedAgent(agent); setShowNudge(true); }}
                onAskAdvice={() => { setSelectedAgent(agent); setShowAdvice(true); setAdviceResponse(null); }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showChat && selectedAgent && currentHumanId && (
        <ChatInterface
          agent={selectedAgent}
          humanId={currentHumanId}
          conversation={conversations.get(selectedAgent.id) || []}
          onSendMessage={handleSendMessage}
          onClose={() => setShowChat(false)}
        />
      )}

      {showNudge && selectedAgent && (
        <NudgeInterface
          agent={selectedAgent}
          onSendNudge={handleSendNudge}
          onClose={() => setShowNudge(false)}
        />
      )}

      {showAdvice && selectedAgent && (
        <AdviceInterface
          agent={selectedAgent}
          onAskAdvice={handleAskAdvice}
          advice={adviceResponse}
          onClose={() => { setShowAdvice(false); setAdviceResponse(null); }}
        />
      )}

      {activeCalls.has(currentHumanId || '') && selectedAgent && (
        <CallInterface
          agent={selectedAgent}
          onEndCall={() => endCall(currentHumanId!, selectedAgent.id)}
        />
      )}

      {pendingChoices.length > 0 && currentHumanId && (
        <ChoiceInterface
          choice={pendingChoices[0]}
          onMakeChoice={(option) => makeChoice(pendingChoices[0].id, option, currentHumanId!)}
          onClose={() => {}}
        />
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

export function App() {
  const simulation = useSimulation({
    dayLength: 24 * 60 * 1000, // 24 minutes = 1 day
    maxAgents: 10
  });

  const influence = useInfluenceManager(simulation.simulation!);

  // Create initial agents
  useEffect(() => {
    if (!simulation.simulation) return;

    // Create diverse agents
    const initialAgents = [
      { name: 'Aurora', gender: 'female', birth: new Date(1995, 3, 15) },
      { name: 'Marcus', gender: 'male', birth: new Date(1988, 7, 22) },
      { name: 'Luna', gender: 'female', birth: new Date(1992, 11, 3) },
    ];

    initialAgents.forEach(({ name, gender, birth }) => {
      simulation.createAgent?.(name, gender, birth);
    });
  }, [simulation.simulation]);

  if (!simulation.simulation) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;
  }

  return <SimulationDashboard simulation={simulation} influence={influence} />;
}

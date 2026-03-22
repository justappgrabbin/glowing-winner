'use client';

/**
 * SHARED SESSION UI
 *
 * The space where users and agents experience files together.
 * Drop a file. Hit play. Everyone reacts.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SharedSessionManager, SharedSession, SharedFile, SessionMessage,
  AgentReaction, detectFileType, formatTime, fileTypeIcon,
} from '../engine/SharedSession';
import { AgentState } from '../engine/HumanDesignSimulation';

// ── Colors per HD type ──────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  generator: '#00ffaa', manifesting_generator: '#ff8c00',
  projector: '#00e5ff', manifestor: '#ff2277', reflector: '#b06fff',
};

const REACTION_COLOR: Record<string, string> = {
  somatic: '#00ffaa', intellectual: '#00e5ff',
  visceral: '#ff2277', emotional: '#ffcc00', sampling: '#b06fff',
};

// ============================================================================
// FILE DROP ZONE
// ============================================================================

interface FileDropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function FileDropZone({ onFile, disabled }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        dragging
          ? 'border-[#6450ff] bg-[rgba(100,80,255,0.08)]'
          : 'border-[rgba(100,80,255,0.2)] hover:border-[rgba(100,80,255,0.4)]'
      } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" className="hidden"
        accept="audio/*,video/*,image/*,.pdf,.html,.htm,.ts,.tsx,.js,.jsx,.py,.md,.txt,.json"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className="text-3xl mb-3">⬆</div>
      <div className="text-sm font-bold text-[#e8e4ff] mb-1">Drop any file</div>
      <div className="text-xs text-[#4a4470]">audio · video · images · html · code · text · pdf</div>
    </div>
  );
}

// ============================================================================
// FILE PLAYER — renders based on file type
// ============================================================================

interface FilePlayerProps {
  file: SharedFile;
  isPlaying: boolean;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (t: number) => void;
  onDurationKnown: (d: number) => void;
}

export function FilePlayer({ file, isPlaying, currentTime, onPlay, onPause, onSeek, onDurationKnown }: FilePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localDuration, setLocalDuration] = useState(file.duration ?? 0);

  // Sync playback state to media element
  useEffect(() => {
    const el = audioRef.current ?? videoRef.current;
    if (!el) return;
    if (isPlaying && el.paused) el.play().catch(() => {});
    if (!isPlaying && !el.paused) el.pause();
  }, [isPlaying]);

  useEffect(() => {
    const el = audioRef.current ?? videoRef.current;
    if (!el || Math.abs(el.currentTime - currentTime) < 1) return;
    el.currentTime = currentTime;
  }, [currentTime]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    const dur = e.currentTarget.duration;
    setLocalDuration(dur);
    onDurationKnown(dur);
  };

  if (file.type === 'audio') return (
    <div className="bg-[#0e0e24] rounded-xl p-6 flex flex-col items-center gap-4">
      <div className="text-5xl">🎵</div>
      <div className="font-bold text-sm text-[#e8e4ff] text-center">{file.name}</div>
      <audio ref={audioRef} src={file.url} onLoadedMetadata={handleLoadedMetadata} className="hidden" />
      <PlaybackControls isPlaying={isPlaying} currentTime={currentTime} duration={localDuration}
        onPlay={onPlay} onPause={onPause} onSeek={onSeek} />
    </div>
  );

  if (file.type === 'video') return (
    <div className="rounded-xl overflow-hidden bg-black">
      <video ref={videoRef} src={file.url} className="w-full max-h-64 object-contain"
        onLoadedMetadata={handleLoadedMetadata} />
      <div className="p-3">
        <PlaybackControls isPlaying={isPlaying} currentTime={currentTime} duration={localDuration}
          onPlay={onPlay} onPause={onPause} onSeek={onSeek} />
      </div>
    </div>
  );

  if (file.type === 'image') return (
    <div className="rounded-xl overflow-hidden bg-[#0e0e24] flex items-center justify-center p-2">
      <img src={file.url} alt={file.name} className="max-w-full max-h-72 object-contain rounded-lg" />
    </div>
  );

  if (file.type === 'html') return (
    <div className="rounded-xl overflow-hidden border border-[rgba(100,80,255,0.2)]" style={{ height: 280 }}>
      <iframe src={file.url} className="w-full h-full border-none bg-white" sandbox="allow-scripts allow-same-origin" title={file.name} />
    </div>
  );

  if (file.type === 'code' || file.type === 'text') return (
    <div className="rounded-xl bg-black border border-[rgba(100,80,255,0.15)] p-4 max-h-64 overflow-y-auto">
      <pre className="font-mono text-[11px] text-[#8b6fff] whitespace-pre-wrap leading-relaxed">
        <FileTextContent url={file.url} />
      </pre>
    </div>
  );

  if (file.type === 'pdf') return (
    <div className="rounded-xl overflow-hidden border border-[rgba(100,80,255,0.2)]" style={{ height: 320 }}>
      <iframe src={file.url} className="w-full h-full" title={file.name} />
    </div>
  );

  return (
    <div className="bg-[#0e0e24] rounded-xl p-8 text-center">
      <div className="text-4xl mb-3">{fileTypeIcon(file.type)}</div>
      <div className="text-sm text-[#4a4470]">{file.name}</div>
    </div>
  );
}

function FileTextContent({ url }: { url: string }) {
  const [text, setText] = useState('Loading...');
  useEffect(() => {
    fetch(url).then(r => r.text()).then(t => setText(t.slice(0, 3000) + (t.length > 3000 ? '\n...' : ''))).catch(() => setText('Could not load file.'));
  }, [url]);
  return <>{text}</>;
}

// ============================================================================
// PLAYBACK CONTROLS
// ============================================================================

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (t: number) => void;
}

function PlaybackControls({ isPlaying, currentTime, duration, onPlay, onPause, onSeek }: PlaybackControlsProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      {duration > 0 && (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-[#4a4470] w-8">{formatTime(currentTime)}</span>
          <input type="range" min={0} max={duration} step={0.1} value={currentTime}
            onChange={e => onSeek(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-[#6450ff]" />
          <span className="font-mono text-[9px] text-[#4a4470] w-8 text-right">{formatTime(duration)}</span>
        </div>
      )}
      <div className="flex justify-center">
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="w-12 h-12 rounded-full bg-[#6450ff] flex items-center justify-center text-white text-lg hover:bg-[#8b6fff] transition-all active:scale-95"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// AGENT REACTION CARD
// ============================================================================

function ReactionCard({ reaction }: { reaction: AgentReaction }) {
  const col = TYPE_COLOR[reaction.hdType] ?? '#6450ff';
  const rCol = REACTION_COLOR[reaction.reactionType] ?? '#6450ff';
  return (
    <div className="flex gap-3 py-2 border-b border-[rgba(100,80,255,0.06)]">
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs"
        style={{ background: `${col}22`, color: col, border: `1px solid ${col}44` }}>
        {reaction.agentName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold" style={{ color: col }}>{reaction.agentName}</span>
          <span className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${rCol}15`, color: rCol }}>
            {reaction.reactionType}
          </span>
          {reaction.timeInFile > 0 && (
            <span className="font-mono text-[8px] text-[#4a4470]">@ {formatTime(reaction.timeInFile)}</span>
          )}
        </div>
        <div className="text-[11px] text-[#e8e4ff] leading-relaxed italic">"{reaction.reaction}"</div>
        <div className="font-mono text-[8px] text-[#4a4470] mt-1">{reaction.definedCenter} center · {reaction.authority}</div>
      </div>
    </div>
  );
}

// ============================================================================
// SESSION MESSAGE
// ============================================================================

function MessageBubble({ msg }: { msg: SessionMessage }) {
  const isHuman = msg.from === 'human';
  return (
    <div className={`flex gap-2 ${isHuman ? 'justify-end' : 'justify-start'}`}>
      {!isHuman && (
        <div className="w-6 h-6 rounded-full bg-[rgba(100,80,255,0.2)] flex items-center justify-center text-[10px] font-bold text-[#8b6fff] flex-shrink-0">
          {msg.fromName[0]}
        </div>
      )}
      <div className={`max-w-[78%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
        isHuman
          ? 'bg-[rgba(100,80,255,0.15)] border border-[rgba(100,80,255,0.2)] text-[#e8e4ff]'
          : 'bg-[#0e0e24] border border-[rgba(100,80,255,0.08)] text-[#b0aacc]'
      }`}>
        {!isHuman && <div className="font-bold text-[9px] text-[#6450ff] mb-1">{msg.fromName}</div>}
        {msg.content}
        {msg.timeInFile !== undefined && msg.timeInFile > 0 && (
          <div className="font-mono text-[8px] text-[#4a4470] mt-1">@ {formatTime(msg.timeInFile)}</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN SHARED SESSION VIEW
// ============================================================================

interface SharedSessionViewProps {
  sessionManager: SharedSessionManager;
  sessionId: string;
  humanId: string;
  humanName: string;
  agents: AgentState[];
  onClose: () => void;
}

export function SharedSessionView({
  sessionManager, sessionId, humanId, humanName, agents, onClose
}: SharedSessionViewProps) {
  const [session, setSession]       = useState<SharedSession | null>(null);
  const [activeTab, setTab]         = useState<'play' | 'reactions' | 'chat'>('play');
  const [isPlaying, setPlaying]     = useState(false);
  const [currentTime, setTime]      = useState(0);
  const [msgInput, setMsgInput]     = useState('');
  const chatEndRef                  = useRef<HTMLDivElement>(null);

  // Sync session state
  useEffect(() => {
    const s = sessionManager.getSession(sessionId);
    setSession(s ? { ...s } : null);

    const refresh = () => {
      const s2 = sessionManager.getSession(sessionId);
      setSession(s2 ? { ...s2 } : null);
    };

    sessionManager.on('fileUploaded',     refresh);
    sessionManager.on('playbackStarted',  () => { setPlaying(true); refresh(); });
    sessionManager.on('playbackPaused',   () => { setPlaying(false); refresh(); });
    sessionManager.on('agentReacted',     () => { refresh(); setTab('reactions'); });
    sessionManager.on('messageSent',      refresh);
    sessionManager.on('agentResponded',   refresh);
    sessionManager.on('agentJoined',      refresh);

    // Tick playback time
    const interval = setInterval(() => {
      const s3 = sessionManager.getSession(sessionId);
      if (s3?.playback?.state === 'playing') {
        setTime((Date.now() - s3.playback.startedAt) / 1000 + s3.playback.currentTime);
      }
    }, 500);

    return () => {
      sessionManager.off('fileUploaded',    refresh);
      sessionManager.off('playbackStarted', refresh);
      sessionManager.off('playbackPaused',  refresh);
      sessionManager.off('agentReacted',    refresh);
      sessionManager.off('messageSent',     refresh);
      sessionManager.off('agentResponded',  refresh);
      sessionManager.off('agentJoined',     refresh);
      clearInterval(interval);
    };
  }, [sessionManager, sessionId]);

  // Add agents to session
  useEffect(() => {
    agents.forEach(a => sessionManager.addAgent(sessionId, a));
  }, [agents, sessionId, sessionManager]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages.length]);

  const handleFile = useCallback((file: File) => {
    const f = sessionManager.uploadFile(sessionId, humanId, file);
    // Auto-play audio and video
    if (f.type === 'audio' || f.type === 'video') {
      setTimeout(() => sessionManager.play(sessionId, f.id, humanId, agents), 500);
    }
  }, [sessionManager, sessionId, humanId, agents]);

  const handlePlay = useCallback(() => {
    if (!session?.activeFile) return;
    sessionManager.play(sessionId, session.activeFile.id, humanId, agents);
    setPlaying(true);
  }, [session, sessionManager, sessionId, humanId, agents]);

  const handlePause = useCallback(() => {
    sessionManager.pause(sessionId);
    setPlaying(false);
  }, [sessionManager, sessionId]);

  const handleSeek = useCallback((t: number) => {
    sessionManager.seek(sessionId, t);
    setTime(t);
  }, [sessionManager, sessionId]);

  const handleDuration = useCallback((d: number) => {
    const s = sessionManager.getSession(sessionId);
    if (s?.playback) s.playback.duration = d;
  }, [sessionManager, sessionId]);

  const handleSendMessage = useCallback(() => {
    if (!msgInput.trim()) return;
    sessionManager.sendMessage(sessionId, humanId, humanName, msgInput.trim());
    // Random agent responds
    const responder = agents[Math.floor(Math.random() * agents.length)];
    if (responder) {
      setTimeout(() => sessionManager.agentRespondToMessage(sessionId, responder, msgInput), 1500 + Math.random() * 2000);
    }
    setMsgInput('');
  }, [msgInput, sessionManager, sessionId, humanId, humanName, agents]);

  if (!session) return null;

  const reactionCount = session.reactions.length;
  const unread = reactionCount > 0 ? reactionCount : undefined;

  return (
    <div className="fixed inset-0 z-[800] bg-[#000008] flex flex-col">

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-[rgba(100,80,255,0.15)] bg-[rgba(0,0,8,0.95)]">
        <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[rgba(100,80,255,0.2)] text-[#4a4470] flex items-center justify-center">←</button>
        <div className="flex-1">
          <div className="font-bold text-sm">Shared Space</div>
          <div className="font-mono text-[8px] text-[#4a4470]">
            {session.participants.humans.length} human{session.participants.humans.length !== 1 ? 's' : ''} · {session.participants.agents.length} agents
          </div>
        </div>
        {/* Agent avatars */}
        <div className="flex -space-x-1">
          {agents.slice(0, 4).map(a => {
            const col = TYPE_COLOR[a.chart.type] ?? '#6450ff';
            return (
              <div key={a.id} className="w-7 h-7 rounded-full border-2 border-[#000008] flex items-center justify-center text-[10px] font-bold"
                style={{ background: `${col}22`, color: col }} title={`${a.name} — ${a.chart.type}`}>
                {a.name[0]}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-[rgba(100,80,255,0.1)]">
        {([['play','▶ Play'],['reactions',`⬡ Reactions${unread ? ` (${unread})` : ''}`],['chat','◈ Chat']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setTab(tab)}
            className={`flex-1 py-2.5 font-mono text-[9px] tracking-widest uppercase border-b-2 transition-all ${
              activeTab === tab ? 'border-[#6450ff] text-[#8b6fff]' : 'border-transparent text-[#4a4470]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {/* PLAY TAB */}
        {activeTab === 'play' && (
          <div className="p-4 flex flex-col gap-4">
            <FileDropZone onFile={handleFile} />

            {/* File list */}
            {session.files.length > 0 && (
              <div className="flex flex-col gap-2">
                {session.files.map(f => (
                  <button key={f.id}
                    onClick={() => { sessionManager.play(sessionId, f.id, humanId, agents); setPlaying(true); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      session.activeFile?.id === f.id
                        ? 'border-[#6450ff] bg-[rgba(100,80,255,0.08)]'
                        : 'border-[rgba(100,80,255,0.1)] hover:border-[rgba(100,80,255,0.25)]'
                    }`}>
                    <span className="text-xl">{fileTypeIcon(f.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#e8e4ff] truncate">{f.name}</div>
                      <div className="font-mono text-[8px] text-[#4a4470]">{f.type} · {(f.size / 1024).toFixed(0)}kb</div>
                    </div>
                    {session.activeFile?.id === f.id && <span className="text-[#6450ff] text-xs">playing</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Active file player */}
            {session.activeFile && (
              <FilePlayer
                file={session.activeFile}
                isPlaying={isPlaying}
                currentTime={currentTime}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onDurationKnown={handleDuration}
              />
            )}

            {/* Who's here */}
            {agents.length > 0 && (
              <div className="bg-[#0e0e24] rounded-xl p-4">
                <div className="font-mono text-[8px] text-[#4a4470] uppercase tracking-widest mb-3">In this space</div>
                <div className="flex flex-col gap-2">
                  {agents.map(a => {
                    const col = TYPE_COLOR[a.chart.type] ?? '#6450ff';
                    return (
                      <div key={a.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: `${col}22`, color: col }}>
                          {a.name[0]}
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-[#e8e4ff]">{a.name}</div>
                          <div className="font-mono text-[8px]" style={{ color: col }}>{a.chart.type.replace('_',' ')}</div>
                        </div>
                        <div className="ml-auto font-mono text-[8px] text-[#4a4470]">{a.chart.authority}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* REACTIONS TAB */}
        {activeTab === 'reactions' && (
          <div className="p-4">
            {session.reactions.length === 0 ? (
              <div className="text-center py-12 text-[#4a4470] text-sm">
                Play a file to see how agents react.
              </div>
            ) : (
              <div className="flex flex-col">
                {[...session.reactions].reverse().map(r => (
                  <ReactionCard key={`${r.agentId}-${r.timestamp}`} reaction={r} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {session.messages.length === 0 ? (
                <div className="text-center py-12 text-[#4a4470] text-sm">
                  Say something. Agents are listening.
                </div>
              ) : (
                session.messages.map(m => <MessageBubble key={m.id} msg={m} />)
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

      </div>

      {/* Chat input (always visible on chat tab) */}
      {activeTab === 'chat' && (
        <div className="flex-shrink-0 flex gap-2 p-3 border-t border-[rgba(100,80,255,0.1)] bg-[rgba(0,0,8,0.95)]">
          <input
            value={msgInput}
            onChange={e => setMsgInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="Talk to the space..."
            className="flex-1 bg-[#0e0e24] border border-[rgba(100,80,255,0.15)] rounded-xl px-4 py-2.5 text-sm text-[#e8e4ff] outline-none focus:border-[rgba(100,80,255,0.4)] placeholder:text-[#4a4470]"
          />
          <button onClick={handleSendMessage}
            className="w-10 h-10 rounded-xl bg-[#6450ff] text-white flex items-center justify-center text-base active:bg-[#8b6fff]">
            ✦
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HOOK — useSharedSession
// ============================================================================

export function useSharedSession() {
  const managerRef = useRef<SharedSessionManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new SharedSessionManager();
  }

  useEffect(() => {
    return () => { managerRef.current?.destroy(); };
  }, []);

  const openSession = useCallback((appInstanceId: string, humanId: string) => {
    return managerRef.current!.getOrCreateSession(appInstanceId, humanId);
  }, []);

  return { manager: managerRef.current!, openSession };
}

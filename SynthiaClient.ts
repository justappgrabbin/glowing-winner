/**
 * SYNTHIA API CLIENT
 * All calls to synthia-server.onrender.com
 */

export const SYNTHIA_URL = process.env.NEXT_PUBLIC_SYNTHIA_URL || 'https://synthia-server.onrender.com';
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://leisphnjslcuepflefri.supabase.co';
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlaXNwaG5qc2xjdWVwZmxlZnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjg1NzgsImV4cCI6MjA4NjgwNDU3OH0.YGOuHaFdfadx7H0CBkvm-zKJnweBNz3P9y05--kh9ic';

// ── Health ────────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ online: boolean; rag_chunks?: number }> {
  try {
    const r = await fetch(`${SYNTHIA_URL}/health`, { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    return { online: true, rag_chunks: d.rag_chunks };
  } catch {
    return { online: false };
  }
}

// ── Oracle ────────────────────────────────────────────────────────────────────

export interface OracleResponse {
  reply: string;
  tier?: string;
}

export async function askOracle(
  message: string,
  userId: string = 'universe_user',
  agent: string = 'cynthia',
): Promise<string> {
  try {
    const r = await fetch(`${SYNTHIA_URL}/oracle/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, user_id: userId, agent }),
      signal: AbortSignal.timeout(20000),
    });
    const d: OracleResponse = await r.json();
    return d.reply || d.reply || 'The field is listening.';
  } catch {
    return '';
  }
}

// ── Agent-aware oracle call ───────────────────────────────────────────────────
// Used by InfluenceManager to get real AI responses as an agent

export async function askAsAgent(opts: {
  agentName: string;
  hdType: string;
  authority: string;
  definedCenters: string[];
  gates: number[];
  message: string;          // what the human said
  context?: string;         // extra situation context
  userId?: string;
}): Promise<string> {
  const { agentName, hdType, authority, definedCenters, gates, message, context, userId } = opts;

  const systemContext = [
    `You are ${agentName}, a ${hdType.replace('_', ' ')} with ${authority} authority in Human Design.`,
    `Your defined centers: ${definedCenters.join(', ')}.`,
    `Your active gates: ${gates.slice(0, 8).join(', ')}.`,
    hdType === 'generator' || hdType === 'manifesting_generator'
      ? 'You respond from your sacral. Short gut responses. Uh-huh or un-un before anything else.'
      : hdType === 'projector'
      ? 'You only speak deeply when properly invited. You see systems and guide. You wait for recognition.'
      : hdType === 'manifestor'
      ? 'You are autonomous. You initiate. You inform but do not ask permission. Brief and direct.'
      : hdType === 'reflector'
      ? 'You sample and mirror. You need time. You reflect the energy of whoever you are with.'
      : '',
    context ? `Context: ${context}` : '',
    'Respond in character. 1-3 sentences max. Do not explain Human Design. Just be yourself.',
  ].filter(Boolean).join(' ');

  return askOracle(`${systemContext}\n\nHuman says: "${message}"`, userId ?? 'agent_user', 'cynthia');
}

// ── HD Chart ──────────────────────────────────────────────────────────────────

export interface StellarChart {
  ok: boolean;
  tier: string;
  active_gates: number[];
  defined_channels: number[][];
  awareness: Record<string, number>;
  film_params: { gamma: number; beta: number; sun_gate: number; sun_line: number };
  primary_address: string;
}

export async function getChart(
  birthDate: string,  // YYYY-MM-DD
  birthTime: string,  // HH:MM
  location: string = '',
): Promise<StellarChart | null> {
  try {
    const r = await fetch(`${SYNTHIA_URL}/stellar/chart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: birthDate, time: birthTime, location }),
      signal: AbortSignal.timeout(15000),
    });
    return await r.json();
  } catch {
    return null;
  }
}

// ── Resonance Sentence ────────────────────────────────────────────────────────

export interface ResonanceSentence {
  sentence: string;
  center: string;
  name: string;
  tier: string;
}

export async function getSentence(gate: number, line: number = 1): Promise<string> {
  try {
    const r = await fetch(`${SYNTHIA_URL}/stellar/sentence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gate, line, intensity: 'balanced', physicsLens: 'classical' }),
      signal: AbortSignal.timeout(10000),
    });
    const d: ResonanceSentence = await r.json();
    return d.sentence || '';
  } catch {
    return '';
  }
}

// ── RAG ───────────────────────────────────────────────────────────────────────

export async function ragSearch(query: string, topK: number = 3): Promise<string[]> {
  try {
    const r = await fetch(`${SYNTHIA_URL}/trident/rag/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: topK }),
      signal: AbortSignal.timeout(8000),
    });
    const d = await r.json();
    return (d.results || []).map((x: any) => x.text || x.content || '').filter(Boolean);
  } catch {
    return [];
  }
}

export async function ragAdd(text: string, source: string = 'universe', headTag: string = 'research') {
  try {
    await fetch(`${SYNTHIA_URL}/trident/rag/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source, head_tag: headTag }),
    });
  } catch {}
}

// ── Memory ────────────────────────────────────────────────────────────────────

export async function saveMemory(userId: string, role: string, content: string) {
  try {
    await fetch(`${SYNTHIA_URL}/memory/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role, content }),
    });
  } catch {}
}

export async function getMemory(userId: string): Promise<any[]> {
  try {
    const r = await fetch(`${SYNTHIA_URL}/memory/${userId}`);
    const d = await r.json();
    return d.memory || [];
  } catch {
    return [];
  }
}

// ── Ingest ────────────────────────────────────────────────────────────────────

export async function ingestFile(file: File, sourceName: string = 'universe'): Promise<{ ok: boolean; chunks?: number }> {
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('source_name', sourceName);
    const r = await fetch(`${SYNTHIA_URL}/ingest/upload`, { method: 'POST', body: fd, signal: AbortSignal.timeout(30000) });
    const d = await r.json();
    return { ok: !!d.ok, chunks: d.rag_chunks };
  } catch {
    return { ok: false };
  }
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

export async function supabaseInsert(table: string, row: Record<string, any>): Promise<boolean> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function supabaseSelect(table: string, filter?: string): Promise<any[]> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}${filter ? `?${filter}` : '?limit=100'}`;
    const r = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });
    return await r.json();
  } catch {
    return [];
  }
}

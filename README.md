# YOU·N·I·VERSE

A living world where everything exists and can be experienced.

## What's inside

- **World mode** — 3D living world with HD-typed agents moving through places in real time
- **Participate mode** — Enter the world as a human. Chat with agents, call them, nudge them, ask for advice, make choices that affect them. Every agent responds through their authentic Human Design type and authority.
- **Platform mode** — Upload your apps as living places. Agents inhabit them based on resonance with their HD type. Co-experience apps alongside agents.

## Setup

```bash
# Install
npm install

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
src/
├── app/
│   ├── page.tsx              ← Main entry point, mode toggle
│   ├── layout.tsx
│   └── globals.css
├── engine/
│   ├── HumanDesignSimulation.ts   ← 5 HD types, 11 biological needs, neural behavior
│   ├── EmbodiedWorldEngine.ts     ← FiveW engine, OntologicalAddress (22-trillion space)
│   ├── AppSubstrate.ts            ← Apps as living places, HD resonance scoring
│   ├── InfluenceManager.ts        ← HD-authentic human↔agent interaction
│   └── SimulationIntegration.ts   ← Adapter + useSimulation React hook
└── components/
    ├── SimulationUI.tsx      ← Lobby, AgentCard, Chat, Nudge, Advice, Call, Choice
    ├── SubstrateUI.tsx       ← App upload, co-experience, network view
    ├── World3D.tsx           ← Optimized Three.js world
    └── CharacterCreator.tsx  ← Avatar creation
```

## Three modes

| Mode | What it is |
|------|-----------|
| 🌌 World | Watch the living 3D world. Agents move, sleep, eat, work, socialize by their HD type. |
| ◈ Participate | Be in the world. Chat/call/nudge agents. Ask for HD-based guidance. Make choices. |
| ⬡ Platform | Upload your apps. Agents discover and use them. Co-experience apps together. |

## HD types in the simulation

| Type | Behavior |
|------|---------|
| Generator | Waits to respond. Responds to questions with sacral yes/no. Long focused sessions. |
| Manifesting Generator | Fast energy. Responds then informs. Multipassionate. |
| Projector | Short sessions. Needs recognition + invitation. Gives guidance when seen. |
| Manifestor | Autonomous. Initiates. Needs to inform, not be questioned. |
| Reflector | Samples everything. Needs full lunar cycle. Mirrors the environment. |

## Ontological address space

Every entity gets a deterministic address:
```
SD(1-13) · D(1-5) · G(1-64) · L(1-6) · C(1-6) · T(1-6) · B(1-5)
· DEG(0-59) · M(0-59) · S(0-59) · ARC(0-99) · ZOD · H(1-12)
= ~22 trillion unique addresses
```

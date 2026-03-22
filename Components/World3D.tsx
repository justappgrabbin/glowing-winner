'use client';

/**
 * WORLD 3D - Three.js scene with places and agents
 * Optimized for performance with proper memory management
 */

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Vector3, PlaneGeometry, EdgesGeometry } from 'three';
import type { EmbodiedWorldEngine } from '../engine/EmbodiedWorldEngine';
import type { Agent, Place } from '../engine/EmbodiedWorldEngine';
import { ELEMENT_COLORS } from '../engine/EmbodiedWorldEngine';

// ============================================================================
// SHARED GEOMETRIES & MATERIALS (Memory optimization)
// ============================================================================

const SHARED_PLANE_GEOMETRY = new PlaneGeometry(1, 1);
const SHARED_CAPSULE_GEOMETRY = new THREE.CapsuleGeometry(0.3, 1, 4, 8);
const SHARED_SPHERE_GEOMETRY = new THREE.SphereGeometry(0.25, 16, 16);
const SHARED_EYE_GEOMETRY = new THREE.SphereGeometry(0.04, 8, 8);
const SHARED_AURA_GEOMETRY = new THREE.SphereGeometry(1.5, 16, 16);
const SHARED_RING_GEOMETRY = new THREE.RingGeometry(0.6, 0.8, 32);
const SHARED_ACTIVITY_GEOMETRY = new THREE.SphereGeometry(0.1, 8, 8);

// ============================================================================
// PLACE COMPONENT
// ============================================================================

function Place3D({ place }: { place: Place }) {
  // Memoize geometries to prevent recreation
  const groundGeometry = useMemo(() => {
    const geom = new PlaneGeometry(place.size.width, place.size.depth);
    return geom;
  }, [place.size.width, place.size.depth]);

  const borderGeometry = useMemo(() => {
    const plane = new PlaneGeometry(place.size.width, place.size.depth);
    const edges = new EdgesGeometry(plane);
    plane.dispose(); // Dispose temporary plane
    return edges;
  }, [place.size.width, place.size.depth]);

  const glowGeometry = useMemo(() => {
    return new PlaneGeometry(place.size.width + 2, place.size.depth + 2);
  }, [place.size.width, place.size.depth]);

  // Cleanup geometries on unmount
  useEffect(() => {
    return () => {
      groundGeometry.dispose();
      borderGeometry.dispose();
      glowGeometry.dispose();
    };
  }, [groundGeometry, borderGeometry, glowGeometry]);

  return (
    <group position={[place.position.x, 0, place.position.z]}>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <primitive object={groundGeometry} attach="geometry" />
        <meshStandardMaterial 
          color={place.color} 
          transparent 
          opacity={0.3}
          roughness={0.8}
        />
      </mesh>

      {/* Border */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={borderGeometry} attach="geometry" />
        <lineBasicMaterial color={place.color} opacity={0.6} transparent />
      </lineSegments>

      {/* Name label - using Drei Text for actual text rendering */}
      <Text
        position={[0, 0.5, -place.size.depth / 2 - 2]}
        fontSize={1}
        color="white"
        anchorX="center"
        anchorY="middle"
        billboard
      >
        {place.name}
      </Text>

      {/* Glow effect */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={glowGeometry} attach="geometry" />
        <meshBasicMaterial 
          color={place.color} 
          transparent 
          opacity={0.1}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// AGENT AVATAR COMPONENT
// ============================================================================

function AgentAvatar({ 
  agent, 
  isSelected,
  onClick 
}: { 
  agent: Agent; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const colors = ELEMENT_COLORS[agent.element];

  // Reusable vector for calculations (avoid GC)
  const targetPosition = useMemo(() => new Vector3(), []);

  // Animation - using refs for transient updates instead of state
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const mesh = groupRef.current;

    // Bobbing animation for all states
    const bobOffset = Math.sin(time * 3 + agent.id.charCodeAt(0)) * 0.05;

    // State-specific animations (mutate directly, no setState!)
    switch (agent.animationState) {
      case 'walking':
      case 'running':
        mesh.position.y = Math.abs(Math.sin(time * 10)) * 0.1 + bobOffset;
        break;
      case 'meditating':
        mesh.position.y = Math.sin(time * 1) * 0.1 + 0.3;
        break;
      case 'talking':
        mesh.rotation.z = Math.sin(time * 4) * 0.05;
        break;
      default:
        mesh.position.y = bobOffset;
    }

    // Smooth rotation - mutate directly
    const targetRotation = agent.rotation;
    mesh.rotation.y += (targetRotation - mesh.rotation.y) * 0.1;

    // Update position from agent data (mutate directly)
    mesh.position.x = agent.position.x;
    mesh.position.z = agent.position.z;
  });

  // Memoize materials to prevent recreation
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: colors.primary,
      emissive: colors.glow,
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.6
    });
  }, [colors.primary, colors.glow]);

  const headMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: colors.primary,
      emissive: colors.glow,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.7
    });
  }, [colors.primary, colors.glow]);

  const auraMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: colors.aura,
      transparent: true,
      opacity: 0.2
    });
  }, [colors.aura]);

  const eyeMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({ color: '#fff' });
  }, []);

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      bodyMaterial.dispose();
      headMaterial.dispose();
      auraMaterial.dispose();
      eyeMaterial.dispose();
    };
  }, [bodyMaterial, headMaterial, auraMaterial, eyeMaterial]);

  // Activity indicator color
  const activityColor = useMemo(() => {
    if (agent.animationState === 'talking') return '#0f0';
    if (agent.animationState === 'meditating') return '#88f';
    return '#ff0';
  }, [agent.animationState]);

  return (
    <group 
      ref={groupRef}
      position={[agent.position.x, 0, agent.position.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Aura */}
      <mesh position={[0, 1, 0]}>
        <primitive object={SHARED_AURA_GEOMETRY} attach="geometry" />
        <primitive object={auraMaterial} attach="material" />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <primitive object={SHARED_CAPSULE_GEOMETRY} attach="geometry" />
        <primitive object={bodyMaterial} attach="material" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <primitive object={SHARED_SPHERE_GEOMETRY} attach="geometry" />
        <primitive object={headMaterial} attach="material" />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.1, 1.65, 0.18]}>
        <primitive object={SHARED_EYE_GEOMETRY} attach="geometry" />
        <primitive object={eyeMaterial} attach="material" />
      </mesh>
      <mesh position={[0.1, 1.65, 0.18]}>
        <primitive object={SHARED_EYE_GEOMETRY} attach="geometry" />
        <primitive object={eyeMaterial} attach="material" />
      </mesh>

      {/* Selection ring */}
      {(isSelected || hovered) && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <primitive object={SHARED_RING_GEOMETRY} attach="geometry" />
          <meshBasicMaterial 
            color={isSelected ? '#fff' : colors.glow} 
            transparent 
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Name tag using Drei Text */}
      {(isSelected || hovered) && (
        <Text
          position={[0, 2.2, 0]}
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
          billboard
        >
          {agent.name}
        </Text>
      )}

      {/* Activity indicator */}
      {agent.currentActivity && (
        <mesh position={[0, 2.5, 0]}>
          <primitive object={SHARED_ACTIVITY_GEOMETRY} attach="geometry" />
          <meshBasicMaterial color={activityColor} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// ENVIRONMENT COMPONENT
// ============================================================================

function Environment3D() {
  return (
    <>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>

      {/* Grid */}
      <Grid
        position={[0, -0.09, 0]}
        args={[500, 500]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#333355"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#444466"
        fadeDistance={200}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Sky */}
      <Sky 
        distance={450000}
        sunPosition={[0, 1, 0]}
        inclination={0}
        azimuth={0.25}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[50, 100, 50]} 
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 50, 0]} intensity={0.3} color="#88f" />
    </>
  );
}

// ============================================================================
// CAMERA CONTROLLER
// ============================================================================

function CameraController({ 
  mode, 
  targetAgent 
}: { 
  mode: 'orbit' | 'follow' | 'pov';
  targetAgent: Agent | null;
}) {
  const { camera } = useThree();

  // Reusable vectors to avoid GC pressure
  const targetPos = useMemo(() => new Vector3(), []);
  const povPos = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);

  useFrame(() => {
    if (!targetAgent) return;

    if (mode === 'follow') {
      targetPos.set(
        targetAgent.position.x,
        targetAgent.position.y + 5,
        targetAgent.position.z + 10
      );
      camera.position.lerp(targetPos, 0.05);
      lookTarget.set(targetAgent.position.x, targetAgent.position.y, targetAgent.position.z);
      camera.lookAt(lookTarget);
    } else if (mode === 'pov') {
      povPos.set(
        targetAgent.position.x,
        targetAgent.position.y + 1.7,
        targetAgent.position.z
      );
      camera.position.copy(povPos);
      camera.rotation.y = targetAgent.rotation;
    }
  });

  return null;
}

// ============================================================================
// MAIN WORLD COMPONENT
// ============================================================================

interface World3DProps {
  engine: EmbodiedWorldEngine;
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent | null) => void;
  cameraMode: 'orbit' | 'follow' | 'pov';
}

export function World3D({ engine, selectedAgent, onSelectAgent, cameraMode }: World3DProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  // Use refs for engine subscription to avoid re-renders
  const agentsRef = useRef(agents);
  const placesRef = useRef(places);

  // Update refs when state changes
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  // Subscribe to engine updates - throttle to avoid excessive re-renders
  useEffect(() => {
    let rafId: number;
    let lastUpdate = 0;
    const throttleMs = 100; // Update React state max 10 times per second

    const updateCallback = () => {
      const now = performance.now();
      if (now - lastUpdate < throttleMs) {
        rafId = requestAnimationFrame(updateCallback);
        return;
      }
      lastUpdate = now;

      const newAgents = Array.from(engine.agents.values());
      const newPlaces = Array.from(engine.places.values());

      // Only update state if data actually changed (shallow comparison)
      if (JSON.stringify(newAgents) !== JSON.stringify(agentsRef.current)) {
        setAgents(newAgents);
      }
      if (JSON.stringify(newPlaces) !== JSON.stringify(placesRef.current)) {
        setPlaces(newPlaces);
      }

      rafId = requestAnimationFrame(updateCallback);
    };

    rafId = requestAnimationFrame(updateCallback);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [engine]);

  // Memoized callbacks
  const handleSelectAgent = useCallback((agent: Agent | null) => {
    onSelectAgent(agent);
  }, [onSelectAgent]);

  return (
    <div className="w-full h-full">
      <Canvas 
        shadows
        camera={{ position: [0, 50, 100], fov: 60 }}
        style={{ background: '#0a0a15' }}
        frameloop="always"
        performance={{ min: 0.5 }}
      >
        <Environment3D />

        {/* Places */}
        {places.map(place => (
          <Place3D key={place.id} place={place} />
        ))}

        {/* Agents */}
        {agents.map(agent => (
          <AgentAvatar 
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent?.id === agent.id}
            onClick={() => handleSelectAgent(agent)}
          />
        ))}

        {/* Camera */}
        <CameraController mode={cameraMode} targetAgent={selectedAgent} />

        {cameraMode === 'orbit' && (
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={10}
            maxDistance={200}
            maxPolarAngle={Math.PI / 2 - 0.1}
          />
        )}
      </Canvas>
    </div>
  );
}

// Global cleanup for shared geometries
export function cleanupWorld3D() {
  SHARED_PLANE_GEOMETRY.dispose();
  SHARED_CAPSULE_GEOMETRY.dispose();
  SHARED_SPHERE_GEOMETRY.dispose();
  SHARED_EYE_GEOMETRY.dispose();
  SHARED_AURA_GEOMETRY.dispose();
  SHARED_RING_GEOMETRY.dispose();
  SHARED_ACTIVITY_GEOMETRY.dispose();
}

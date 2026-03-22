'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface ReadyPlayerMeAvatarProps {
  url: string;
  color?: string;
  emissiveIntensity?: number;
  scale?: number;
}

export function ReadyPlayerMeAvatar({ 
  url, 
  color = '#ffffff',
  emissiveIntensity = 0.1,
  scale = 1 
}: ReadyPlayerMeAvatarProps) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const disposedRef = useRef(false);

  useEffect(() => {
    // Reset disposed flag when URL changes
    disposedRef.current = false;

    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Clone material to avoid modifying shared materials
        if (mesh.material) {
          const originalMaterial = mesh.material as THREE.MeshStandardMaterial;
          mesh.material = originalMaterial.clone();
          const material = mesh.material as THREE.MeshStandardMaterial;

          material.emissive = new THREE.Color(color);
          material.emissiveIntensity = emissiveIntensity;
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    // Cleanup function to dispose resources
    return () => {
      if (disposedRef.current) return;
      disposedRef.current = true;

      clonedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;

          // Dispose geometry
          if (mesh.geometry) {
            mesh.geometry.dispose();
          }

          // Dispose material(s)
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => mat.dispose());
            } else {
              (mesh.material as THREE.Material).dispose();
            }
          }
        }
      });
    };
  }, [clonedScene, color, emissiveIntensity]);

  return <primitive object={clonedScene} scale={scale} position={[0, -1, 0]} />;
}

// Preload function for optimization
export function preloadAvatar(url: string) {
  return useGLTF.preload(url);
}

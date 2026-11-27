import React, { useMemo, useRef } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { VEHICLE } from './vehicleConfig.js';
import { createTrackCurve } from '../world/trackPath.js';

export default function Rival({ onLap, raceActive = true }) {
  const body = useRef();
  const gltf = useGLTF(VEHICLE.model);
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const curve = useMemo(() => createTrackCurve(), []);
  const progress = useRef(0.045);
  const speed = 17.5;
  const curveLength = useMemo(() => curve.getLength(), [curve]);

  useFrame((_, delta) => {
    if (!body.current) return;
    if (!raceActive) return;
    const dt = Math.min(delta, 0.04);
    const nextProgress = progress.current + (speed * dt) / curveLength;
    if (nextProgress >= 1) onLap?.();
    progress.current = nextProgress % 1;
    const point = curve.getPointAt(progress.current);
    const tangent = curve.getTangentAt(progress.current).normalize();
    const yaw = Math.atan2(tangent.x, tangent.z);
    body.current.setNextKinematicTranslation({ x: point.x, y: 0.2, z: point.z });
    body.current.setNextKinematicRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[0, 0.2, 0]}>
      <CuboidCollider args={[0.88, 0.48, 1.85]} position={[0, 0.72, 0]} />
      <group scale={VEHICLE.modelScale} position={VEHICLE.modelOffset}>
        <primitive object={model} />
      </group>
    </RigidBody>
  );
}

useGLTF.preload(VEHICLE.model);

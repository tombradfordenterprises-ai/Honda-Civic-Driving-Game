import React, { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { createTrackCurve } from './trackPath.js';

const treeTrunkGeometry = new THREE.CylinderGeometry(0.16, 0.23, 1.8, 7);
const treeTopGeometry = new THREE.ConeGeometry(1.05, 2.8, 8);
const treeTopSmallGeometry = new THREE.ConeGeometry(0.78, 2.1, 8);
const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#59422f', roughness: 1 });
const foliageMaterials = [
  new THREE.MeshStandardMaterial({ color: '#315b36', roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: '#3d6b3c', roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: '#496f3d', roughness: 1 })
];
const railMaterial = new THREE.MeshStandardMaterial({ color: '#aeb8bd', metalness: 0.72, roughness: 0.38 });
const postMaterial = new THREE.MeshStandardMaterial({ color: '#858f94', metalness: 0.55, roughness: 0.55 });

function makeAsphaltTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const grain = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const noise = ((grain - Math.floor(grain)) - 0.5) * 34;
      const value = THREE.MathUtils.clamp(54 + noise, 0, 255);
      data[i] = value;
      data[i + 1] = value + 2;
      data[i + 2] = value + 4;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export default function Track() {
  const roadRef = useMemo(() => {
    const curve = createTrackCurve();
    const segments = 720;
    const width = 12;
    const positions = [];
    const uvs = [];
    const indices = [];
    const leftPts = [];
    const rightPts = [];

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const point = curve.getPointAt(u);
      const tangent = curve.getTangentAt(u).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      leftPts.push(point.clone().addScaledVector(side, width / 2));
      rightPts.push(point.clone().addScaledVector(side, -width / 2));
      const l = leftPts[i], r = rightPts[i];
      positions.push(l.x, -0.385, l.z, r.x, -0.385, r.z);
      uvs.push(0, u * 48, 1, u * 48);
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return { curve, geometry, leftPts, rightPts };
  }, []);

  const asphalt = useMemo(() => makeAsphaltTexture(), []);
  const dashes = [];
  for (let i = 0; i < 180; i += 2) {
    const u = i / 180;
    const point = roadRef.curve.getPointAt(u);
    const tangent = roadRef.curve.getTangentAt(u).normalize();
    const angle = Math.atan2(tangent.x, tangent.z);
    dashes.push({ point, angle, key: i });
  }

  const finishPoint = roadRef.curve.getPointAt(0);
  const finishTangent = roadRef.curve.getTangentAt(0).normalize();
  const finishAngle = Math.atan2(finishTangent.x, finishTangent.z);
  const finishTiles = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 12; col++) {
      finishTiles.push({
        key: row * 12 + col,
        x: (col - 5.5) * 1,
        z: (row - 0.5) * 0.85,
        color: (row + col) % 2 === 0 ? '#f4f4ee' : '#202326'
      });
    }
  }

  const edgeLines = [roadRef.leftPts, roadRef.rightPts].map(pts => {
    const positions = [];
    for (const pt of pts) positions.push(pt.x, -0.373, pt.z);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  });

  const trees = [];
  const curbs = [];
  const guardrails = [];
  for (let i = 0; i < 64; i++) {
    const u = (i + 0.5) / 64;
    const point = roadRef.curve.getPointAt(u);
    const tangent = roadRef.curve.getTangentAt(u).normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const sign = i % 2 === 0 ? 1 : -1;
    const treePoint = point.clone().addScaledVector(side, sign * (21 + (i % 4) * 2.2));
    trees.push({
      key: i, point: treePoint, scale: 0.78 + (i % 5) * 0.11,
      foliage: foliageMaterials[i % foliageMaterials.length]
    });

    // Raised red/white rumble strips at selected bend sections.
    if ((u > 0.12 && u < 0.29) || (u > 0.42 && u < 0.58) || (u > 0.72 && u < 0.88)) {
      const curbPoint = point.clone().addScaledVector(side, sign * 6.25);
      curbs.push({ key: i, point: curbPoint, angle: Math.atan2(tangent.x, tangent.z), color: i % 2 ? '#e9e7df' : '#c94b43' });
    }

    // Short guardrail runs on the outside of selected faster bends.
    if (i % 2 === 0 && u > 0.16 && u < 0.9) {
      const railPoint = point.clone().addScaledVector(side, sign * 8.1);
      guardrails.push({ key: i, point: railPoint, angle: Math.atan2(tangent.x, tangent.z) });
    }
  }

  return <>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[190, 0.2, 160]} position={[-82, -0.2, 0]} friction={1.4} />
    </RigidBody>

    {/* Broad infield and runoff grass */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-82, -0.405, 0]} receiveShadow>
      <planeGeometry args={[360, 300]} />
      <meshStandardMaterial color="#527b43" roughness={1} />
    </mesh>

    {/* Asphalt with fine grain texture */}
    <mesh geometry={roadRef.geometry} receiveShadow>
      <meshStandardMaterial map={asphalt} color="#b7b7b7" roughness={0.94} metalness={0.02} side={THREE.DoubleSide} />
    </mesh>

    {/* Checkered three-lap start and finish line */}
    <group position={[finishPoint.x, -0.355, finishPoint.z]} rotation={[0, finishAngle, 0]}>
      {finishTiles.map(tile => (
        <mesh key={tile.key} position={[tile.x, 0, tile.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.85]} />
          <meshBasicMaterial color={tile.color} />
        </mesh>
      ))}
    </group>

    {/* Painted road-edge lines and broken centre line */}
    {edgeLines.map((geometry, i) => (
      <line key={i} geometry={geometry}>
        <lineBasicMaterial color="#f4f1e8" />
      </line>
    ))}
    {dashes.map(({ point, angle, key }) => (
      <mesh key={key} position={[point.x, -0.365, point.z]} rotation={[-Math.PI / 2, 0, -angle]}>
        <planeGeometry args={[0.16, 2.5]} />
        <meshStandardMaterial color="#e8d58b" roughness={0.8} />
      </mesh>
    ))}

    {/* Red and off-white curb blocks through the tighter corners */}
    {curbs.map(({ key, point, angle, color }) => (
      <mesh key={key} position={[point.x, -0.345, point.z]} rotation={[0, angle, 0]} receiveShadow>
        <boxGeometry args={[0.7, 0.12, 2.8]} />
        <meshStandardMaterial color={color} roughness={0.86} />
      </mesh>
    ))}

    {/* Metal safety rails and support posts */}
    {guardrails.map(({ key, point, angle }) => (
      <group key={key} position={[point.x, 0, point.z]} rotation={[0, angle, 0]}>
        <mesh position={[0, 0.62, 0]} castShadow>
          <boxGeometry args={[0.18, 0.16, 5.2]} />
          <primitive object={railMaterial} attach="material" />
        </mesh>
        {[-2.1, 0, 2.1].map(z => (
          <mesh key={z} position={[0, 0.3, z]} castShadow>
            <boxGeometry args={[0.13, 0.62, 0.13]} />
            <primitive object={postMaterial} attach="material" />
          </mesh>
        ))}
      </group>
    ))}

    {/* Simple tree line around the outside of the circuit */}
    {trees.map(({ key, point, scale, foliage }) => (
      <group key={key} position={[point.x, 0, point.z]} scale={scale}>
        <mesh position={[0, 0.9, 0]} geometry={treeTrunkGeometry} material={trunkMaterial} castShadow />
        <mesh position={[0, 2.25, 0]} geometry={treeTopGeometry} material={foliage} castShadow />
        <mesh position={[0, 3.15, 0]} geometry={treeTopSmallGeometry} material={foliage} castShadow />
      </group>
    ))}
  </>;
}

import React, { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

export default function Track() {
  const roadRef = useMemo(() => {
    // Closed, oval-like circuit with a sequence of linked bends.
    // The start is at [0, 0, 0], with the road initially heading forward (+Z).
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 30),
      new THREE.Vector3(-12, 0, 60),
      new THREE.Vector3(-38, 0, 88),
      new THREE.Vector3(-75, 0, 105),
      new THREE.Vector3(-115, 0, 100),
      new THREE.Vector3(-145, 0, 75),
      new THREE.Vector3(-162, 0, 38),
      new THREE.Vector3(-165, 0, -5),
      new THREE.Vector3(-150, 0, -48),
      new THREE.Vector3(-120, 0, -82),
      new THREE.Vector3(-82, 0, -105),
      new THREE.Vector3(-42, 0, -110),
      new THREE.Vector3(-12, 0, -88),
      new THREE.Vector3(0, 0, -58),
      new THREE.Vector3(0, 0, -30)
    ];
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.45);
    const segments = 640;
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
      uvs.push(0, u * 36, 1, u * 36);
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

  const dashes = [];
  for (let i = 0; i < 160; i += 2) {
    const u = i / 160;
    const point = roadRef.curve.getPointAt(u);
    const tangent = roadRef.curve.getTangentAt(u).normalize();
    const angle = Math.atan2(tangent.x, tangent.z);
    dashes.push({ point, angle, key: i });
  }

  const edgeLines = [roadRef.leftPts, roadRef.rightPts].map(pts => {
    const positions = [];
    for (const pt of pts) positions.push(pt.x, -0.373, pt.z);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  });

  return <>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[190, 0.2, 160]} position={[-82, -0.2, 0]} friction={1.4} />
    </RigidBody>

    {/* Grass field surrounding the complete loop */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-82, -0.405, 0]} receiveShadow>
      <planeGeometry args={[360, 300]} />
      <meshStandardMaterial color="#579447" roughness={1} />
    </mesh>

    {/* Continuous closed asphalt ribbon */}
    <mesh geometry={roadRef.geometry} receiveShadow>
      <meshStandardMaterial color="#30363a" roughness={0.97} side={THREE.DoubleSide} />
    </mesh>

    {/* White road-edge markings */}
    {edgeLines.map((geometry, i) => (
      <line key={i} geometry={geometry}>
        <lineBasicMaterial color="#f5f2e8" linewidth={2} />
      </line>
    ))}

    {/* Broken yellow centre line follows the full circuit */}
    {dashes.map(({ point, angle, key }) => (
      <mesh key={key} position={[point.x, -0.365, point.z]} rotation={[-Math.PI / 2, 0, -angle]}>
        <planeGeometry args={[0.16, 2.5]} />
        <meshStandardMaterial color="#f4dc82" roughness={0.8} />
      </mesh>
    ))}

    {/* Alternating roadside markers around the loop */}
    {Array.from({ length: 64 }, (_, i) => {
      const u = (i + 1) / 65;
      const pt = roadRef.curve.getPointAt(u);
      const tangent = roadRef.curve.getTangentAt(u).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const sign = i % 2 === 0 ? 1 : -1;
      const marker = pt.clone().addScaledVector(side, sign * (10 + (i % 3) * 2));
      return (
        <mesh key={i} position={[marker.x, 0.15, marker.z]}>
          <boxGeometry args={[0.22, 0.3, 0.22]} />
          <meshStandardMaterial color={i % 4 === 0 ? '#eee9dd' : '#d7d8d0'} />
        </mesh>
      );
    })}
  </>;
}

import React, { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

export default function Track() {
  const roadRef = useMemo(() => {
    // A flowing S-shaped test circuit. The car starts near the first straight.
    const points = [
      new THREE.Vector3(0, 0, -95),
      new THREE.Vector3(0, 0, -45),
      new THREE.Vector3(0, 0, 5),
      new THREE.Vector3(5, 0, 35),
      new THREE.Vector3(19, 0, 62),
      new THREE.Vector3(25, 0, 91),
      new THREE.Vector3(12, 0, 119),
      new THREE.Vector3(-10, 0, 143),
      new THREE.Vector3(-20, 0, 172),
      new THREE.Vector3(-8, 0, 199),
      new THREE.Vector3(13, 0, 222),
      new THREE.Vector3(18, 0, 250),
      new THREE.Vector3(4, 0, 278),
      new THREE.Vector3(-14, 0, 300)
    ];
    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.35);
    const segments = 420;
    const width = 12;
    const positions = [];
    const uvs = [];
    const indices = [];
    const leftPts = [];
    const rightPts = [];
    const centers = [];
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const point = curve.getPointAt(u);
      const tangent = curve.getTangentAt(u).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      centers.push(point.clone());
      leftPts.push(point.clone().addScaledVector(side, width / 2));
      rightPts.push(point.clone().addScaledVector(side, -width / 2));
      const l = leftPts[i], r = rightPts[i];
      positions.push(l.x, -0.385, l.z, r.x, -0.385, r.z);
      uvs.push(0, u * 30, 1, u * 30);
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return { curve, geometry, leftPts, rightPts, centers, segments };
  }, []);

  const dashes = [];
  for (let i = 0; i < 110; i += 2) {
    const u = Math.min(0.995, i / 110);
    const point = roadRef.curve.getPointAt(u);
    const tangent = roadRef.curve.getTangentAt(u).normalize();
    const angle = Math.atan2(tangent.x, tangent.z);
    dashes.push({ point, angle, key: i });
  }

  const edgeLines = [-1, 1].map(side => {
    const pts = side < 0 ? roadRef.leftPts : roadRef.rightPts;
    const positions = [];
    for (const pt of pts) positions.push(pt.x, -0.373, pt.z);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  });

  return <>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[180, 0.2, 210]} position={[0,-0.2,105]} friction={1.4}/>
    </RigidBody>

    {/* Wide green grass field */}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.405,105]} receiveShadow>
      <planeGeometry args={[360,430]}/>
      <meshStandardMaterial color="#579447" roughness={1}/>
    </mesh>

    {/* Curving asphalt ribbon */}
    <mesh geometry={roadRef.geometry} receiveShadow>
      <meshStandardMaterial color="#30363a" roughness={0.97} side={THREE.DoubleSide}/>
    </mesh>

    {/* Continuous white road-edge markings */}
    {edgeLines.map((geometry, i) => (
      <line key={i} geometry={geometry}>
        <lineBasicMaterial color="#f5f2e8" linewidth={2}/>
      </line>
    ))}

    {/* Broken yellow centre line follows every bend */}
    {dashes.map(({point, angle, key}) => (
      <mesh key={key} position={[point.x,-0.365,point.z]} rotation={[-Math.PI/2,0,-angle]}>
        <planeGeometry args={[0.16,2.5]}/>
        <meshStandardMaterial color="#f4dc82" roughness={0.8}/>
      </mesh>
    ))}

    {/* Simple grass verges and scattered roadside markers */}
    {Array.from({length:52}, (_,i) => {
      const u = (i + 1) / 54;
      const pt = roadRef.curve.getPointAt(u);
      const tangent = roadRef.curve.getTangentAt(u).normalize();
      const side = new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
      const sign = i % 2 === 0 ? 1 : -1;
      const marker = pt.clone().addScaledVector(side, sign * (10 + (i%3)*2));
      return <mesh key={i} position={[marker.x,0.15,marker.z]}>
        <boxGeometry args={[0.22,0.3,0.22]}/>
        <meshStandardMaterial color={i%4===0 ? "#eee9dd" : "#d7d8d0"}/>
      </mesh>;
    })}
  </>;
}


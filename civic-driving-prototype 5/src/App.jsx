import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Grid, Html, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

const MODEL = '/models/Honda_civic_ek9.glb';
const SCALE = 0.001;
const CENTER = new THREE.Vector3(-(-109.525), -(-1640.57), -(1154.72)).multiplyScalar(SCALE);

function useKeys() {
  const [keys, setKeys] = useState({});
  useEffect(() => {
    const down = e => { if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); setKeys(k => ({...k, [e.key.toLowerCase()]: true})); };
    const up = e => setKeys(k => ({...k, [e.key.toLowerCase()]: false}));
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);
  return keys;
}

function Civic({ keys, onTelemetry }) {
  const body = useRef();
  const visual = useRef();
  const gltf = useGLTF(MODEL);
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const speed = useRef(0);
  const steer = useRef(0);
  const forward = useRef(new THREE.Vector3());
  const velocity = useRef(new THREE.Vector3());

  useFrame((state, dt) => {
    if (!body.current) return;
    const rb = body.current;
    const t = Math.min(dt, 0.04);
    const throttle = keys.w || keys.arrowup ? 1 : 0;
    const brake = keys.s || keys.arrowdown ? 1 : 0;
    const left = keys.a || keys.arrowleft ? 1 : 0;
    const right = keys.d || keys.arrowright ? 1 : 0;
    const handbrake = !!keys[' '];
    const rot = rb.rotation();
    const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
    forward.current.set(0, 0, 1).applyQuaternion(q);
    velocity.current.copy(rb.linvel());
    const forwardSpeed = velocity.current.dot(forward.current);
    speed.current = forwardSpeed;

    // Gentle starter tuning: target top speed is about 65 km/h.
    const MAX_FORWARD_SPEED = 18.0; // metres per second
    const canAccelerate = forwardSpeed < MAX_FORWARD_SPEED;
    const driveForce = (throttle && canAccelerate ? 350 : 0)
      - brake * Math.sign(forwardSpeed || 1) * 1500;
    rb.applyImpulse({x: forward.current.x * driveForce * t, y: 0, z: forward.current.z * driveForce * t}, true);

    // Stronger rolling resistance helps the Civic settle down when throttle is released.
    const drag = handbrake ? 11 : 2.0;
    rb.applyImpulse({x: -velocity.current.x * drag * t, y: 0, z: -velocity.current.z * drag * t}, true);

    const steerInput = right - left;
    // Slower steering ramp makes keyboard input feel progressive instead of instant.
    steer.current = THREE.MathUtils.damp(steer.current, steerInput, 2.6, t);
    const steerStrength = THREE.MathUtils.clamp(Math.abs(forwardSpeed) / 3.0, 0, 1);
    rb.applyTorqueImpulse({
      x: 0,
      y: steer.current * steerStrength * Math.sign(forwardSpeed || 1) * t * 260,
      z: 0
    }, true);
    // Keep the car upright in this early arcade-physics pass.
    rb.setAngularDamping(2.2);
    onTelemetry(Math.abs(forwardSpeed) * 3.6);

    if (visual.current) {
      const p = rb.translation();
      const target = new THREE.Vector3(p.x, p.y + 1.7, p.z - 6.8);
      state.camera.position.lerp(target, 1 - Math.exp(-4 * t));
      state.camera.lookAt(p.x, p.y + 0.65, p.z + 0.8);
    }
  });

  return <RigidBody ref={body} colliders={false} position={[0, 0.2, 0]} mass={1050} linearDamping={0.12} angularDamping={2.2} enabledRotations={[false, true, false]}>
    <CuboidCollider args={[0.88, 0.48, 1.85]} position={[0, 0.72, 0]} friction={1.1} restitution={0.02}/>
    <group ref={visual} scale={SCALE} position={CENTER.toArray()}>
      <primitive object={model} />
    </group>
  </RigidBody>;
}

function Track() {
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

function Scene({keys,onTelemetry}) {
  return <Canvas shadows dpr={[1,1.7]}>
    <PerspectiveCamera makeDefault position={[0,4,-8]} fov={55}/>
    <color attach="background" args={['#78b9e8']}/>
    <fog attach="fog" args={['#78b9e8',90,240]}/>
    <ambientLight intensity={0.7}/><directionalLight position={[12,18,-8]} intensity={2.1} castShadow shadow-mapSize={[2048,2048]}/>
    <Suspense fallback={<Html center><div className="loading">Loading Civic model…</div></Html>}>
      <Physics gravity={[0,-9.81,0]}><Track/><Civic keys={keys} onTelemetry={onTelemetry}/></Physics>
      <Environment preset="city"/>
    </Suspense>
  </Canvas>;
}

export default function App() {
  const keys = useKeys();
  const [speed,setSpeed] = useState(0);
  return <main>
    <Scene keys={keys} onTelemetry={v=>setSpeed(Math.round(v))}/>
    <div className="topbar"><div><span className="eyebrow">DRIVING PROTOTYPE</span><h1>HONDA CIVIC EK9</h1></div><div className="speed"><strong>{speed}</strong><span>KM/H</span></div></div>
    <div className="help"><b>CONTROLS</b><span>W / ↑ Accelerate</span><span>S / ↓ Brake</span><span>A D / ← → Steer</span><span>SPACE Handbrake</span></div>
    <div className="notice">EARLY BUILD · Test track · Arcade physics</div>
  </main>;
}
useGLTF.preload(MODEL);

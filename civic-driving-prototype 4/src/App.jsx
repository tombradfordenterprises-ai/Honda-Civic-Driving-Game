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
    steer.current = THREE.MathUtils.damp(steer.current, steerInput, 8, t);
    // Steering begins at low speed and builds smoothly as the car moves.
    const steerStrength = THREE.MathUtils.clamp(Math.abs(forwardSpeed) / 1.5, 0, 1);
    rb.applyTorqueImpulse({
      x: 0,
      y: steer.current * steerStrength * Math.sign(forwardSpeed || 1) * t * 1100,
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
  const centerDashes = Array.from({length:30}, (_, i) => i);
  const curbSegments = Array.from({length:45}, (_, i) => i);
  return <>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[125, 0.2, 125]} position={[0,-0.2,0]} friction={1.4}/>
    </RigidBody>

    {/* Grass field surrounding the test road */}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.405,0]} receiveShadow>
      <planeGeometry args={[250,250]}/>
      <meshStandardMaterial color="#477b3d" roughness={1}/>
    </mesh>

    {/* Straight asphalt test road */}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.392,0]} receiveShadow>
      <planeGeometry args={[12,220]}/>
      <meshStandardMaterial color="#303438" roughness={0.96}/>
    </mesh>

    {/* White road edge lines */}
    {[-5.55,5.55].map(x => (
      <mesh key={x} rotation={[-Math.PI/2,0,0]} position={[x,-0.379,0]}>
        <planeGeometry args={[0.16,220]}/>
        <meshStandardMaterial color="#f3f0df" roughness={0.8}/>
      </mesh>
    ))}

    {/* Dashed centre line */}
    {centerDashes.map(i => (
      <mesh key={i} rotation={[-Math.PI/2,0,0]} position={[0,-0.378,-106+i*7.3]}>
        <planeGeometry args={[0.16,3.8]}/>
        <meshStandardMaterial color="#f5e7a7" roughness={0.8}/>
      </mesh>
    ))}

    {/* Red and white curbs at both road shoulders */}
    {curbSegments.map(i => (
      <React.Fragment key={i}>
        {[-1,1].map(side => (
          <mesh key={side} position={[side*6.25,-0.30,-108+i*4.9]}>
            <boxGeometry args={[0.5,0.18,2.45]}/>
            <meshStandardMaterial color={i%2===0 ? "#f2f0e8" : "#c84a3b"} roughness={0.9}/>
          </mesh>
        ))}
      </React.Fragment>
    ))}

    {/* Simple grassy verge detail */}
    {Array.from({length:36}, (_,i) => (
      <mesh key={i} position={[(i%2===0?-1:1)*(10+(i%5)*2),-0.02,-105+Math.floor(i/2)*12]}>
        <boxGeometry args={[0.35,0.08,0.35]}/>
        <meshStandardMaterial color="#315f32" roughness={1}/>
      </mesh>
    ))}
  </>;
}

function Scene({keys,onTelemetry}) {
  return <Canvas shadows dpr={[1,1.7]}>
    <PerspectiveCamera makeDefault position={[0,4,-8]} fov={55}/>
    <color attach="background" args={['#aebbc3']}/>
    <fog attach="fog" args={['#aebbc3',35,105]}/>
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

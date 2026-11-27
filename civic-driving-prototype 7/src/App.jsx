import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Html, PerspectiveCamera } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import useKeys from './hooks/useKeys.js';
import Civic from './vehicle/Civic.jsx';
import Track from './world/Track.jsx';
import HUD from './ui/HUD.jsx';

function Scene({ keys, onTelemetry }) {
  return (
    <Canvas shadows dpr={[1, 1.7]}>
      <PerspectiveCamera makeDefault position={[0, 4, -8]} fov={55} />
      <color attach="background" args={['#78b9e8']} />
      <fog attach="fog" args={['#78b9e8', 90, 240]} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[12, 18, -8]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Suspense fallback={<Html center><div className="loading">Loading Civic model…</div></Html>}>
        <Physics gravity={[0, -9.81, 0]}>
          <Track />
          <Civic keys={keys} onTelemetry={onTelemetry} />
        </Physics>
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}

export default function App() {
  const keys = useKeys();
  const [speed, setSpeed] = useState(0);

  return (
    <main>
      <Scene keys={keys} onTelemetry={value => setSpeed(Math.round(value))} />
      <HUD speed={speed} />
    </main>
  );
}

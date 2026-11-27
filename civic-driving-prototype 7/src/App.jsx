import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Html, PerspectiveCamera } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import useKeys from './hooks/useKeys.js';
import Civic from './vehicle/Civic.jsx';
import Rival from './vehicle/Rival.jsx';
import Track from './world/Track.jsx';
import HUD from './ui/HUD.jsx';

function Scene({ keys, onTelemetry, cameraMode, onPlayerLap, onRivalLap, raceActive }) {
  return (
    <Canvas shadows dpr={[1, 1.7]} gl={{ antialias: true }}>
      <PerspectiveCamera makeDefault position={[0, 4, -8]} fov={55} />
      <color attach="background" args={['#9fc8e4']} />
      <fog attach="fog" args={['#a9c9d9', 115, 310]} />
      <hemisphereLight skyColor="#d9efff" groundColor="#526342" intensity={0.9} />
      <ambientLight intensity={0.38} />
      <directionalLight
        position={[-55, 75, 35]}
        intensity={2.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-190}
        shadow-camera-right={190}
        shadow-camera-top={170}
        shadow-camera-bottom={-170}
      />
      <Suspense fallback={<Html center><div className="loading">Loading Civic model…</div></Html>}>
        <Physics gravity={[0, -9.81, 0]}>
          <Track />
          <Civic keys={keys} onTelemetry={onTelemetry} cameraMode={cameraMode} onLap={onPlayerLap} raceActive={raceActive} />
          <Rival onLap={onRivalLap} raceActive={raceActive} />
        </Physics>
        <Environment preset="park" />
      </Suspense>
    </Canvas>
  );
}

export default function App() {
  const keys = useKeys();
  const [speed, setSpeed] = useState(0);
  const [cameraMode, setCameraMode] = useState('bumper');
  const [playerLap, setPlayerLap] = useState(1);
  const [rivalLap, setRivalLap] = useState(1);
  const [raceStatus, setRaceStatus] = useState('racing');
  const [raceKey, setRaceKey] = useState(0);
  const raceActive = raceStatus === 'racing';
  const completeLap = racer => {
    if (racer === 'player') {
      setPlayerLap(current => {
        if (current >= 3) { setRaceStatus(status => status === 'racing' ? 'won' : status); return 3; }
        return current + 1;
      });
    } else {
      setRivalLap(current => {
        if (current >= 3) { setRaceStatus(status => status === 'racing' ? 'lost' : status); return 3; }
        return current + 1;
      });
    }
  };
  const restartRace = () => {
    setPlayerLap(1); setRivalLap(1); setRaceStatus('racing'); setRaceKey(key => key + 1);
  };

  return (
    <main>
      <Scene key={raceKey} keys={keys} onTelemetry={value => setSpeed(Math.round(value))} cameraMode={cameraMode}
        onPlayerLap={() => completeLap('player')} onRivalLap={() => completeLap('rival')} raceActive={raceActive} />
      <HUD speed={speed} cameraMode={cameraMode} onToggleCamera={() => setCameraMode(mode => mode === 'bumper' ? 'cockpit' : 'bumper')}
        playerLap={playerLap} rivalLap={rivalLap} raceStatus={raceStatus} onRestart={restartRace} />
    </main>
  );
}

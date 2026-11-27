import React from 'react';

export default function HUD({ speed, cameraMode, onToggleCamera, playerLap, rivalLap, raceStatus, onRestart }) {
  return (
    <>
      <div className="topbar">
        <div>
          <span className="eyebrow">DRIVING PROTOTYPE</span>
          <h1>HONDA CIVIC EK9</h1>
        </div>
        <div className="race-score"><div><small>YOUR LAP</small><strong>{playerLap}/3</strong></div><div><small>RIVAL</small><strong>{rivalLap}/3</strong></div></div>
        <div className="speed"><strong>{speed}</strong><span>KM/H</span></div>
      </div>
      <button className="camera-toggle" onClick={onToggleCamera}>
        VIEW: {cameraMode === 'bumper' ? 'BUMPER' : 'COCKPIT'} · SWITCH
      </button>
      <div className="help">
        <b>CONTROLS</b>
        <span>W / ↑ Accelerate</span>
        <span>S / ↓ Brake</span>
        <span>A D / ← → Steer</span>
        <span>SPACE Handbrake</span>
      </div>
      <div className="notice">3 LAP RACE · FIRST TO THE FINISH WINS</div>
      {raceStatus !== 'racing' && <div className="race-result">
        <div className="result-card"><span>{raceStatus === 'won' ? 'CHECKERED FLAG' : 'RACE FINISHED'}</span>
          <h2>{raceStatus === 'won' ? 'YOU WIN!' : 'YOU LOSE'}</h2>
          <p>{raceStatus === 'won' ? 'You beat the rival Civic over three laps.' : 'The rival Civic crossed the finish line first.'}</p>
          <button onClick={onRestart}>RACE AGAIN</button>
        </div>
      </div>}
    </>
  );
}

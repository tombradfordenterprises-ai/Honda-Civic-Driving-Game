import React from 'react';

export default function HUD({ speed, cameraMode, onToggleCamera }) {
  return (
    <>
      <div className="topbar">
        <div>
          <span className="eyebrow">DRIVING PROTOTYPE</span>
          <h1>HONDA CIVIC EK9</h1>
        </div>
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
      <div className="notice">EARLY BUILD · Curvy test road · Arcade physics</div>
    </>
  );
}

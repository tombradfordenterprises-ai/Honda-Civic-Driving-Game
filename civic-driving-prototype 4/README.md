# Honda Civic EK9 Driving Prototype

A fast first-pass React + Three.js driving sandbox using the supplied `Honda_civic_ek9.glb` model.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Controls
- W / Up: accelerate
- S / Down: brake
- A / Left and D / Right: steer
- Space: handbrake

## Notes
- The supplied GLB is retained at `public/models/Honda_civic_ek9.glb`.
- The model contains 946 scene nodes, 137 meshes, 65 materials, and separate named tyre/rim/brake and steering-wheel elements.
- The first pass uses a simplified physics collider and arcade-style force/steering. It is a prototype, not a calibrated vehicle simulation.
- Wheel spin, steering-wheel animation, proper suspension, gearboxes, audio, and detailed collision geometry are follow-up work.

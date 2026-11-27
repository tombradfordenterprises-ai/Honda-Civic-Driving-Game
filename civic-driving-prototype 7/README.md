# Honda Civic EK9 Driving Prototype

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Project structure
- `src/App.jsx` — app composition and scene setup
- `src/hooks/useKeys.js` — keyboard input
- `src/vehicle/Civic.jsx` — vehicle model, physics, wheel animation and steering
- `src/vehicle/vehicleConfig.js` — editable vehicle tuning values
- `src/world/Track.jsx` — road, markings and grass environment
- `src/ui/HUD.jsx` — speedometer and control labels
- `src/style.css` — page and HUD styling
- `public/models/Honda_civic_ek9.glb` — original Civic model

## Incremental development rule
Make future changes in the smallest relevant file:
- Acceleration, braking, steering sensitivity, wheel radius: `src/vehicle/vehicleConfig.js`
- Wheel animation or vehicle physics behavior: `src/vehicle/Civic.jsx`
- Road layout, road width, grass and scenery: `src/world/Track.jsx`
- Speedometer and controls display: `src/ui/HUD.jsx`
- Keyboard mapping: `src/hooks/useKeys.js`
- Only change `src/App.jsx` when adding/removing top-level systems.

Do not replace the entire project for ordinary feature tweaks. Add a new component file for new independent systems and import it into `App.jsx`.

export const VEHICLE = {
  model: '/models/Honda_civic_ek9.glb',
  modelScale: 0.001,
  modelOffset: [0.109525, 1.64057, -1.15472],
  mass: 1050,
  maxForwardSpeed: 18,
  driveForce: 350,
  brakeForce: 1500,
  rollingResistance: 2,
  handbrakeDrag: 11,
  steeringDamping: 1.8,
  steeringTorque: 100,
  frontWheelMaxAngle: 0.18,
  wheelRadius: 0.31,

  // Visual spring/damper suspension tuning (metres and response rates).
  suspensionTravel: 0.045,
  suspensionSpring: 34,
  suspensionDamping: 8.5,
  suspensionPitchResponse: 0.0022,
  suspensionRollResponse: 0.0018,

  // Smooth third-person chase camera.
  cameraHeight: 3.2,
  cameraDistance: 8.5,
  cameraLookAhead: 5.5,
  cameraFollowSpeed: 4.5,
  cameraLookSpeed: 6
};

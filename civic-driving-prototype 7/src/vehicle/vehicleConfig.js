export const VEHICLE = {
  model: '/models/Honda_civic_ek9.glb',
  modelScale: 0.001,
  modelOffset: [0.109525, 1.64057, -1.15472],
  mass: 1050,
  maxForwardSpeed: 25,
  driveForce: 430,
  brakeForce: 1500,
  rollingResistance: 2,
  handbrakeDrag: 11,
  steeringDamping: 3.2,
  steeringTorque: 68,
  frontWheelMaxAngle: 0.34,
  roadHalfWidth: 6,
  grassSpeedMultiplier: 0.48,
  grassDriveMultiplier: 0.62,
  grassDrag: 9,
  wheelRadius: 0.31,

  // Visual spring/damper suspension tuning (metres and response rates).
  suspensionTravel: 0.045,
  suspensionSpring: 42,
  suspensionDamping: 12,
  suspensionPitchResponse: 0.0015,
  suspensionRollResponse: 0.0012,

  // Low, close bumper-style chase camera with speed-sensitive perspective.
  cameraHeight: 1.55,
  cameraDistance: 3.8,
  cameraLookAhead: 8,
  cameraFollowSpeed: 3.2,
  cameraLookSpeed: 3.8,
  cameraBaseFov: 64,
  cameraFastFov: 78,
  cameraFovDamping: 2.5
};

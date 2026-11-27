import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { VEHICLE } from './vehicleConfig.js';

const WHEEL_PART_PATTERN = /^(guma_|rim_|rim_cap_|srouby_|uwu_disc|uwu_pad)/i;
const WHEEL_SIDE = {
  frontLeft: 'LF',
  frontRight: 'RF',
  rearLeft: 'LR',
  rearRight: 'RR'
};

function createWheelRig(model) {
  model.updateMatrixWorld(true);
  const productRoot = model.getObjectByName('Product1') || model;
  const rig = {};

  for (const [key, suffix] of Object.entries(WHEEL_SIDE)) {
    const tyre = productRoot.children.find(child => child.name.startsWith(`guma_${suffix}`));
    if (!tyre) {
      console.warn(`Civic model: couldn't find tyre group for ${suffix}`);
      continue;
    }

    const bounds = new THREE.Box3().setFromObject(tyre);
    const worldCenter = bounds.getCenter(new THREE.Vector3());
    const localCenter = productRoot.worldToLocal(worldCenter.clone());
    const pivot = new THREE.Group();
    pivot.name = `wheel-pivot-${suffix}`;
    pivot.position.copy(localCenter);
    productRoot.add(pivot);
    productRoot.updateMatrixWorld(true);

    const parts = productRoot.children.filter(child => {
      if (child === pivot) return false;
      return WHEEL_PART_PATTERN.test(child.name) && child.name.toUpperCase().includes(suffix);
    });
    parts.forEach(part => pivot.attach(part));
    pivot.userData.wheelSide = suffix;
    rig[key] = pivot;
  }

  model.updateMatrixWorld(true);
  return rig;
}

export default function Civic({ keys, onTelemetry }) {
  const body = useRef();
  const visual = useRef();
  const wheelSpin = useRef(0);
  const gltf = useGLTF(VEHICLE.model);
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const wheelRig = useMemo(() => createWheelRig(model), [model]);
  const forward = useRef(new THREE.Vector3());
  const velocity = useRef(new THREE.Vector3());
  const steer = useRef(0);
  const previousForwardSpeed = useRef(0);
  const suspension = useRef({
    heave: 0, heaveVelocity: 0,
    pitch: 0, pitchVelocity: 0,
    roll: 0, rollVelocity: 0,
    wheel: {}
  });
  const wheelBasePositions = useMemo(() => {
    const positions = {};
    for (const [key, pivot] of Object.entries(wheelRig)) {
      positions[key] = pivot.position.clone();
    }
    return positions;
  }, [wheelRig]);
  const cameraPosition = useRef(new THREE.Vector3());
  const cameraLookAt = useRef(new THREE.Vector3());
  const cameraInitialized = useRef(false);
  const cameraFov = useRef(64);

  useFrame((state, delta) => {
    if (!body.current) return;
    const rb = body.current;
    const dt = Math.min(delta, 0.04);
    const throttle = keys.w || keys.arrowup ? 1 : 0;
    const brake = keys.s || keys.arrowdown ? 1 : 0;
    const left = keys.a || keys.arrowleft ? 1 : 0;
    const right = keys.d || keys.arrowright ? 1 : 0;
    const handbrake = !!keys[' '];

    const rotation = rb.rotation();
    const orientation = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    forward.current.set(0, 0, 1).applyQuaternion(orientation);
    velocity.current.copy(rb.linvel());
    const forwardSpeed = velocity.current.dot(forward.current);

    const canAccelerate = forwardSpeed < VEHICLE.maxForwardSpeed;
    const driveForce = (throttle && canAccelerate ? VEHICLE.driveForce : 0)
      - brake * Math.sign(forwardSpeed || 1) * VEHICLE.brakeForce;
    rb.applyImpulse({
      x: forward.current.x * driveForce * dt,
      y: 0,
      z: forward.current.z * driveForce * dt
    }, true);

    const drag = handbrake ? VEHICLE.handbrakeDrag : VEHICLE.rollingResistance;
    rb.applyImpulse({
      x: -velocity.current.x * drag * dt,
      y: 0,
      z: -velocity.current.z * drag * dt
    }, true);

    const steeringInput = left - right;
    steer.current = THREE.MathUtils.damp(steer.current, steeringInput, VEHICLE.steeringDamping, dt);
    const steeringAtSpeed = THREE.MathUtils.clamp(Math.abs(forwardSpeed) / 7, 0, 1);
    rb.applyTorqueImpulse({
      x: 0,
      y: steer.current * steeringAtSpeed * Math.sign(forwardSpeed || 1)
        * VEHICLE.steeringTorque * dt,
      z: 0
    }, true);

    const steeringAngle = steer.current * VEHICLE.frontWheelMaxAngle;
    if (wheelRig.frontLeft) wheelRig.frontLeft.rotation.y = steeringAngle;
    if (wheelRig.frontRight) wheelRig.frontRight.rotation.y = steeringAngle;

    wheelSpin.current += (forwardSpeed / VEHICLE.wheelRadius) * dt;
    for (const wheel of Object.values(wheelRig)) {
      if (wheel) wheel.rotation.x = wheelSpin.current;
    }

    // Spring-damper suspension: each corner gets its own road input and travel.
    // The chassis reacts to braking/acceleration and cornering with subtle pitch and roll.
    const distanceStep = Math.abs(forwardSpeed) * dt;
    const distance = wheelSpin.current * VEHICLE.wheelRadius;
    const cornerKeys = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'];
    let averageTravel = 0;
    const suspensionState = suspension.current;
    for (let i = 0; i < cornerKeys.length; i++) {
      const key = cornerKeys[i];
      const phase = [0, 1.7, 3.1, 4.6][i];
      const roadBump = Math.sin(distance * 0.72 + phase) * 0.006
        + Math.sin(distance * 1.85 + phase * 1.3) * 0.002;
      const target = THREE.MathUtils.clamp(roadBump, -VEHICLE.suspensionTravel, VEHICLE.suspensionTravel);
      const stateAtWheel = suspensionState.wheel[key] || { offset: 0, velocity: 0 };
      const springForce = (target - stateAtWheel.offset) * VEHICLE.suspensionSpring;
      const damperForce = stateAtWheel.velocity * VEHICLE.suspensionDamping;
      stateAtWheel.velocity += (springForce - damperForce) * dt;
      stateAtWheel.offset += stateAtWheel.velocity * dt;
      stateAtWheel.offset = THREE.MathUtils.clamp(
        stateAtWheel.offset, -VEHICLE.suspensionTravel, VEHICLE.suspensionTravel
      );
      suspensionState.wheel[key] = stateAtWheel;
      averageTravel += stateAtWheel.offset / 4;

      const pivot = wheelRig[key];
      const base = wheelBasePositions[key];
      if (pivot && base) {
        // Wheel model coordinates are scaled down to metres by modelScale.
        pivot.position.y = base.y + stateAtWheel.offset / VEHICLE.modelScale;
      }
    }

    const longitudinalAcceleration = (forwardSpeed - previousForwardSpeed.current) / Math.max(dt, 0.001);
    previousForwardSpeed.current = forwardSpeed;
    const pitchTarget = THREE.MathUtils.clamp(
      -longitudinalAcceleration * VEHICLE.suspensionPitchResponse, -0.055, 0.055
    );
    const lateralAcceleration = steer.current * forwardSpeed * forwardSpeed * 0.012;
    const rollTarget = THREE.MathUtils.clamp(
      -lateralAcceleration * VEHICLE.suspensionRollResponse, -0.065, 0.065
    );

    const springStep = (value, velocityValue, target, stiffness, damping) => {
      const acceleration = (target - value) * stiffness - velocityValue * damping;
      velocityValue += acceleration * dt;
      value += velocityValue * dt;
      return [value, velocityValue];
    };
    [suspensionState.heave, suspensionState.heaveVelocity] = springStep(
      suspensionState.heave, suspensionState.heaveVelocity, averageTravel,
      VEHICLE.suspensionSpring, VEHICLE.suspensionDamping
    );
    [suspensionState.pitch, suspensionState.pitchVelocity] = springStep(
      suspensionState.pitch, suspensionState.pitchVelocity, pitchTarget, 22, 7
    );
    [suspensionState.roll, suspensionState.rollVelocity] = springStep(
      suspensionState.roll, suspensionState.rollVelocity, rollTarget, 24, 8
    );

    if (visual.current) {
      visual.current.position.y = VEHICLE.modelOffset[1] + suspensionState.heave;
      visual.current.rotation.x = suspensionState.pitch;
      visual.current.rotation.z = suspensionState.roll;
    }

    rb.setAngularDamping(2.2);
    onTelemetry(Math.abs(forwardSpeed) * 3.6);

    // Camera offset is rotated by the car's heading, so it stays behind the Civic
    // as it drives around bends instead of remaining behind in world-space.
    if (visual.current) {
      const position = rb.translation();
      const cameraOffset = new THREE.Vector3(0, VEHICLE.cameraHeight, -VEHICLE.cameraDistance)
        .applyQuaternion(orientation);
      const desiredCamera = new THREE.Vector3(position.x, position.y, position.z).add(cameraOffset);
      const desiredLookAt = new THREE.Vector3(position.x, position.y + 0.8, position.z)
        .addScaledVector(forward.current, VEHICLE.cameraLookAhead);

      if (!cameraInitialized.current) {
        cameraPosition.current.copy(desiredCamera);
        cameraLookAt.current.copy(desiredLookAt);
        cameraInitialized.current = true;
      }
      cameraPosition.current.lerp(desiredCamera, 1 - Math.exp(-VEHICLE.cameraFollowSpeed * dt));
      cameraLookAt.current.lerp(desiredLookAt, 1 - Math.exp(-VEHICLE.cameraLookSpeed * dt));
      state.camera.position.copy(cameraPosition.current);
      state.camera.lookAt(cameraLookAt.current);

      // A little speed-sensitive FOV gives a stronger sense of acceleration
      // without adding camera shake or artificial movement to the car.
      const speedRatio = THREE.MathUtils.clamp(Math.abs(forwardSpeed) / VEHICLE.maxForwardSpeed, 0, 1);
      const targetFov = THREE.MathUtils.lerp(VEHICLE.cameraBaseFov, VEHICLE.cameraFastFov, speedRatio);
      cameraFov.current = THREE.MathUtils.damp(cameraFov.current, targetFov, VEHICLE.cameraFovDamping, dt);
      if (state.camera.isPerspectiveCamera) {
        state.camera.fov = cameraFov.current;
        state.camera.updateProjectionMatrix();
      }
    }
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={[0, 0.2, 0]}
      mass={VEHICLE.mass}
      linearDamping={0.12}
      angularDamping={2.2}
      enabledRotations={[false, true, false]}
    >
      <CuboidCollider
        args={[0.88, 0.48, 1.85]}
        position={[0, 0.72, 0]}
        friction={1.1}
        restitution={0.02}
      />
      <group
        ref={visual}
        scale={VEHICLE.modelScale}
        position={VEHICLE.modelOffset}
      >
        <primitive object={model} />
      </group>
    </RigidBody>
  );
}

useGLTF.preload(VEHICLE.model);

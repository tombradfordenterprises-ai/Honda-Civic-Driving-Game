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

/**
 * Builds a pivot at each tyre's actual centre and moves the wheel-related
 * model objects under it. Object3D.attach preserves the original transforms.
 */
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

    // Reverse the previous steering sign so A/left turns left and D/right turns right.
    const steeringInput = left - right;
    steer.current = THREE.MathUtils.damp(
      steer.current,
      steeringInput,
      VEHICLE.steeringDamping,
      dt
    );
    // Steering builds more gradually with speed for small, predictable inputs.
    const steeringAtSpeed = THREE.MathUtils.clamp(Math.abs(forwardSpeed) / 7, 0, 1);
    rb.applyTorqueImpulse({
      x: 0,
      y: steer.current * steeringAtSpeed * Math.sign(forwardSpeed || 1)
        * VEHICLE.steeringTorque * dt,
      z: 0
    }, true);

    // Front wheels follow the corrected steering direction; all wheels roll with speed.
    const steeringAngle = steer.current * VEHICLE.frontWheelMaxAngle;
    if (wheelRig.frontLeft) wheelRig.frontLeft.rotation.y = steeringAngle;
    if (wheelRig.frontRight) wheelRig.frontRight.rotation.y = steeringAngle;

    wheelSpin.current += (forwardSpeed / VEHICLE.wheelRadius) * dt;
    for (const wheel of Object.values(wheelRig)) {
      if (wheel) wheel.rotation.x = wheelSpin.current;
    }

    rb.setAngularDamping(2.2);
    onTelemetry(Math.abs(forwardSpeed) * 3.6);

    if (visual.current) {
      const position = rb.translation();
      const cameraTarget = new THREE.Vector3(position.x, position.y + 1.7, position.z - 6.8);
      state.camera.position.lerp(cameraTarget, 1 - Math.exp(-4 * dt));
      state.camera.lookAt(position.x, position.y + 0.65, position.z + 0.8);
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

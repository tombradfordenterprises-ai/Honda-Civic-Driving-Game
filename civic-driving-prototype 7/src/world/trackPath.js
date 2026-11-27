import * as THREE from 'three';

export function createTrackCurve() {
  const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 30),
    new THREE.Vector3(-12, 0, 60),
    new THREE.Vector3(-38, 0, 88),
    new THREE.Vector3(-75, 0, 105),
    new THREE.Vector3(-115, 0, 100),
    new THREE.Vector3(-145, 0, 75),
    new THREE.Vector3(-162, 0, 38),
    new THREE.Vector3(-165, 0, -5),
    new THREE.Vector3(-150, 0, -48),
    new THREE.Vector3(-120, 0, -82),
    new THREE.Vector3(-82, 0, -105),
    new THREE.Vector3(-42, 0, -110),
    new THREE.Vector3(-12, 0, -88),
    new THREE.Vector3(0, 0, -58),
    new THREE.Vector3(0, 0, -30)
  ];
  return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.45);
}

export function distanceToTrack(curve, x, z, samples = 180) {
  let nearest = Infinity;
  for (let i = 0; i < samples; i++) {
    const point = curve.getPointAt(i / samples);
    const dx = point.x - x;
    const dz = point.z - z;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared < nearest) nearest = distanceSquared;
  }
  return Math.sqrt(nearest);
}

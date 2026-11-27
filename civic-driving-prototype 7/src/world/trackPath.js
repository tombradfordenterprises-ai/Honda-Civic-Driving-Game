import * as THREE from 'three';

export function createTrackCurve() {
  const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 22),
    new THREE.Vector3(-8, 0, 36),
    new THREE.Vector3(7, 0, 51),
    new THREE.Vector3(-9, 0, 66),
    new THREE.Vector3(-30, 0, 84),
    new THREE.Vector3(-55, 0, 101),
    new THREE.Vector3(-83, 0, 108),
    new THREE.Vector3(-108, 0, 99),
    new THREE.Vector3(-124, 0, 80),
    new THREE.Vector3(-143, 0, 69),
    new THREE.Vector3(-160, 0, 46),
    new THREE.Vector3(-171, 0, 17),
    new THREE.Vector3(-160, 0, -9),
    new THREE.Vector3(-174, 0, -34),
    new THREE.Vector3(-153, 0, -58),
    new THREE.Vector3(-130, 0, -84),
    new THREE.Vector3(-102, 0, -105),
    new THREE.Vector3(-74, 0, -112),
    new THREE.Vector3(-49, 0, -100),
    new THREE.Vector3(-28, 0, -116),
    new THREE.Vector3(-5, 0, -94),
    new THREE.Vector3(5, 0, -68),
    new THREE.Vector3(-7, 0, -48),
    new THREE.Vector3(0, 0, -30)
  ];
  return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.45);
}

export function getTrackProgress(curve, x, z, samples = 360) {
  let nearest = Infinity;
  let progress = 0;
  for (let i = 0; i < samples; i++) {
    const u = i / samples;
    const point = curve.getPointAt(u);
    const dx = point.x - x;
    const dz = point.z - z;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared < nearest) { nearest = distanceSquared; progress = u; }
  }
  return progress;
}

export function distanceToTrack(curve, x, z, samples = 240) {
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

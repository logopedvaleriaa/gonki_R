import * as THREE from 'three';
// Steering is a parent Y rotation; the tyre spins only on its child X axle.
export function createWheelRig(x,z){
 const pivot=new THREE.Group(),rotor=new THREE.Group();
 pivot.position.set(x,.43,z);pivot.add(rotor);pivot.userData.rotor=rotor;
 return pivot;
}
export function spinWheel(pivot,distance){
 const rotor=pivot.userData.rotor;
 rotor.rotation.x=(rotor.rotation.x+distance/.43)%(Math.PI*2);
}

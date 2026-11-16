import {test,expect} from '@playwright/test';
import * as THREE from 'three';
import {createWheelRig,spinWheel} from '../src/wheel-rig.js';
test('Колёса вращаются вокруг неподвижной оси при любом угле руля',()=>{
 for(const x of[-1.01,1.01])for(const z of[-1.37,1.35])for(const steer of[-.2,0,.2]){
  const pivot=createWheelRig(x,z);pivot.rotation.y=steer;pivot.updateMatrixWorld(true);
  const rotor=pivot.userData.rotor,axis=new THREE.Vector3(1,0,0).transformDirection(rotor.matrixWorld),center=new THREE.Vector3().setFromMatrixPosition(rotor.matrixWorld);
  for(let i=0;i<360;i++){
   spinWheel(pivot,.031);pivot.updateMatrixWorld(true);
   expect(axis.distanceTo(new THREE.Vector3(1,0,0).transformDirection(rotor.matrixWorld))).toBeLessThan(1e-12);
   expect(center.distanceTo(new THREE.Vector3().setFromMatrixPosition(rotor.matrixWorld))).toBeLessThan(1e-12);
  }
 }
});

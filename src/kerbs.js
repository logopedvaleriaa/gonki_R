import * as THREE from 'three';
// One continuous surface; colour boundaries share edges rather than overlapping boxes.
export function kerbGeometry(curve,side){
 const steps=Math.ceil(curve.getLength()/.8),width=.85,offset=6.4;
 const profile=[[-width/2,-.015],[-width/2,.1],[width/2,.1],[width/2,-.015]];
 const positions=[],colours=[],red=new THREE.Color('#ad372f'),white=new THREE.Color('#dddcd3');
 const ring=i=>{const t=i===steps?0:i/steps,p=curve.getPointAt(t),f=curve.getTangentAt(t),r=new THREE.Vector3(-f.z,0,f.x).normalize();return profile.map(([x,y])=>p.clone().addScaledVector(r,side*(offset+x)).add(new THREE.Vector3(0,y,0)))};
 let a=ring(0);
 for(let i=0;i<steps;i++){
  const b=ring(i+1),colour=Math.floor(i/5)%2?red:white;
  for(let k=0;k<3;k++){
   const q=[a[k],b[k],b[k+1],a[k+1]];
   for(const n of side===1?[0,3,1,3,2,1]:[0,1,3,3,1,2]){const v=q[n];positions.push(v.x,v.y,v.z);colours.push(colour.r,colour.g,colour.b)}
  }a=b;
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));g.computeVertexNormals();return g;
}

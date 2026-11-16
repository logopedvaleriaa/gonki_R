import * as THREE from 'three';
export const GUARDRAIL_OFFSET=8.5;
export function guardrailGeometry(curve,side){
 const steps=Math.ceil(curve.getLength()/1.2);
 const profile=[[0,.6],[.04,.64],[-.025,.72],[.04,.81],[-.025,.9],[.04,.99],[0,1.03]];
 const vertices=[],indices=[];
 for(let i=0;i<=steps;i++){
  const at=i===steps?0:i/steps,p=curve.getPointAt(at),t=curve.getTangentAt(at),right=new THREE.Vector3(-t.z,0,t.x).normalize();
  for(const [depth,height]of profile){const v=p.clone().addScaledVector(right,side*(GUARDRAIL_OFFSET+depth));vertices.push(v.x,v.y+height,v.z)}
  if(i<steps)for(let k=0;k<profile.length-1;k++){const a=i*profile.length+k,b=a+profile.length;indices.push(a,b,a+1,a+1,b,b+1)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

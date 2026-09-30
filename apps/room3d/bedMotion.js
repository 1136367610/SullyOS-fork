import {MathUtils} from 'three';
import {seatChangeDuration} from './chibi/roomMotionFrame.ts';

export function body2BedTransform(seat,headToHip){
 if(!seat?.bed)return seat;
 const forward=seat.bed.headEnd+headToHip-seat.bed.anchorZ;
 return {...seat,pose:'bed',position:[seat.position[0]+Math.sin(seat.rotation)*forward,seat.position[1],seat.position[2]+Math.cos(seat.rotation)*forward]};
}
export function bedEntry(seat,map,offset=[0,0]){
 const spec=seat.bed;if(!spec)return null;
 const c=Math.cos(spec.itemRotation),s=Math.sin(spec.itemRotation);
 for(const side of [spec.side,-spec.side])for(const z of [.7,1.1,-.2])for(const gap of [.55,.8,1.05]){
  const x=side*(spec.halfWidth+gap),p=[spec.center[0]+c*x+s*z,.18,spec.center[2]-s*x+c*z];
  if(map.free(p[0]+offset[0],p[2]+offset[1]))return p;
 }
 return null;
}
export function bedChangeFrame(time,rising=false){
 const duration=seatChangeDuration('bed'),t=MathUtils.clamp(time/duration,0,1),seconds=(rising?1-t:t)*duration,p=Math.min(seconds/4.8,.79),step=(a,b)=>MathUtils.smootherstep(p,a,b);
 // Reach the edge before loading the seat. Lift the dangling shins BEFORE
 // turning across the mattress; only recline after the pelvis is inboard.
 return {weight:step(.22,.38),edgeTravel:step(.12,.30),legLift:step(.43,.57),inboard:step(.59,.76),turn:step(0,.12),recline:MathUtils.clamp((seconds-3.792)/5.708333492279053,0,1),lean:0,done:t>=1};
}
export function bedEdge(seat,front){
 const b=seat.bed,c=Math.cos(b.itemRotation),s=Math.sin(b.itemRotation),dx=front[0]-b.center[0],dz=front[2]-b.center[2];
 const side=Math.sign(c*dx-s*dz),x=side*(b.edgeX??b.halfWidth-.18),z=s*dx+c*dz;
 return {position:[b.center[0]+c*x+s*z,b.edgeY===undefined?seat.position[1]:b.center[1]+b.edgeY,b.center[2]-s*x+c*z],rotation:b.itemRotation+side*Math.PI/2};
}
export function bedChangePose(change,time){
 const f=bedChangeFrame(time,change.rising),mix=MathUtils.lerp;
 const position=change.front.map((v,i)=>mix(mix(v,change.edge.position[i],f.edgeTravel),change.seat[i],f.inboard));
 // Root lift compensates for the rig's pelvis lowering; do not lift the
 // standing body into the air while it is still reaching the mattress.
 position[1]=mix(change.front[1],mix(change.edge.position[1],change.seat[1],f.inboard),f.weight);
 const turn=(from,to,t)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*t;
 const rotation=turn(turn(change.startRotation,change.edge.rotation,f.turn),change.rotation,f.inboard);
 return {...f,position,rotation};
}

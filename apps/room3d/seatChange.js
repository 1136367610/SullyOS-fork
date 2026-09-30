import {seatChangeFrame} from './chibi/roomMotionFrame.ts';
import {bedChangePose} from './bedMotion.js';

// The last short movement into a seat is outside ordinary walking clearance.
// Its standing endpoint must still be on free floor, facing the seat's front.
export function seatEntry(transform,map,offset=[0,0]){
 const [x,,z]=transform.position,angle=transform.rotation;
 for(let d=.45;d<=1.25;d+=.05){
  const p=[x+Math.sin(angle)*d,.18,z+Math.cos(angle)*d];
  if(map.free(p[0]+offset[0],p[2]+offset[1]))return p;
 }
 return null;
}
export function seatChangePose(change,time){
 if(change.pose==='bed')return bedChangePose(change,time);
 const f=seatChangeFrame(time,change.rising,change.pose);
 return {...f,position:change.front.map((v,i)=>v+(change.seat[i]-v)*(f.travel??f.weight))};
}

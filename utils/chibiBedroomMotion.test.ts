import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import catalog from '../public/room3d/catalog.json';
import {seatTransform} from '../apps/room3d/seating.js';
import {body2BedTransform,bedEntry,bedChangeFrame,bedEdge} from '../apps/room3d/bedMotion.js';
import {seatChangeDuration} from '../apps/room3d/chibi/roomMotionFrame';
import {seatChangePose} from '../apps/room3d/seatChange.js';
import {createBlankBody,BLANK_SCALE} from '../apps/room3d/chibi/blankBody';
import {bindBlankBody} from '../apps/room3d/chibi/blankRig';
import {createBlankMotion} from '../apps/room3d/chibi/blankMotion';
import {bodyHeightY} from '../apps/room3d/chibi/bodyHeight';

describe('Body 2 bedroom rest',()=>{
 const duration=seatChangeDuration('bed');
 it('places the edge on the shipped mattress surface rather than the hanging blanket bounds',async()=>{
  const bytes=readFileSync('public/room3d/show_bed.glb');
  const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');scene.updateMatrixWorld(true);
  const ray=new T.Raycaster(),item={id:'bed',assetId:'show_bed',x:0,y:.15,z:0,rotation:0};
  for(const side of [-1,1])for(const z of [.7,1.1,-.2]){
   const seat=seatTransform({id:'room',items:[item]},catalog,{roomId:'room',itemId:'bed',seatId:side<0?'0':'1',bed:true},true)!;
   const edge=bedEdge(seat,[side*2.375,.18,z]);
   ray.set(new T.Vector3(edge.position[0],4,z),new T.Vector3(0,-1,0));
   const hit=ray.intersectObject(scene,true)[0];expect(hit).toBeDefined();
   expect(Math.abs(edge.position[1]-item.y-hit.point.y)).toBeLessThan(.04);
  }
  scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
 });
 it('keeps each crown at the reviewed headboard margin across scales, sides and furniture rotation',()=>{
  for(const rotation of [0,90,180,270])for(const side of ['0','1'])for(const headToHip of [1.1,1.5,1.9]){
   const item={id:'bed',assetId:'show_bed',x:1,y:.15,z:-1,rotation},room={id:'room',items:[item]},selection={roomId:'room',itemId:'bed',seatId:side,bed:true};
   const original=seatTransform(room,catalog,selection)!,blank=body2BedTransform(seatTransform(room,catalog,selection,true),headToHip)!;
   expect(original.pose).toBe('chair');expect(blank.pose).toBe('bed');
   const angle=rotation*Math.PI/180,dx=blank.position[0]-item.x,dz=blank.position[2]-item.z;
   expect(dx*Math.sin(angle)+dz*Math.cos(angle)-headToHip).toBeCloseTo(-1.62);
   expect(dx*Math.cos(angle)-dz*Math.sin(angle)).toBeCloseTo(side==='0'?-.94:.94);
   expect(blank.position[1]).toBe(original.position[1]);
  }
 });
 it('uses safe bedside endpoints and reverses the complete sit/recline sequence',()=>{
  const seat={bed:{center:[2,.15,3],halfWidth:1.8,side:-1,itemRotation:Math.PI/2}};
  const front=bedEntry(seat,{free:(x:number,z:number)=>x>12&&z>25},[10,20]);expect(front).not.toBeNull();
  expect(bedEntry(seat,{free:()=>false})).toBeNull();
  const change={front:front!,seat:[2,.96,3],edge:bedEdge({...seat,position:[2,.96,3]},front!),rotation:Math.PI/2,startRotation:0,rising:false,pose:'bed'};
  expect(seatChangePose(change,0).position).toEqual(front);expect(seatChangePose(change,duration).position).toEqual(change.seat);
  expect(seatChangePose({...change,rising:true},duration).position).toEqual(front);
  expect(bedChangeFrame(.6).recline).toBe(0);expect(bedChangeFrame(duration).recline).toBe(1);
  for(const t of [.1,.8,1.6,2.3]){
   const a=seatChangePose(change,t),b=seatChangePose({...change,rising:true},duration-t);
   for(const key of ['weight','legLift','inboard','rotation','recline'] as const)expect(a[key]).toBeCloseTo(b[key]);
   a.position.forEach((v:number,i:number)=>expect(v).toBeCloseTo(b.position[i]));
  }
 });
 it('loads the actual bed edge before lifting legs, turning inboard and reclining on both sides',()=>{
  for(const rotation of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const side of [-1,1]){
   const c=Math.cos(rotation),s=Math.sin(rotation),center=[2,.15,3],local=(x:number,y:number,z:number)=>[2+c*x+s*z,y,3-s*x+c*z];
   const seat={position:local(side*.94,.96,-.1),bed:{center,halfWidth:1.825,edgeX:1.3,edgeY:.85,itemRotation:rotation}},front=local(side*2.375,.18,.7);
   const edge=bedEdge(seat,front),change={front,edge,seat:seat.position,rotation,startRotation:rotation,rising:false,pose:'bed'};
   for(let t=0;t<=duration;t+=.04){
    const f=seatChangePose(change,t),x=c*(f.position[0]-2)-s*(f.position[2]-3);
    if(f.weight===1)expect(Math.abs(x)).toBeLessThanOrEqual(1.3+1e-6);
    if(f.inboard>0)expect(f.legLift).toBe(1);
    if(f.recline>0){expect(f.inboard).toBe(1);expect(f.position).toEqual(seat.position);}
   }
   const seated=seatChangePose(change,1.92);
   expect(seated.position).toEqual(edge.position);expect(seated.weight).toBe(1);expect(seated.legLift).toBe(0);expect(seated.recline).toBe(0);
  }
 });
 it('pivots at the supported pelvis without changing bone lengths and restores standing after cancellation',()=>{
  for(const bodyHeight of [.8,1,1.25]){
   const body=new T.Group(),hair=new T.Group(),geometry=createBlankBody('skin',{bodyHeight}),material=new T.MeshBasicMaterial(),mesh=new T.Mesh(geometry,material);body.add(mesh,hair);
   const rig=bindBlankBody(mesh,hair,true),animate=createBlankMotion(rig,body),lengths=rig.skeleton.bones.map(b=>b.position.length());
   for(const rising of [false,true])for(let t=0;t<=duration;t+=.1){
    const f=bedChangeFrame(t,rising);animate(t,'sleep','lying',{kind:'bed-change',hands:[],bedWeight:f.weight,bedRecline:f.recline,bedLegLift:f.legLift});
    const hip=rig.bones.hips.getWorldPosition(new T.Vector3());
    if(f.recline===0){expect(hip.y).toBeCloseTo(T.MathUtils.lerp(bodyHeightY(.38*BLANK_SCALE,bodyHeight),.055*BLANK_SCALE,f.weight));expect(hip.z).toBeCloseTo(0);}
    else{expect(hip.y).toBeGreaterThan(.1);expect(hip.y).toBeLessThan(.65);expect(Math.abs(hip.z)).toBeLessThan(1.5);}
    expect(rig.skeleton.bones.map(b=>b.position.length())).toEqual(lengths);
    expect(rig.skeleton.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite))).toBe(true);
    // Once sitting on the mattress, knees and ankles stay above its plane
    // throughout reclining/rising, rather than retaining a chair's dangling shin.
    if(f.inboard>0)for(const name of ['L_shin','R_shin','L_foot','R_foot'])expect(rig.bones[name].getWorldPosition(new T.Vector3()).y).toBeGreaterThan(.10);
   }
   animate(2.6,'sleep','lying',{kind:'bed-rest',hands:[]});expect(rig.bones.head.getWorldPosition(new T.Vector3()).z).toBeLessThan(0);
   animate(0,'idle','standing');expect(body.position.length()).toBe(0);expect(body.quaternion.angleTo(new T.Quaternion())).toBeLessThan(1e-6);
   geometry.dispose();material.dispose();rig.skeleton.dispose();
  }
 });
});

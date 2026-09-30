// Reviewed body-2 poses. Keep them separate from the generated asset catalog;
// low height alone does not make a stool suitable for a floor-rest pose.
const body2SeatProfiles={bedroom_ref_flower_pouf:{pose:'floor',forward:.20}};
// Reviewed mattress surface, not the wider draped blanket/bed-frame bounds.
const body2BedProfiles={show_bed:{headEnd:-1.62,edgeX:1.30,edgeY:.85}};
// Seat coordinates are in the normalized furniture's local frame: +Y up, +Z front.
export function seatTransform(room,catalog,selection,body2=false){
 if(!selection||selection.roomId!==room.id)return null;
 const item=room.items.find(i=>i.id===selection.itemId&&!i.stored);
 const a=catalog.find(a=>a.id===item?.assetId);
 const seat=(selection.bed?a?.beds:a?.seats)?.find(s=>s.id===selection.seatId);
 if(!item||!seat)return null;
 const angle=item.rotation*Math.PI/180,[x,y,z]=seat.position,rotation=angle+(seat.rotation??0)*Math.PI/180;
 const profile=body2&&!selection.bed?body2SeatProfiles[a.id]:null,forward=profile?.forward??0;
 const bedProfile=body2&&selection.bed?body2BedProfiles[a.id]:null;
 return {position:[item.x+x*Math.cos(angle)+z*Math.sin(angle)+Math.sin(rotation)*forward,item.y+y,item.z-x*Math.sin(angle)+z*Math.cos(angle)+Math.cos(rotation)*forward],rotation,pose:profile?.pose??'chair',height:item.y+y-.18,...bedProfile?{bed:{...bedProfile,anchorZ:z,center:[item.x,item.y,item.z],halfWidth:a.size[0]/2,side:Math.sign(x)||1,itemRotation:angle}}:{}};
}
export function roomBeds(room,catalog){
 return room.items.filter(i=>!i.stored).flatMap(item=>{
  const a=catalog.find(a=>a.id===item.assetId);
  return (a?.beds??[]).map(b=>({roomId:room.id,itemId:item.id,seatId:b.id,bed:true,label:a.name+' · '+b.label}));
 });
}
export function roomSeats(room,catalog){
 return room.items.filter(i=>!i.stored).flatMap(item=>{
  const asset=catalog.find(a=>a.id===item.assetId);
  return (asset?.seats??[]).map(seat=>({roomId:room.id,itemId:item.id,seatId:seat.id,label:asset.name+(asset.seats.length>1?' · '+seat.label:'')}));
 });
}

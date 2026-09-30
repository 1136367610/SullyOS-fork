import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CreatorRollBridge} from '../../apps/room3d/chibi/CreatorRollBridge';
import {createVisitor,decodeParts,NEW_BODY_HOME_PERCENT,type ChibiVisitor} from '../../apps/room3d/chibi/visitor';
import {defaultFace} from '../../apps/room3d/chibi/faceAppearance';
import {selectedHairAssets,type Parts,type HairSettings} from '../../apps/room3d/chibi/types';
import {mountHomeEditor} from '../../apps/room3d/editor.js';
import {createHome} from '../../apps/room3d/model.js';
import {furnishShowroom,SHOWROOMS} from '../../apps/room3d/showrooms.js';
import {setBoundary} from '../../apps/room3d/topology.js';
import {bathroomHome} from './bathroom-layout.js';
import {testCharacter} from './room3d-test-character';
import {APPROVED_ROOM_WALK_ID} from '../../apps/room3d/chibi/approvedRoomWalk';
import '../../apps/room3d/editor.css';
import './room3d-body-comparison.css';
const rooms=[['living','客厅'],['bedroom','卧室'],['study','书房'],['kitchen','厨房'],['bathroom','浴室'],['motion','动作练习区']];
const ids=['classic','blank'] as const,labels=['原版 Chibi','二号素体'];
const defaultSizes:Record<string,number>={classic:100,blank:NEW_BODY_HOME_PERCENT};
function Comparison(){
 const [request,setRequest]=useState(0),[parts,setParts]=useState<Parts>(),[kind,setKind]=useState(()=>{const id=new URLSearchParams(location.search).get('room');return rooms.some(([k])=>k===id)?id!:'living';});
 const [active,setActive]=useState('classic'),[status,setStatus]=useState('正在准备固定角色…'),[busy,setBusy]=useState(true);
 const [sizes,setSizes]=useState(defaultSizes),sizesRef=useRef(sizes);sizesRef.current=sizes;
 const host=useRef<HTMLDivElement>(null),editor=useRef<any>(null),activeRef=useRef(active);activeRef.current=active;
 useEffect(()=>{
  if(!parts)return;
  let cancelled=false,owned=false,e:any=null;const visitors:ChibiVisitor[]=[];const abort=new AbortController();
  setBusy(true);setStatus('正在准备两种体型和房间…');
  const release=()=>{e?.dispose();if(!owned)visitors.forEach(v=>v.dispose());};
  void(async()=>{
   try{
    const catalog=await fetch('/room3d/catalog.json',{signal:abort.signal}).then(r=>r.json());
    const home=kind==='bathroom'?bathroomHome(catalog):createHome(catalog),room=home.rooms[0];
    if(kind!=='bathroom'){room.items=[];if(kind!=='motion')furnishShowroom(room,kind,catalog);setBoundary(home,room.id,'front',{kind:'wall_high',door:{kind:(SHOWROOMS[kind]??SHOWROOMS.living).door,at:0,width:2.2}},catalog);}
    if(kind==='motion'){room.name='动作练习区';room.wall='#f4f4ec';room.trim='#586653';room.floor='#d7d6cb';}
    const hair:HairSettings={layers:{},extras:[],assets:selectedHairAssets(testCharacter.state),headSize:1.04,bodyHeight:1,face:{...defaultFace,irisColor:'#5e8068'}};
    // Sequential creation makes ownership and cancellation explicit.
    for(const bodyShape of ids){const v=await createVisitor(parts,{...hair,bodyShape});v.setScaleMultiplier(sizesRef.current[bodyShape]/defaultSizes[bodyShape]);visitors.push(v);if(cancelled){release();return;}}
    e=await mountHomeEditor(host.current!,{assetBase:new URL('/room3d/',location.href).href,initialState:home,signal:abort.signal});
    if(cancelled){release();return;}
    e.setComparisonVisitors(visitors.map((visitor,i)=>({id:ids[i],label:labels[i],visitor})),activeRef.current);owned=true;editor.current=e;
    const w=window as any;w.__homeEditor=e;w.__comparisonVisitors=visitors;
    w.render_game_to_text=()=>JSON.stringify({character:testCharacter.name,room:kind,walkCandidate:APPROVED_ROOM_WALK_ID,walkSpeed:visitors[1].walkSpeed,...e.inspect()});w.advanceTime=(ms:number)=>e.advanceTime(ms);
    setBusy(false);setStatus('切换体型，点同一件家具对照动作。');
   }catch(error){release();if(!cancelled){setStatus(`加载失败：${error}`);setBusy(false);console.error(error);}}
  })();
  return()=>{cancelled=true;abort.abort();release();editor.current=null;delete (window as any).__homeEditor;};
 },[parts,kind]);
 const chooseActor=(id:string)=>{if(editor.current?.setActiveComparisonVisitor(id))setActive(id);};
 const resizeActor=(percent:number)=>{if(editor.current?.setComparisonVisitorScale(active,percent/defaultSizes[active]))setSizes(previous=>({...previous,[active]:percent}));};
 const changeRoom=(id:string)=>{setKind(id);const url=new URL(location.href);url.searchParams.set('room',id);history.replaceState(null,'',url);};
 const previewWalk=(enabled=true)=>{chooseActor('blank');editor.current?.previewComparisonWalk(enabled);};
 return <><header className="comparison-bar"><div><h1>小栗 · 样板房动作对照</h1><p>固定栗棕发、绿眼睛 · 两种体型同场 · 先从客厅逐间看</p></div><nav aria-label="样板房">{rooms.map(([id,label],i)=><button key={id} disabled={busy} aria-pressed={kind===id} onClick={()=>changeRoom(id)}>{i+1} {label}</button>)}</nav><div className="comparison-actors"><span>当前测试</span>{ids.map((id,i)=><button key={id} disabled={busy} aria-pressed={active===id} onClick={()=>chooseActor(id)}>{labels[i]}</button>)}<div className="comparison-size"><label htmlFor="actor-size">角色大小 <output>{sizes[active]}%</output></label><input id="actor-size" type="range" min={active==='blank'?90:60} max={active==='blank'?260:180} step={1} value={sizes[active]} disabled={busy} onChange={event=>resizeActor(Number(event.target.value))}/><button disabled={busy||sizes[active]===defaultSizes[active]} onClick={()=>resizeActor(defaultSizes[active])}>恢复原大小</button></div><span className="comparison-status" role="status">{status}</span></div><section className="comparison-walk" aria-label="日常走路"><strong>日常走路 · Meshy 10</strong><div className="comparison-walk-buttons"><button disabled={busy} onClick={()=>previewWalk()}>原地试看</button><button disabled={busy} onClick={()=>{chooseActor("blank");editor.current?.walkComparisonRoute();}}>走一小段</button><button disabled={busy} onClick={()=>previewWalk(false)}>停止试看</button></div><p>点房间空地可实际走动。来源：<a href="https://www.meshy.ai/animation-library" target="_blank" rel="noreferrer">Meshy · Walking</a> · 用户导出第 10 段</p></section></header><div className="comparison-room" ref={host}/><CreatorRollBridge savedState={testCharacter.state} request={request} onReady={()=>setRequest(1)} onResult={result=>{void decodeParts(result).then(setParts).catch(error=>setStatus(String(error)));}} onError={setStatus}/></>;
}
createRoot(document.getElementById('root')!).render(<Comparison/>);

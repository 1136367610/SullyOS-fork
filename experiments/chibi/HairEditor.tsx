import {FaceAccessoryControls} from './FaceAccessoryControls';
import {Play,Pause,TShirt,ArrowCounterClockwise,PersonSimple} from '@phosphor-icons/react';
import React,{useState,useEffect,useMemo,useRef} from 'react';
import {Puppet} from './Puppet';
import {BodyControls} from './BodyControls';
import {FaceTuning} from './FaceTuning';
import {cleanFace} from '../../apps/room3d/chibi/faceAppearance';
import type {MouthUse} from '../../apps/room3d/chibi/faceAdjustments';
import {FaceControls} from './FaceControls';
import {WardrobePicker} from './WardrobePicker';
import {cleanWardrobeStyle,wardrobeMotionChoices,type WardrobeStyle} from './wardrobePose';
import type {LayeringReport} from '../../apps/room3d/chibi/garmentLayering';
import {defaultHairLayer,hairMode,type HairSettings,type HairLayer,type Parts} from '../../apps/room3d/chibi/types';
import './hair-editor.css';
import {CustomPartChoices} from './CustomPartChoices';
import type {CustomCreatorPart} from '../../types';
export function HairEditor({parts,hair,previewHair,assets,onChange,onUndo,onRedo,onReset,canUndo,canRedo,onBegin,onEnd,onEditAppearance,appearanceImage,bodyNotice,onSullyHair,onSullyEyes,customParts=[],selectedParts={},onCustomPart}:{customParts?:CustomCreatorPart[];selectedParts?:Record<string,string|string[]|null>;onCustomPart?:(part:CustomCreatorPart)=>void;bodyNotice?:string;onSullyHair?:()=>void;onSullyEyes?:()=>void;onEditAppearance?:()=>void;appearanceImage?:string;parts:Parts;hair:HairSettings;previewHair:HairSettings;assets:Record<string,string>;onChange:(v:HairSettings)=>void;onUndo:()=>void;onRedo:()=>void;onReset:()=>void;canUndo:boolean;canRedo:boolean;onBegin:()=>void;onEnd:()=>void}){
 const [category,setCategory]=useState<'base'|'face'|'clothes'|'body'>('base');
 const [faceSection,setFaceSection]=useState<'hair'|'eyes'|'brows'|'mouth'|'accessories'>('eyes');
 const [mouthUse,setMouthUse]=useState<MouthUse>('closed');
 const f=cleanFace(hair.face);
 const displayHair=useMemo(()=>{const face=cleanFace(previewHair.face);return previewHair.face?.enabled?{...previewHair,face:{...face,mouth:face.mouths![category==='face'&&faceSection==='mouth'?mouthUse:'closed']}}:previewHair;},[previewHair,category,faceSection,mouthUse]);
 const [layeringReport,setLayeringReport]=useState<LayeringReport>();
 const [motionReplay,setMotionReplay]=useState(0);
 const [selected,setSelected]=useState('fronthair'),[yaw,setYaw]=useState(8),[error,setError]=useState(''),[playing,setPlaying]=useState(true),[bare,setBare]=useState(false);
 const focus=category==='face'?'head':'body';
 const [view,setView]=useState({x:0,y:0,zoom:1});
 const preview=useRef<HTMLDivElement>(null),pointers=useRef(new Map<number,{x:number;y:number}>());
 const zoomBy=(factor:number)=>setView(v=>({...v,zoom:Math.max(.5,Math.min(3.5,v.zoom*factor))}));
 const endPointer=(e:React.PointerEvent<HTMLDivElement>)=>{pointers.current.delete(e.pointerId);};
 const rotationEvents={
  onPointerDown:(e:React.PointerEvent<HTMLDivElement>)=>{
   if(e.button!==0||!(e.target instanceof HTMLCanvasElement))return;
   pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});e.currentTarget.setPointerCapture(e.pointerId);
  },
  onPointerMove:(e:React.PointerEvent<HTMLDivElement>)=>{
   const points=pointers.current,old=points.get(e.pointerId);if(!old)return;
   const before=[...points.values()];points.set(e.pointerId,{x:e.clientX,y:e.clientY});const after=[...points.values()];
   if(points.size===1)setYaw(v=>((v+(e.clientX-old.x)*.6+180)%360+360)%360-180);
   else if(points.size===2){
    const distance=(p:{x:number;y:number}[])=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
    const d=distance(before),ratio=d>5?distance(after)/d:1;
    setView(v=>({x:v.x+(e.clientX-old.x)/2,y:v.y+(e.clientY-old.y)/2,zoom:Math.max(.5,Math.min(3.5,v.zoom*ratio))}));
   }
  },
  onPointerUp:endPointer,onPointerCancel:endPointer,onLostPointerCapture:endPointer,
 };
 useEffect(()=>{const el=preview.current!;const wheel=(e:WheelEvent)=>{if(!(e.target instanceof HTMLCanvasElement))return;e.preventDefault();if(e.shiftKey)setView(v=>({...v,x:v.x-e.deltaX,y:v.y-e.deltaY}));else zoomBy(Math.exp(-e.deltaY*(e.deltaMode===1?.04:.0015)));};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[]);
 const chooseMotion=(id:WardrobeStyle)=>{onChange({...hair,wardrobeStyle:id});setPlaying(true);};
 const stepMotion=(step:number)=>{const i=wardrobeMotionChoices.findIndex(m=>m.id===cleanWardrobeStyle(hair.wardrobeStyle));chooseMotion(wardrobeMotionChoices[(i+step+wardrobeMotionChoices.length)%wardrobeMotionChoices.length].id);};
 useEffect(()=>{if(!['fronthair','earhair','back1','back2','outfit','outer'].includes(selected)&&!hair.extras.some(e=>e.id===selected))setSelected('back2');},[hair.extras,selected]);
 const extra=hair.extras.find(e=>e.id===selected),layer=extra??hair.layers[selected]??defaultHairLayer;
 const update=(patch:Partial<HairLayer>)=>onChange(extra?{...hair,extras:hair.extras.map(e=>e.id===selected?{...e,...patch}:e)}:{...hair,layers:{...hair.layers,[selected]:{...layer,...patch}}});
 const add=(source:string,src?:string)=>{const id=crypto.randomUUID();onChange({...hair,extras:[...hair.extras,{...defaultHairLayer,id,source:src?id:source,src,distance:.12+hair.extras.length*.06}]});setSelected(id);};
 const upload=async(file?:File)=>{if(!file)return;try{setError('');if(file.size>5*1024*1024)throw Error('请选择小于 5 MB 的透明图片');const src=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);});const image=new Image();image.src=src;await image.decode();add('',src);}catch(e){setError(String(e));}};
 const sliderEvents={onPointerDown:onBegin,onPointerUp:onEnd,onPointerCancel:onEnd,onBlur:onEnd,onKeyDown:(e:React.KeyboardEvent)=>{if(!e.repeat&&e.key.startsWith('Arrow'))onBegin();},onKeyUp:onEnd};
 return <div className="hair-editor">
  <div ref={preview} className="hair-preview" aria-label="角色预览" data-yaw={yaw} data-zoom={view.zoom} data-pan={`${view.x},${view.y}`} {...rotationEvents}>
   <Puppet view={view} parts={parts} hair={displayHair} yaw={yaw} motion="idle" wire={false} playing={playing} appearance={bare?'skin':'outfit'} focus={focus} wardrobeStyle={cleanWardrobeStyle(hair.wardrobeStyle)} wardrobeReplay={motionReplay} onLayeringReport={setLayeringReport} onPerformancePause={()=>setPlaying(false)}/>
   <div className="preview-tools"><button aria-label={bare?'穿回衣服':'查看素体'} title={bare?'穿回衣服':'查看素体'} aria-pressed={bare} onClick={()=>setBare(!bare)}><TShirt size={19}/></button><button aria-label={playing?'暂停动作':'播放动作'} title={playing?'暂停动作':'播放动作'} aria-pressed={!playing} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={19}/>:<Play size={19}/>}</button><button aria-label="回到正面" title="回到正面" onClick={()=>{setYaw(0);setView({x:0,y:0,zoom:1});}}><ArrowCounterClockwise size={19}/></button></div>

   <div className="preview-caption"><span>{focus==='head'?'头部特写':'全身预览'}</span><details className="motion-audition"><summary aria-label="试衣动作" title="试衣动作"><PersonSimple size={20}/></summary><select aria-label="试衣站姿" value={cleanWardrobeStyle(hair.wardrobeStyle)} onChange={e=>chooseMotion(e.target.value as WardrobeStyle)}>{[...new Set(wardrobeMotionChoices.map(m=>m.group))].map(group=><optgroup key={group} label={group}>{wardrobeMotionChoices.filter(m=>m.group===group).map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</optgroup>)}</select><div className="motion-audition-buttons"><button aria-label="上一个动作" onClick={()=>stepMotion(-1)}>上一段</button><button onClick={()=>{setMotionReplay(n=>n+1);setPlaying(true);}}>重播</button><button aria-label="下一个动作" onClick={()=>stepMotion(1)}>下一段</button></div></details></div>
   <div className="hair-angle">单指拖动旋转 · 双指移动／缩放 · 滚轮缩放</div>
  </div>
  <section className="creator-inspector" aria-label="角色调整">
   <nav className="creator-categories" aria-label="调整分类">{([['base','形象'],['face','脸部'],['clothes','衣橱'],['body','体型']] as const).map(([key,label])=><button key={key} aria-pressed={category===key} onClick={()=>setCategory(key)}>{label}</button>)}</nav>
   <div className="hair-options" key={category}>
   {category==='base'&&<section className="identity-setup" aria-label="确认形象">
    <h2>选择体型</h2>
    <div className="body-type-choices">{([['classic','Chibi','圆润 Q 版'],['blank','3D','自由换装']] as const).map(([id,title,description])=><button key={id} aria-pressed={(hair.bodyShape??'classic')===id} onClick={()=>onChange({...hair,bodyShape:id})}><strong>{title}</strong><span>{description}</span></button>)}</div>
    <p className="body-shared-note">所有角色都会使用这款体型，包括你和来访角色。{bodyNotice&&<><br/>{bodyNotice}</>}</p>
    <div className="identity-actions">{onEditAppearance&&<button onClick={onEditAppearance}>换发型 / 基础形象</button>}</div>
    <button className="creator-primary" onClick={()=>{onChange({...hair,face:{...f,enabled:true,mouth:f.mouths!.closed}});setCategory('face');}}>下一步 · 捏脸 →</button>
   </section>}
   {category==='face'&&<><nav className="face-mainnav" aria-label="脸部分组">{([['hair','头发'],['eyes','眼睛'],['brows','眉毛'],['mouth','嘴巴'],['accessories','面饰']] as const).map(([key,label])=><button key={key} aria-pressed={faceSection===key} onClick={()=>setFaceSection(key)}>{label}</button>)}</nav>{faceSection==='accessories'&&<FaceAccessoryControls hair={hair} items={customParts} selected={selectedParts} onSelect={onCustomPart} onChange={onChange} onBegin={onBegin} onEnd={onEnd}/>}{faceSection!=='hair'&&faceSection!=='accessories'&&<FaceControls customParts={customParts} selectedParts={selectedParts} onCustomPart={onCustomPart} section={faceSection} hair={hair} onChange={onChange} onBegin={onBegin} onEnd={onEnd} mouthUse={mouthUse} onMouthUse={setMouthUse}/>}</>}

   {category==='clothes'&&hair.bodyShape==='blank'&&<WardrobePicker parts={parts} hair={hair} layeringReport={bare?undefined:layeringReport} previewBare={bare||hair.bodyShape!=='blank'} onBegin={onBegin} onEnd={onEnd} onChange={next=>{setBare(false);onChange(next);}}/>}
   {category==='face'&&faceSection==='hair'&&<>
    <nav className="garment-slots" aria-label="头发分层">{[['fronthair','前发'],['earhair','耳发'],['back1','后发 1'],['back2','后发 2'],...hair.extras.map((e,i)=>[e.id,`发片 ${i+1}`])].map(([id,label])=><button key={id} aria-pressed={selected===id} onClick={()=>setSelected(id)}>{label}</button>)}</nav>
    {onCustomPart&&<CustomPartChoices items={customParts} selected={selectedParts} onSelect={onCustomPart} categories={[selected]} leading={selected==='fronthair'&&onSullyHair?<button aria-label="Sully 发型" aria-pressed={selectedParts.fronthair==='fronthair_99'&&selectedParts.back1==='back1_99'} onClick={onSullyHair}><span className="sully-hair-preview"><img src={`${import.meta.env.BASE_URL}like520/sully/back1.png`} alt=""/><img src={`${import.meta.env.BASE_URL}like520/sully/fronthair.png`} alt=""/></span><span>Sully</span></button>:undefined}/>}
    <details className="creator-refinement"><summary>发色与微调</summary>
    {onEditAppearance&&<button className="creator-next" onClick={onEditAppearance}>基础形象与发色 ↗</button>}
    <label className="creator-select">发型走向<select aria-label="素材分类" value={extra?.mode??hairMode({...hair,assets},selected)} onChange={e=>{const mode=e.target.value as 'wrap'|'project';if(extra||!assets[selected])update({mode});else onChange({...hair,assetModes:{...hair.assetModes,[assets[selected]]:mode}});}}><option value="wrap">贴头包裹</option><option value="project">向外伸出</option></select></label>
    {([['length','长度',.25,2],['width','宽度',.4,2],['offsetY','上下位置',-.8,.8],['offsetX','左右位置',-1.5,1.5],['offsetZ','前后位置',-1.5,1.5],['puff','发片厚度',0,.5]] as const).map(([key,label,min,max])=><label className="creator-slider" key={key}><span>{label}</span><input aria-label={`${label}调节`} type="range" min={min} max={max} step={.01} {...sliderEvents} value={layer[key]??defaultHairLayer[key]} onChange={e=>update({[key]:+e.target.value})}/><output>{(layer[key]??defaultHairLayer[key]??0).toFixed(2)}</output></label>)}
    <div className="hair-buttons"><button onClick={()=>update(defaultHairLayer)}>重置这一层</button>{extra&&<button onClick={()=>{onChange({...hair,extras:hair.extras.filter(e=>e.id!==selected)});setSelected('back1');}}>删除发片</button>}</div>
    <details><summary>添加发片</summary><div className="hair-buttons"><button disabled={hair.extras.length>=6} onClick={()=>add('back1')}>使用后发 1</button><button disabled={hair.extras.length>=6} onClick={()=>add('back2')}>使用后发 2</button><label className="hair-upload">上传透明图片<input disabled={hair.extras.length>=6} type="file" accept="image/png,image/webp" onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label></div></details>
    </details>
   </>}
   {category==='face'&&faceSection==='eyes'&&<details className="creator-refinement"><summary>眼部整体微调</summary><FaceTuning part="eyes" label="眼部整体" hair={hair} onChange={onChange} onBegin={onBegin} onEnd={onEnd}/></details>}
   {category==='face'&&<button className="creator-next" onClick={()=>setCategory('clothes')}>衣橱 →</button>}
   {category==='body'&&<><h2>调整整体比例</h2>{hair.bodyShape==='blank'?<BodyControls hair={hair} onChange={onChange} onBegin={onBegin} onEnd={onEnd}/>:<p>Chibi 保留圆润比例；3D 支持调整头大小和身高。</p>}<p>当前使用{hair.bodyShape==='blank'?'3D':'Chibi'}。切换类型请回到「形象」。</p></>}
   {category==='clothes'&&hair.bodyShape!=='blank'&&<><h2>Chibi 的服装</h2><p>在基础形象中选服装；3D 体型可以使用这里的衣橱。</p>{onEditAppearance&&<button onClick={onEditAppearance}>选择基础服装</button>}</>}
   {category==='clothes'&&<><button className="creator-next" onClick={()=>setCategory('body')}>体型 →</button></>}
   {error&&<p role="alert">{error}</p>}
   </div>
   <div className="creator-history"><button disabled={!canUndo} onClick={onUndo} aria-label="撤销">↶ 撤销</button><button disabled={!canRedo} onClick={onRedo} aria-label="重做">↷ 重做</button><button className="reset-all" onClick={onReset}>恢复默认</button></div>
  </section>
 </div>;
}

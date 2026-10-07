import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import HomeFigureEditor from '../../components/character/HomeFigureEditor';
import HomeFigureStudio from '../../components/character/HomeFigureStudio';
import {OSPreviewProvider} from '../../context/OSContext';
import type {HomeFigureSlot} from '../../types';
import {testCharacter} from './room3d-test-character';
import {DB} from '../../utils/db';
// Opt-in wardrobe QA is isolated from the user's actual profile/library.
if(new URLSearchParams(location.search).has('closet')){
 let outfits:any[]=[];
 DB.getUserProfile=async()=>({name:'衣柜验收',avatar:'',bio:'',wardrobeOutfits:outfits});
 DB.updateWardrobeOutfits=async update=>(outfits=update(outfits));
}

function App() {
    const [figure, setFigure] = useState<HomeFigureSlot | undefined>(()=>new URLSearchParams(location.search).has('stress')?{state:testCharacter.state,img:'',updatedAt:0,hair:{layers:{},extras:[],bodyShape:'blank',wardrobe:{top:'sailor-long',outer:'slouch-cardigan',bottom:'sailor-skirt',socks:'school-socks',shoes:'school-loafers'},wardrobeLayering:true}}:undefined);
    const [open, setOpen] = useState(true);
    return open ? <HomeFigureEditor name={new URLSearchParams(location.search).has('sully') ? 'Sully' : '验收角色'} ownerId="qa-home-figure" seedState={new URLSearchParams(location.search).has('fresh') ? undefined : testCharacter.state} value={figure} onClose={() => setOpen(false)} onSave={value => {setFigure(value); setOpen(false);}} /> : <main><p>形象{figure ? '已保存到本页测试状态' : '未保存'}</p><button onClick={() => setOpen(true)}>重新编辑</button></main>;
}
// Real source chooser and lazy editor, with saves confined to this fixture.
function SourceApp() {
    const [character,setCharacter]=useState<any>({id:'qa-source',name:'Sully',chibiStudio:{room:{state:testCharacter.state},vr:{state:testCharacter.state},home3D:{state:testCharacter.state,img:'',updatedAt:0}}});
    const [open,setOpen]=useState(true);
    const value:any={theme:{homelyPalette:'apricot'},characters:[character],userProfile:{name:'验收用户'},updateCharacter:(_id:string,update:any)=>setCharacter((previous:any)=>({...previous,...update(previous)})),updateUserProfile:()=>{}};
    return <OSPreviewProvider value={value}>{open?<HomeFigureStudio charId={character.id} startEditing onClose={()=>setOpen(false)} />:<button onClick={()=>setOpen(true)}>重新打开来源页</button>}</OSPreviewProvider>;
}
const root=createRoot(document.getElementById('root')!);root.render(new URLSearchParams(location.search).has('source')?<SourceApp />:<App />);
import.meta.hot?.dispose(()=>root.unmount());

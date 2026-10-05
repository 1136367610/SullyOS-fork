import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import HomeFigureEditor from '../../components/character/HomeFigureEditor';
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
    return open ? <HomeFigureEditor name={new URLSearchParams(location.search).has('sully') ? 'Sully' : '验收角色'} ownerId="qa-home-figure" seedState={testCharacter.state} value={figure} onClose={() => setOpen(false)} onSave={value => {setFigure(value); setOpen(false);}} /> : <main><p>形象{figure ? '已保存到本页测试状态' : '未保存'}</p><button onClick={() => setOpen(true)}>重新编辑</button></main>;
}
const root=createRoot(document.getElementById('root')!);root.render(<App />);
import.meta.hot?.dispose(()=>root.unmount());


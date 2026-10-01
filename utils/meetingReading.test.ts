// @vitest-environment jsdom
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ theme: { storyAppearance: { preset: 'novel' } } as any }));
vi.mock('../context/OSContext', () => ({useOS:()=>({theme:state.theme,apiConfig:{},registerBackHandler:()=>()=>{},addToast:vi.fn(),updateCharacter:vi.fn()})}));
vi.mock('../components/date/DateSettings', () => ({default:()=>null}));
import DateSession from '../components/date/DateSession';
import {StoryOutput} from '../components/date/story/StoryTheaterSession';

it('novel view renders both speakers as prose without avatars and preserves text', () => {
    const messages = [
        {id:1,role:'user',content:'今天读到哪里了？'},
        {id:2,role:'assistant',content:'[happy] "刚好到这里。"\n[normal] 合上书。'},
    ].map(message=>({...message,charId:'c',type:'text',timestamp:1,metadata:{source:'date',dateEncounterId:'e'}}));
    const markup = renderToStaticMarkup(React.createElement(DateSession, {
        char:{id:'c',name:'角色',avatar:'/private-avatar.png',dateAppearance:{preset:'novel'},dateReadingShowAvatars:true},
        userProfile:{name:'用户'},messages,encounterId:'e',peekStatus:'',
        onSendMessage:async()=>'',onReroll:async()=>'',onExit:()=>{},onEditMessage:()=>{},onDeleteMessage:()=>{},onDeleteMessages:async()=>{},onSettings:()=>{},
    } as any));
    const host=document.createElement('div');host.innerHTML=markup;
    expect(host.querySelector('[data-reading-preset="novel"]')).toBeTruthy();
    expect(host.querySelectorAll('.meeting-prose')).toHaveLength(3);
    expect(host.querySelector('.meeting-reading-page')?.textContent).toContain('今天读到哪里了？');
    expect(host.querySelector('.meeting-reading-page')?.textContent).toContain('合上书。');
    expect(host.querySelector('img[src="/private-avatar.png"]')).toBeNull();
});

it('story novel mode keeps prose outside a collapsed supplement; none keeps the original layout', () => {
    const content='<scene_header>地点｜书店</scene_header><story_text>灯光落在书页上。</story_text>';
    const render=()=>renderToStaticMarkup(React.createElement(StoryOutput,{content,affinityInputs:[]}));
    const host=document.createElement('div');host.innerHTML=render();
    expect(host.querySelector('.meeting-prose')?.textContent).toContain('灯光落在书页上。');
    expect(host.querySelector('details')?.hasAttribute('open')).toBe(false);
    expect(host.querySelector('details')?.textContent).toContain('书店');
    state.theme={storyAppearance:{preset:'none'}};
    host.innerHTML=render();
    expect(host.querySelector('.meeting-prose')).toBeNull();
    expect(host.textContent).toContain('书店');
    expect(host.textContent).not.toContain('场景与补充');
});

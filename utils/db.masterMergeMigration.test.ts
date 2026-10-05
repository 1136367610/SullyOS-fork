import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';

afterEach(()=>vi.unstubAllGlobals());

it.each([72,73])('upgrades v%s without losing records and installs both branches of message indexes',async version=>{
 vi.resetModules();
 const factory=new IDBFactory();vi.stubGlobal('indexedDB',factory);
 await new Promise<void>((resolve,reject)=>{
  const req=factory.open('AetherOS_Data',version);
  req.onupgradeneeded=()=>{
   const messages=req.result.createObjectStore('messages',{keyPath:'id',autoIncrement:true});
   messages.createIndex('charId','charId');
   messages.createIndex('timestamp','timestamp');
   if(version===72)messages.createIndex('charId_deliveryId',['charId','metadata.deliveryId']);
   else {
    messages.createIndex('charId_source',['charId','metadata.source']);
    messages.createIndex('charId_homeTurn',['charId','metadata.homeTurnId']);
   }
   messages.put({id:1,charId:'c',role:'user',type:'text',content:'保留原来的聊天',timestamp:10});
   messages.put({id:2,charId:'c',role:'user',type:'text',content:'保留原来的家园',timestamp:5,metadata:{source:'home',homeTurnId:'turn'}});
  };
  req.onsuccess=()=>{req.result.close();resolve();};req.onerror=()=>reject(req.error);
 });
 const {openDB,DB}=await import('./db');const db=await openDB();
 try {
  expect(db.version).toBe(74);
  const names=Array.from(db.transaction('messages').objectStore('messages').indexNames);
  expect(names).toEqual(expect.arrayContaining(['charId_source','charId_homeTurn','charId_deliveryId']));
  expect((await DB.getMessagesByCharId('c',true)).map(m=>m.content)).toEqual(['保留原来的聊天','保留原来的家园']);
  const message={charId:'c',role:'assistant',type:'text',content:'只收一次',timestamp:20} as const;
  const first=await DB.saveMessageOnce('delivery',message);
  expect(await DB.saveMessageOnce('delivery',message)).toBe(first);
  expect(await DB.getMessagesByCharId('c',true)).toHaveLength(3);
 } finally {db.close();}
});

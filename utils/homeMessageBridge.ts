import type {CharacterProfile, Message} from '../types';
import {assignHomeTurns,homeTurnMessages} from './homeTurns';
import {homeRecords} from './homeRecords';

/** Persist the room journal and its shared-history projection atomically, as DateApp does for messages.
 * String input migrates only the stored character, never a stale React snapshot.
 */
export function persistCharacterWithHomeMessages(db:IDBDatabase,input:CharacterProfile|string,onInsert:(tx:IDBTransaction,charId:string,id:number)=>void):Promise<void>{
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['characters','messages','assets'],'readwrite');
  const characters=tx.objectStore('characters'),messages=tx.objectStore('messages');
  const id=typeof input==='string'?input:input.id;
  let firstInserted=Infinity;
  const request=characters.get(id);
  request.onsuccess=()=>{
   const previous=request.result as CharacterProfile|undefined;
   if(typeof input==='string'&&(!previous||previous.homeContextBridgeVersion===2))return;
   const character=typeof input==='string'?previous!:input;
   const records=assignHomeTurns(homeRecords(character.home3D));
   const unchanged=previous?.homeContextBridgeVersion===2&&JSON.stringify(homeRecords(previous.home3D))===JSON.stringify(records);
   characters.put({...character,...(character.home3D?{home3D:{...character.home3D,records}}:{}),homeContextBridgeVersion:2});
   if(unchanged||(!records.length&&!homeRecords(previous?.home3D).length))return;
   const turns=homeTurnMessages(id,records);
   const pending=new Map(turns.map(turn=>[turn.metadata.homeTurnId as string,turn]));
   const insert=(turn:typeof turns[number])=>{const add=messages.add(turn);add.onsuccess=()=>{const key=add.result as number;firstInserted=Math.min(firstInserted,key);onInsert(tx,id,key);};};
   if(previous?.homeContextBridgeVersion===2){
    // Normal writes touch only changed turns. No history scan on each local action.
    const before=new Map(homeTurnMessages(id,assignHomeTurns(homeRecords(previous.home3D))).map(turn=>[turn.metadata.homeTurnId as string,turn]));
    for(const key of new Set([...before.keys(),...pending.keys()])){
     const next=pending.get(key);if(JSON.stringify(before.get(key))===JSON.stringify(next))continue;
     const lookup=messages.index('charId_homeTurn').openCursor(IDBKeyRange.only([id,key]));let found=false;
     lookup.onsuccess=()=>{const cursor=lookup.result;
      if(cursor){const row=cursor.value as Message;if(row.metadata?.source==='home'){if(next){cursor.update({...row,...next,metadata:{...row.metadata,...next.metadata}});found=true;}else cursor.delete();}cursor.continue();}
      else if(next&&!found)insert(next);
     };
    }
    return;
   }
   // One-time legacy migration only; source index excludes private chat and date history.
   const cursorRequest=messages.index('charId_source').openCursor(IDBKeyRange.only([id,'home']));
   cursorRequest.onsuccess=()=>{
    const cursor=cursorRequest.result;
    if(cursor){
     const row=cursor.value as Message,key=row.metadata.homeTurnId||row.metadata.homeRecordId;
     const projected=pending.get(key);
     if(projected)cursor.update({...row,...projected,metadata:{...row.metadata,...projected.metadata}});
     else cursor.delete();
     pending.delete(key);cursor.continue();return;
    }
    for(const turn of [...pending.values()].sort((a,b)=>a.timestamp-b.timestamp))insert(turn);
   };
  };
  tx.oncomplete=()=>{
   if(Number.isFinite(firstInserted))try{
    const key=`mp_lastMsgId_${id}`;
    if(Number(localStorage.getItem(key))>=firstInserted)localStorage.removeItem(key);
   }catch{/* The transaction is committed even when localStorage is unavailable. */}
   resolve();
  };
  tx.onerror=()=>reject(tx.error);
  tx.onabort=()=>reject(tx.error||new Error('家园记录未能保存'));
 });
}

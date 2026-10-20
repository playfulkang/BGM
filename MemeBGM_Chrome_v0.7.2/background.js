importScripts('platforms.js');
const API='https://memebgm.fun';
const MAX_AUDIO_BYTES=2*1024*1024;
let creating=null,sequence=0,active=null,controller=null;
class LoginRequired extends Error {}
const validCA=ca=>typeof ca==='string'&&/^0x[a-f0-9]{40}$/.test(ca);
const isSupported=sender=>MemeBGMPlatforms.supported(sender.url||sender.tab?.url);
async function ensureOffscreen(){
 if(await chrome.offscreen.hasDocument())return;
 if(!creating)creating=chrome.offscreen.createDocument({url:'offscreen.html',reasons:['AUDIO_PLAYBACK'],justification:'播放代币专属音乐'}).finally(()=>{creating=null});
 await creating;
}
async function notify(tabId,ca,message,options={}){try{await chrome.tabs.sendMessage(tabId,{type:'bgm-status',ca,message,...options})}catch{}}
function current(id){return active?.id===id&&sequence===id}
async function stopPlayer(id,tabId){if(sequence!==id)return;if(await chrome.offscreen.hasDocument()&&sequence===id)await chrome.runtime.sendMessage({target:'offscreen',type:'stop',requestId:id,tabId})}
async function fetchPrivate(path,signal){
 const response=await fetch(API+path,{cache:'no-store',credentials:'include',redirect:'manual',signal});
 if(response.type==='opaqueredirect'||[0,301,302,303,307,308,401,403].includes(response.status))throw new LoginRequired();
 if(!response.ok)throw Error('unavailable');return response;
}
async function audioBytes(response,signal){
 if(!/^audio\/(mpeg|mp3)(?:;|$)/i.test(response.headers.get('content-type')||''))throw new LoginRequired();
 if(Number(response.headers.get('content-length')||0)>MAX_AUDIO_BYTES)throw Error('size');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){if(signal.aborted)throw Error('cancelled');const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>MAX_AUDIO_BYTES)throw Error('size');chunks.push(r.value)}}catch(e){await reader.cancel().catch(()=>{});throw e}finally{reader.releaseLock()}
 const out=new Uint8Array(size);let at=0;for(const chunk of chunks){out.set(chunk,at);at+=chunk.byteLength}if(!size)throw Error('empty');return Array.from(out);
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(sender.id!==chrome.runtime.id)return;
 if(m?.target==='background'){
  if(sender.url!==chrome.runtime.getURL('offscreen.html')||!validCA(m.ca)||!Number.isInteger(m.tabId))return;if(active&&(m.requestId!==active.id||m.tabId!==active.tabId||m.ca!==active.ca))return;
  if(m.type==='status')notify(m.tabId,m.ca,m.message);
  if(m.type==='blocked')notify(m.tabId,m.ca,'点击重试播放',{blocked:true});
  return;
 }
 if(m?.target!=='service'||!isSupported(sender)||sender.tab?.id==null)return;
 const tabId=sender.tab.id;
 if(m.type==='open-site'){chrome.tabs.create({url:API+'/'}).then(()=>reply({ok:true})).catch(()=>reply({ok:false}));return true}
 if(m.type==='stop'){
  if(active&&active.tabId!==tabId){reply({ok:true});return}
  const id=++sequence;controller?.abort();controller=null;active=null;
  stopPlayer(id,tabId).then(()=>reply({ok:true})).catch(()=>reply({ok:false}));return true;
 }
 // sender.url can retain the original document URL after SPA navigation.
 // The isolated content script supplies its current URL; keep the origin bound to the sender.
 if(m.type!=='play'||!validCA(m.ca)||MemeBGMPlatforms.parse(m.pageUrl)?.ca!==m.ca||new URL(m.pageUrl).origin!==new URL(sender.url||sender.tab?.url).origin){reply({ok:false});return}
 const ca=m.ca,id=++sequence;controller?.abort();const control=new AbortController();controller=control;active={id,tabId,ca};
 (async()=>{
  await stopPlayer(id);if(!current(id))return {ok:true};
  const r=await fetchPrivate('/api/bgm?ca='+encodeURIComponent(ca),control.signal);
  if(!/\bapplication\/json\b/i.test(r.headers.get('content-type')||''))throw new LoginRequired();
  const data=await r.json();if(!current(id))return {ok:true};
  if(!data.exists||!data.bgm_url){await notify(tabId,ca,'暂无专属音乐');return {ok:true}}
  const u=new URL(data.bgm_url,API+'/');
  if(u.origin!==API||u.username||u.password||u.pathname!=='/api/audio/'+ca)throw Error('invalid audio URL');
  const audio=await fetchPrivate(u.pathname,control.signal),bytes=await audioBytes(audio,control.signal);
  if(!current(id))return {ok:true};await ensureOffscreen();if(!current(id))return {ok:true};
  await chrome.runtime.sendMessage({target:'offscreen',type:'play',bytes,tabId,ca,requestId:id});return {ok:true};
 })().then(reply).catch(e=>{if(!current(id)){reply({ok:true});return}const login=e instanceof LoginRequired;notify(tabId,ca,login?'请先登录 Meme BGM 网站，再重试播放':'暂时无法播放，请稍后重试',{blocked:true,login});reply({ok:false})});
 return true;
});

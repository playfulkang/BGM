let audio=null,objectURL=null,currentTab=null,currentCA=null,currentRequest=null;
function send(message){chrome.runtime.sendMessage({target:'background',tabId:currentTab,ca:currentCA,requestId:currentRequest,...message}).catch(()=>{})}
function stop(){const a=audio;audio=null;if(a){a.pause();a.removeAttribute('src');a.load()}if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null}}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(sender.id!==chrome.runtime.id||m?.target!=='offscreen')return;
 if(m.type==='stop'){if(m.tabId!=null&&currentTab!==m.tabId){reply({ok:true});return}stop();reply({ok:true});return}
 if(m.type!=='play')return;
 stop();currentTab=m.tabId;currentCA=m.ca;currentRequest=m.requestId;
 try{
  if(!Array.isArray(m.bytes)||!m.bytes.length||m.bytes.length>2*1024*1024)throw Error('invalid');
  const a=new Audio();audio=a;objectURL=URL.createObjectURL(new Blob([new Uint8Array(m.bytes)],{type:'audio/mpeg'}));a.preload='auto';a.src=objectURL;
  const playing=()=>{if(audio===a)send({type:'status',message:'正在播放专属音乐'})};
  const blocked=()=>{if(audio===a)send({type:'blocked'})};
  a.addEventListener('error',()=>{if(audio===a)send({type:'blocked'})});
  a.addEventListener('ended',()=>{if(audio!==a)return;send({type:'status',message:'播放完毕'});stop()});
  a.play().then(playing).catch(blocked);reply({ok:true});
 }catch{send({type:'blocked'});stop();reply({ok:false})}
});

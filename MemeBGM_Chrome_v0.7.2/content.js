(()=>{'use strict';
let enabled=true,caSeen=null,panel=null;
const getCA=()=>MemeBGMPlatforms.parse(location.href)?.ca||null;
function status(msg,showButton=false,login=false){
 if(!panel){panel=document.createElement('div');panel.id='meme-bgm-status-v07';Object.assign(panel.style,{position:'fixed',right:'18px',bottom:'20px',zIndex:'2147483647',background:'#171717',color:'#fff',padding:'12px 16px',border:'1px solid #f6cb23',borderRadius:'12px',font:'13px system-ui,sans-serif',boxShadow:'0 4px 20px #0009',maxWidth:'350px'});document.documentElement.appendChild(panel);}
 panel.replaceChildren();const title=document.createElement('div');title.textContent='♫ Meme BGM · '+msg;panel.appendChild(title);
 if(showButton){const b=document.createElement('button');b.textContent='▶ 再试播放';Object.assign(b.style,{marginTop:'8px',background:'#ffd633',color:'#111',padding:'8px 12px',border:'0',borderRadius:'7px',cursor:'pointer',fontWeight:'bold'});b.onclick=()=>play();panel.appendChild(b);}
 if(login){const b=document.createElement('button');b.textContent='登录网站';Object.assign(b.style,{marginTop:'8px',marginLeft:'8px',padding:'8px 12px',cursor:'pointer'});b.onclick=()=>chrome.runtime.sendMessage({target:'service',type:'open-site'}).catch(()=>{});panel.appendChild(b);}
}
function play(){const ca=getCA();if(!ca)return;status('正在查询音乐…');chrome.runtime.sendMessage({target:'service',type:'play',ca,pageUrl:location.href}).catch(e=>status('暂时无法播放，请刷新页面重试',true));}
function stop(){chrome.runtime.sendMessage({target:'service',type:'stop'}).catch(()=>{});}
function check(){const ca=getCA();if(ca===caSeen)return;caSeen=ca;stop();if(!enabled||!ca){panel?.remove();panel=null;return;}play();}
chrome.runtime.onMessage.addListener(m=>{if(!enabled||m?.type!=='bgm-status'||m.ca!==getCA())return;status(m.message,!!m.blocked,!!m.login);});
chrome.storage.local.get({enabled:true},s=>{enabled=s.enabled!==false;check();});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.enabled){enabled=changes.enabled.newValue!==false;caSeen=null;check();}});
setInterval(check,700);addEventListener('popstate',check);addEventListener('pagehide',stop);
})();

(()=>{'use strict';
 const CA='(0x[a-f0-9]{40})',patterns={
  'gmgn.ai':{name:'GMGN.AI',path:new RegExp('^/bsc/token/'+CA+'/?$','i')},
  'fomo.family':{name:'Fomo',path:new RegExp('^/tokens/bnb/'+CA+'/?$','i')},
  'axiom.trade':{name:'Axiom',path:new RegExp('^/token/'+CA+'/?$','i'),chain:true},
  'debot.ai':{name:'DeBot',path:new RegExp('^/token/bsc/'+CA+'/?$','i')}
 };
 function supported(url){try{const u=new URL(url);return u.protocol==='https:'&&Object.hasOwn(patterns,u.hostname)&&u.port===''}catch{return false}}
 function parse(url){try{const u=new URL(url);if(!supported(u.href))return null;const rule=patterns[u.hostname],match=u.pathname.match(rule.path);if(!match)return null;if(rule.chain){const chains=u.searchParams.getAll('chain').map(c=>c.toLowerCase());if(chains.length!==1||!['bnb','bsc'].includes(chains[0]))return null}return {ca:match[1].toLowerCase(),platform:rule.name}}catch{return null}}
 globalThis.MemeBGMPlatforms=Object.freeze({supported,parse});
})();

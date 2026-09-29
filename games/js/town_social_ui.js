(function(){
'use strict';
window.TownSocialUI={create(root,actions){
  const style=document.createElement('style');style.textContent=`
.wfChat{position:absolute;left:14px;bottom:16px;width:min(310px,calc(100vw - 150px));pointer-events:auto;background:#08131de6;border:1px solid #6e806d;border-radius:12px;overflow:hidden;color:#e7efdc}.wfChat button,.wfPeople button{background:#162b2a;color:#f3ebc8;border:0;padding:9px 12px;cursor:pointer;font-weight:750}.wfChatToggle{width:100%;text-align:left}.wfChatPreview{font-size:12px;padding:0 10px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wfChatLog{height:min(190px,28vh);overflow:auto;padding:8px 10px;font-size:13px;overflow-wrap:anywhere}.wfChatLog p{margin:0 0 7px}.wfChatForm{display:flex;border-top:1px solid #41594e}.wfChatForm input{min-width:0;flex:1;background:#08131d;color:#fff;border:0;padding:10px;font:inherit;font-size:13px}.wfChatStatus{font-size:11px;padding:4px 10px;color:#b4c5bc}.wfChat [hidden],.wfPeople [hidden]{display:none}.wfPeople{position:absolute;left:14px;top:140px;pointer-events:auto;font-size:12px}.wfPeople button{border-radius:9px;padding:6px 9px;background:#08131dd9}.wfPeopleList{list-style:none;margin:5px 0;padding:8px;background:#08131ded;border-radius:9px;max-height:30vh;overflow:auto;max-width:190px}.wfPeopleList li{padding:3px 0}.wfDot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;border:1px solid #fff}.wfChat input:disabled,.wfChatForm button:disabled{opacity:.55}@media(max-width:600px){.wfPeople{top:108px}.wfChat{width:min(280px,calc(100vw - 140px))}}
`;document.head.appendChild(style);
  const box=document.createElement('section');box.className='wfChat';box.setAttribute('aria-label','Town chat');
  box.innerHTML='<button class="wfChatToggle" aria-expanded="false" aria-controls="wfChatBody">Town chat</button><div class="wfChatPreview">Connecting…</div><div id="wfChatBody" hidden><div class="wfChatLog" role="log" aria-label="Town messages" aria-live="polite"></div><form class="wfChatForm"><input aria-label="Town chat message" placeholder="Message everyone here…" maxlength="300" autocomplete="off" disabled><button disabled>Send</button></form><div class="wfChatStatus">Connecting…</div></div>';
  root.querySelector('.wfHud').appendChild(box);
  const toggle=box.querySelector('button'),body=box.querySelector('#wfChatBody'),preview=box.querySelector('.wfChatPreview'),log=box.querySelector('.wfChatLog'),input=box.querySelector('input'),send=box.querySelector('.wfChatForm button'),status=box.querySelector('.wfChatStatus');
  let unread=0,lastTime=0,scene='',lastHistory='';
  function collapse(open){body.hidden=!open;toggle.setAttribute('aria-expanded',String(open));preview.hidden=open;if(open){unread=0;toggle.textContent='Town chat';log.scrollTop=log.scrollHeight;}return open;}
  toggle.onclick=()=>collapse(body.hidden);
  input.onfocus=()=>actions.stopMovement();input.onkeydown=ev=>{ev.stopPropagation();if(ev.key==='Escape'){collapse(false);input.blur();ev.preventDefault();}};
  box.querySelector('form').onsubmit=ev=>{ev.preventDefault();const text=input.value.trim();if(text&&actions.send(text)){input.value='';input.focus();}};
  const people=document.createElement('div');people.className='wfPeople';people.innerHTML='<button aria-expanded="false" aria-controls="wfPeopleList">Players (1)</button><ul class="wfPeopleList" id="wfPeopleList" hidden></ul>';root.querySelector('.wfHud').appendChild(people);
  const rosterButton=people.querySelector('button'),list=people.querySelector('ul');rosterButton.onclick=()=>{list.hidden=!list.hidden;rosterButton.setAttribute('aria-expanded',String(!list.hidden));};
  function color(value){return /^hsl\(\d+(?:\.\d+)?, 78%, 68%\)$/.test(value||'')?value:'#5ecbff';}
  return {
    setScene(id){if(id===scene)return;scene=id;log.replaceChildren();lastHistory='';lastTime=0;unread=0;toggle.textContent='Town chat';preview.textContent='Connecting…';this.setStatus('Connecting…',false);},
    setStatus(text,enabled){status.textContent=text;input.disabled=!enabled;send.disabled=!enabled;if(!lastHistory)preview.textContent=text;},
    showError(text){status.textContent=text;},
    messages(items){const signature=JSON.stringify(items);if(signature===lastHistory)return;const initial=!lastHistory;lastHistory=signature;const fresh=items.filter(item=>item.time>lastTime);lastTime=Math.max(lastTime,...items.map(item=>item.time));
      const nearBottom=log.scrollHeight-log.scrollTop-log.clientHeight<24;log.replaceChildren();
      for(const item of items.slice(-50)){const p=document.createElement('p'),name=document.createElement('b');name.textContent=item.user+': ';p.append(name,document.createTextNode(item.text));log.appendChild(p);}
      const latest=items.at(-1);preview.textContent=latest?latest.user+': '+latest.text:'Say hello to everyone here.';
      if(!initial&&body.hidden){unread+=fresh.length;toggle.textContent='Town chat'+(unread?' ('+unread+')':'');}if(nearBottom||initial)log.scrollTop=log.scrollHeight;
    },
    roster(players){rosterButton.textContent='Players ('+players.length+')';list.replaceChildren();for(const player of players){const li=document.createElement('li'),dot=document.createElement('span');dot.className='wfDot';dot.style.background=color(player.color);li.append(dot,document.createTextNode(player.name));list.appendChild(li);}},color
  };
}};
})();

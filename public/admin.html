<!DOCTYPE html>
<html>
<head>
  <title>GameForge Admin</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;background:#f3f5f8;color:#222}
    header{background:#17233c;color:white;padding:16px 22px;display:flex;justify-content:space-between;align-items:center}
    header a{color:white;text-decoration:none;background:#2d4778;padding:8px 12px;border-radius:8px}
    main{padding:18px;max-width:1200px;margin:auto}
    .card{background:white;border:1px solid #cfd6e0;border-radius:12px;padding:16px;margin:14px 0;box-shadow:0 2px 6px rgba(0,0,0,.05)}
    .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    input{padding:9px;border:1px solid #aaa;border-radius:8px;min-width:220px}
    button{padding:8px 12px;margin:3px;background:#234f8f;color:white;border:0;border-radius:8px;cursor:pointer}
    button:hover{background:#183b6d}.danger{background:#a32020}.danger:hover{background:#7c1818}.muted{color:#666;font-size:13px}
    table{border-collapse:collapse;width:100%;background:white;margin-top:8px}td,th{border:1px solid #c6ccd5;padding:8px;text-align:left}th{background:#eef2f8}
    .pill{display:inline-block;padding:3px 8px;border-radius:999px;background:#eef2f8}.private{background:#fff0c2}.public{background:#dff3df}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:850px){.grid{grid-template-columns:1fr}}
    #msg{font-weight:bold;margin-top:8px}
  </style>
</head>
<body>
<header>
  <h1>GameForge Admin</h1>
  <a href="/">Back to GameForge</a>
</header>
<main>
  <div class="card">
    <h2>Admin Login</h2>
    <div class="row">
      <input id="adminUser" placeholder="admin username">
      <button onclick="loadAll()">Load Admin Data</button>
    </div>
    <div class="muted">Use a username listed in <code>data/admins.json</code>. Passwords are never shown here.</div>
    <div id="msg"></div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Users</h2>
      <div class="muted">View accounts and remove test users.</div>
      <div id="users">Load admin data to view users.</div>
    </div>

    <div class="card">
      <h2>Open Rooms</h2>
      <div class="muted">Join public/private rooms as admin or close rooms.</div>
      <div id="rooms">Load admin data to view rooms.</div>
    </div>
  </div>
</main>
<script>
let ws=null;
const $=id=>document.getElementById(id);
$('adminUser').value=localStorage.getItem('gfUser')||'admin';
function admin(){return $('adminUser').value.trim();}
function note(t,bad){$('msg').style.color=bad?'#9b1c1c':'#1c6b2a';$('msg').innerText=t||'';}
async function getJSON(url,opts){const r=await fetch(url,opts);let j;try{j=await r.json()}catch(e){j={error:'Bad server response'}};if(!r.ok&& !j.error)j.error='Request failed';return j;}
async function loadAll(){note('Loading...');await loadUsers();await loadRooms();connectAdminSocket();note('Admin data loaded.');}
async function loadUsers(){
  const data=await getJSON('/api/admin/users?user='+encodeURIComponent(admin()));
  if(data.error){$('users').innerHTML='<b>'+data.error+'</b>';note(data.error,true);return;}
  $('users').innerHTML='<table><tr><th>Username</th><th>Wins</th><th>Losses</th><th>Ties</th><th>Played</th><th>Favorite</th><th>Action</th></tr>'+data.map(u=>`<tr><td>${esc(u.username)}${u.admin?' ⭐':''}</td><td>${u.wins||0}</td><td>${u.losses||0}</td><td>${u.ties||0}</td><td>${u.gamesPlayed||0}</td><td>${esc(u.favoriteGame||'')}</td><td><button class="danger" onclick="deleteUser('${escAttr(u.username)}')">Delete</button></td></tr>`).join('')+'</table>';
}
async function deleteUser(name){if(!confirm('Delete user '+name+'?'))return;const data=await getJSON('/api/admin/users/'+encodeURIComponent(name)+'?user='+encodeURIComponent(admin()),{method:'DELETE'});if(data.error){alert(data.error);return;}loadUsers();}
async function loadRooms(){
  const data=await getJSON('/api/admin/rooms?user='+encodeURIComponent(admin()));
  if(data.error){$('rooms').innerHTML='<b>'+data.error+'</b>';note(data.error,true);return;}
  if(!data.length){$('rooms').innerHTML='<p>No open rooms.</p>';return;}
  $('rooms').innerHTML='<table><tr><th>Room</th><th>Owner</th><th>Type</th><th>Game</th><th>People</th><th>Actions</th></tr>'+data.map(r=>`<tr><td><b>${r.id}</b></td><td>${esc(r.owner||'')}</td><td><span class="pill ${r.private?'private':'public'}">${r.private?'Private':'Public'}</span></td><td>${esc(r.selectedGame?r.selectedGame.name:'None selected')}</td><td>${(r.players||[]).map(esc).join(', ')||'none'}</td><td><button onclick="joinRoom('${r.id}')">Join</button><button class="danger" onclick="closeRoom('${r.id}')">Close</button></td></tr>`).join('')+'</table>';
}
function joinRoom(id){location.href='/?room='+encodeURIComponent(id);}
function connectAdminSocket(){
  if(ws&&ws.readyState<=1)return;
  ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);
  ws.onopen=()=>ws.send(JSON.stringify({type:'hello',username:admin()}));
  ws.onmessage=e=>{let m=JSON.parse(e.data); if(m.type==='presence'||m.type==='roomUpdate'||m.type==='roomClosed') loadRooms();};
}
function closeRoom(id){
  if(!confirm('Close room '+id+'?'))return;
  connectAdminSocket();
  const send=()=>ws.send(JSON.stringify({type:'adminClose',roomId:id}));
  if(ws.readyState===1)send(); else ws.onopen=()=>{ws.send(JSON.stringify({type:'hello',username:admin()}));send();};
  setTimeout(loadRooms,400);
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function escAttr(s){return esc(s).replace(/'/g,'&#39;');}
</script>
</body>
</html>

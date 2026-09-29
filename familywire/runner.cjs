const {createRelay}=require('./relay.cjs');
const server=createRelay({secret:process.env.ROOM_SECRET,invites:process.env.INVITE_CODES.split(',').map(v=>v.trim()).filter(Boolean),dir:process.env.DATA_DIR,quotaBytes:Number(process.env.FAMILYWIRE_QUOTA_BYTES)});
server.listen(0,'127.0.0.1',()=>process.send?.({port:server.address().port}));
let closing=false;function close(){if(closing)return;closing=true;server.closeAllConnections();server.close(()=>process.exit(0));}process.on('SIGTERM',close);process.on('disconnect',close);

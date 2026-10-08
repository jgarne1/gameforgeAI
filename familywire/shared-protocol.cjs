const crypto = require('node:crypto');
const MAX_TEXT = 1_000_000, MAX_FILE = 25 * 1024 * 1024;
const RETENTION_MS=48*60*60*1000;
function keys(secret) {
  return {key:crypto.pbkdf2Sync(secret, 'FamilyWire-v2', 100000,32,'sha256'),
    token:crypto.createHash('sha256').update('FamilyWire-access:'+secret).digest('hex')};
}
function seal(data,key) {
  const iv=crypto.randomBytes(12), cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  return Buffer.concat([iv,cipher.update(data),cipher.final(),cipher.getAuthTag()]);
}
function open(data,key) {
  if(data.length<28) throw new Error('Invalid encrypted data');
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,data.subarray(0,12));
  decipher.setAuthTag(data.subarray(data.length-16));
  return Buffer.concat([decipher.update(data.subarray(12,-16)),decipher.final()]);
}
function validURL(value) {
  const u=new URL(value);
  if(u.protocol!=='https:' && !(u.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname))) throw new Error('Use an HTTPS server URL');
  if(u.username||u.password||u.search||u.hash||u.pathname!=='/') throw new Error('Use just the server address, without a path');
  return u.origin;
}
module.exports={keys,seal,open,validURL,MAX_TEXT,MAX_FILE,RETENTION_MS};

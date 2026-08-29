import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {existsSync,mkdirSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

const MAGIC=Buffer.from('NIBIRU1\n');
const derive=(passphrase,salt)=>{if(String(passphrase||'').length<16)throw new Error('backup passphrase must be at least 16 characters');return crypto.scryptSync(passphrase,salt,32,{N:16384,r:8,p:1,maxmem:64*1024*1024})};
const integrity=path=>{const db=new DatabaseSync(path,{readOnly:true});try{return db.prepare('PRAGMA integrity_check').get().integrity_check==='ok'}finally{db.close()}};

export function createEncryptedBackup({dbPath,outputPath,passphrase}){
  if(!dbPath||!outputPath||resolve(dbPath)===resolve(outputPath))throw new Error('distinct dbPath and outputPath are required');
  if(!existsSync(dbPath))throw new Error('source database does not exist');if(existsSync(outputPath))throw new Error('backup output already exists');
  const db=new DatabaseSync(dbPath);try{db.exec('PRAGMA wal_checkpoint(FULL)');if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('source database integrity check failed')}finally{db.close()}
  const salt=crypto.randomBytes(32),iv=crypto.randomBytes(12),key=derive(passphrase,salt),cipher=crypto.createCipheriv('aes-256-gcm',key,iv),ciphertext=Buffer.concat([cipher.update(readFileSync(dbPath)),cipher.final()]),tag=cipher.getAuthTag();
  mkdirSync(dirname(outputPath),{recursive:true});writeFileSync(outputPath,Buffer.concat([MAGIC,salt,iv,tag,ciphertext]),{flag:'wx',mode:0o600});
  return{outputPath,algorithm:'AES-256-GCM',kdf:'scrypt',bytes:ciphertext.length,sha256:crypto.createHash('sha256').update(ciphertext).digest('hex')};
}
export function recoverEncryptedBackup({backupPath,restorePath,passphrase}){
  if(!backupPath||!restorePath||resolve(backupPath)===resolve(restorePath))throw new Error('distinct backupPath and restorePath are required');if(existsSync(restorePath))throw new Error('restore target already exists');
  const payload=readFileSync(backupPath);if(!payload.subarray(0,MAGIC.length).equals(MAGIC))throw new Error('invalid Nibiru backup format');let offset=MAGIC.length;const salt=payload.subarray(offset,offset+=32),iv=payload.subarray(offset,offset+=12),tag=payload.subarray(offset,offset+=16),ciphertext=payload.subarray(offset),key=derive(passphrase,salt),decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);
  let plain;try{plain=Buffer.concat([decipher.update(ciphertext),decipher.final()])}catch{throw new Error('backup authentication failed')}
  mkdirSync(dirname(restorePath),{recursive:true});writeFileSync(restorePath,plain,{flag:'wx',mode:0o600});if(!integrity(restorePath)){unlinkSync(restorePath);throw new Error('restored database integrity check failed')}
  return{restorePath,integrity:'ok',bytes:plain.length};
}

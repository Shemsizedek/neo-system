import tls from 'node:tls';
import { randomUUID } from 'node:crypto';

const clean=(v,max=4000)=>String(v??'').trim().slice(0,max);
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v,320));
const q=v=>`"${String(v??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`;
const safeHeader=v=>String(v??'').replace(/[\r\n]+/g,' ').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

export function titanMailConfig(env=process.env){
  const username=clean(env.NEO_MAIL_USERNAME||env.NEO_MAIL_ADDRESS,320);
  const password=String(env.NEO_MAIL_APP_PASSWORD||env.NEO_MAIL_PASSWORD||'');
  const from=clean(env.NEO_MAIL_FROM||username,320);
  return {
    provider:'titan',
    username,
    password,
    from,
    fromName:clean(env.NEO_MAIL_FROM_NAME||'NEO Deal Desk',160),
    smtpHost:clean(env.NEO_MAIL_SMTP_HOST||'smtp.titan.email',255),
    smtpPort:Number(env.NEO_MAIL_SMTP_PORT||465),
    imapHost:clean(env.NEO_MAIL_IMAP_HOST||'imap.titan.email',255),
    imapPort:Number(env.NEO_MAIL_IMAP_PORT||993),
    replyTo:clean(env.NEO_MAIL_REPLY_TO||from,320),
    configured:Boolean(validEmail(username)&&password&&validEmail(from))
  };
}

function encodeSubject(value){
  const v=safeHeader(value);
  return /^[\x20-\x7E]*$/.test(v)?v:`=?UTF-8?B?${Buffer.from(v,'utf8').toString('base64')}?=`;
}

function dotStuff(value){return String(value).replace(/^\./gm,'..');}

function createBufferedTlsSession({host,port,tlsConnect=tls.connect,timeoutMs=15000}){
  const socket=tlsConnect({host,port,servername:host,rejectUnauthorized:true});
  let buffer=Buffer.alloc(0),closed=false,error=null;
  socket.setTimeout(timeoutMs,()=>socket.destroy(new Error('mail_socket_timeout')));
  socket.on('data',chunk=>{buffer=Buffer.concat([buffer,Buffer.from(chunk)]);});
  socket.on('error',err=>{error=err;});
  socket.on('close',()=>{closed=true;});
  const waitFor=async predicate=>{
    const deadline=Date.now()+timeoutMs;
    while(Date.now()<deadline){
      if(error)throw error;
      const hit=predicate(buffer);
      if(hit)return hit;
      if(closed)throw new Error('mail_socket_closed');
      await sleep(10);
    }
    throw new Error('mail_response_timeout');
  };
  return {socket,waitFor,getBuffer:()=>buffer,consume:n=>{buffer=buffer.subarray(n);}};
}

async function smtpResponse(session){
  return session.waitFor(buf=>{
    const text=buf.toString('utf8');
    const lines=text.split('\r\n').filter(Boolean);
    if(!lines.length)return null;
    const first=lines[0].match(/^(\d{3})([ -])/);
    if(!first)return null;
    const code=Number(first[1]);
    if(first[2]===' '){
      const end=text.indexOf('\r\n');
      return {code,text:text.slice(0,end),bytes:end+2};
    }
    for(let i=1;i<lines.length;i++){
      if(lines[i].startsWith(`${code} `)){
        const marker=lines[i]+'\r\n',end=text.indexOf(marker);
        return {code,text:text.slice(0,end+marker.length),bytes:Buffer.byteLength(text.slice(0,end+marker.length),'utf8')};
      }
    }
    return null;
  });
}

async function smtpCommand(session,command,expected){
  if(command!==null)session.socket.write(command+'\r\n');
  const response=await smtpResponse(session);
  session.consume(response.bytes);
  const allowed=Array.isArray(expected)?expected:[expected];
  if(!allowed.includes(response.code))throw new Error(`smtp_${response.code}`);
  return response;
}

export async function sendTitanSmtpRaw(config,message,{tlsConnect=tls.connect}={}){
  if(!config.configured)throw new Error('titan_mail_not_configured');
  if(!validEmail(message.to))throw new Error('recipient_email_required');
  const session=createBufferedTlsSession({host:config.smtpHost,port:config.smtpPort,tlsConnect});
  try{
    await smtpCommand(session,null,220);
    await smtpCommand(session,`EHLO neo-mail.holytemples.org`,250);
    await smtpCommand(session,'AUTH LOGIN',334);
    await smtpCommand(session,Buffer.from(config.username).toString('base64'),334);
    await smtpCommand(session,Buffer.from(config.password).toString('base64'),235);
    await smtpCommand(session,`MAIL FROM:<${config.from}>`,250);
    await smtpCommand(session,`RCPT TO:<${message.to}>`,[250,251]);
    await smtpCommand(session,'DATA',354);
    const headers=[
      `From: ${safeHeader(config.fromName)} <${config.from}>`,
      `To: <${message.to}>`,
      `Reply-To: <${config.replyTo}>`,
      `Subject: ${encodeSubject(message.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${message.messageId}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      `X-NEO-DealDesk-ID: ${safeHeader(message.itemId)}`,
      `X-NEO-Campaign: ${safeHeader(message.campaign)}`
    ];
    session.socket.write(headers.join('\r\n')+'\r\n\r\n'+dotStuff(message.body)+'\r\n.\r\n');
    await smtpCommand(session,null,250);
    await smtpCommand(session,'QUIT',221);
    return {provider:'titan-smtp',messageId:message.messageId,accepted:[message.to],host:config.smtpHost,port:config.smtpPort,transmittedAt:new Date().toISOString()};
  }finally{
    session.socket.end();
  }
}

function normalizeMessageId(itemId,domain='holytemples.org'){
  const token=clean(itemId,180).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-|-$/g,'')||randomUUID();
  return `<neo-dealdesk.${token}.${randomUUID()}@${domain}>`;
}

export function createTitanMailAdapter({env=process.env,sendRaw=sendTitanSmtpRaw}={}){
  const config=titanMailConfig(env);
  return Object.freeze({
    provider:'titan',
    ready:()=>config.configured,
    status:()=>({provider:'titan',configured:config.configured,smtpHost:config.smtpHost,smtpPort:config.smtpPort,imapHost:config.imapHost,imapPort:config.imapPort,fromConfigured:validEmail(config.from),usernameConfigured:validEmail(config.username)}),
    async send(input={}){
      if(!config.configured)throw new Error('titan_mail_not_configured');
      if(!validEmail(input.recipientEmail))throw new Error('recipient_email_required');
      const messageId=normalizeMessageId(input.metadata?.itemId);
      return sendRaw(config,{
        to:input.recipientEmail,
        subject:clean(input.subject,500),
        body:clean(input.body,30000),
        messageId,
        itemId:clean(input.metadata?.itemId,180),
        campaign:clean(input.metadata?.campaign,180)
      });
    }
  });
}

function unfoldHeaders(raw=''){
  const out={};
  const lines=raw.replace(/\r?\n[ \t]+/g,' ').split(/\r?\n/);
  for(const line of lines){
    const i=line.indexOf(':');if(i<1)continue;
    const key=line.slice(0,i).trim().toLowerCase(),value=line.slice(i+1).trim();
    if(out[key])out[key]+=', '+value;else out[key]=value;
  }
  return out;
}

function decodeQuotedPrintable(value=''){
  return value.replace(/=\r?\n/g,'').replace(/=([0-9A-F]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));
}

function extractPlainText(raw=''){
  const split=raw.search(/\r?\n\r?\n/);if(split<0)return '';
  const headerRaw=raw.slice(0,split),body=raw.slice(split).replace(/^\r?\n\r?\n/,'');
  const headers=unfoldHeaders(headerRaw),type=(headers['content-type']||'text/plain').toLowerCase(),enc=(headers['content-transfer-encoding']||'').toLowerCase();
  const decode=v=>enc.includes('base64')?Buffer.from(v.replace(/\s+/g,''),'base64').toString('utf8'):enc.includes('quoted-printable')?decodeQuotedPrintable(v):v;
  const boundary=(headers['content-type']||'').match(/boundary="?([^";]+)"?/i)?.[1];
  if(type.includes('multipart/')&&boundary){
    for(const part of body.split('--'+boundary)){
      if(/content-type:\s*text\/plain/i.test(part))return clean(extractPlainText(part),12000);
    }
  }
  if(type.includes('text/html'))return clean(decode(body).replace(/<[^>]+>/g,' ').replace(/\s+/g,' '),12000);
  return clean(decode(body),12000);
}

function parseRawEmail(raw='',uid=null){
  const split=raw.search(/\r?\n\r?\n/),headerRaw=split>=0?raw.slice(0,split):raw,headers=unfoldHeaders(headerRaw);
  return {
    uid,
    messageId:clean(headers['message-id'],500),
    inReplyTo:clean(headers['in-reply-to'],1000),
    references:clean(headers['references'],3000),
    from:clean(headers.from,500),
    subject:clean(headers.subject,1000),
    date:clean(headers.date,200),
    text:extractPlainText(raw)
  };
}

async function imapCommand(session,tag,command){
  session.socket.write(`${tag} ${command}\r\n`);
  const marker=Buffer.from(`\r\n${tag} `);
  const result=await session.waitFor(buf=>{
    const idx=buf.indexOf(marker);if(idx<0)return null;
    const lineEnd=buf.indexOf(Buffer.from('\r\n'),idx+2);if(lineEnd<0)return null;
    return {buffer:buf.subarray(0,lineEnd+2),bytes:lineEnd+2};
  });
  session.consume(result.bytes);
  const text=result.buffer.toString('utf8');
  if(!new RegExp(`\\r?\\n${tag} OK\\b`,'i').test(text)&&!new RegExp(`^${tag} OK\\b`,'im').test(text))throw new Error('imap_command_failed');
  return result.buffer;
}

function firstLiteral(buffer){
  const text=buffer.toString('latin1'),m=text.match(/\{(\d+)\}\r\n/);if(!m)return null;
  const prefixBytes=Buffer.byteLength(text.slice(0,m.index+m[0].length),'latin1'),len=Number(m[1]);
  return buffer.subarray(prefixBytes,prefixBytes+len);
}

export async function readTitanImapRaw(config,{limit=25,tlsConnect=tls.connect}={}){
  if(!config.configured)throw new Error('titan_mail_not_configured');
  const session=createBufferedTlsSession({host:config.imapHost,port:config.imapPort,tlsConnect});
  try{
    await session.waitFor(buf=>buf.includes(Buffer.from('\r\n'))?{bytes:buf.indexOf(Buffer.from('\r\n'))+2}:null).then(x=>session.consume(x.bytes));
    await imapCommand(session,'A1',`LOGIN ${q(config.username)} ${q(config.password)}`);
    await imapCommand(session,'A2','SELECT INBOX');
    const search=await imapCommand(session,'A3','UID SEARCH UNSEEN');
    const line=search.toString('utf8').split(/\r?\n/).find(v=>/^\* SEARCH/i.test(v))||'';
    const uids=line.replace(/^\* SEARCH\s*/i,'').trim().split(/\s+/).filter(v=>/^\d+$/.test(v)).slice(-Math.max(1,Math.min(Number(limit)||25,100)));
    const messages=[];
    let seq=4;
    for(const uid of uids){
      const tag=`A${seq++}`;
      const fetched=await imapCommand(session,tag,`UID FETCH ${uid} (BODY.PEEK[]<0.65536>)`);
      const literal=firstLiteral(fetched);
      if(literal)messages.push(parseRawEmail(literal.toString('utf8'),uid));
    }
    await imapCommand(session,`A${seq++}`,'LOGOUT').catch(()=>{});
    return messages;
  }finally{session.socket.end();}
}

export async function markTitanImapSeenRaw(config,uid,{tlsConnect=tls.connect}={}){
  if(!config.configured)throw new Error('titan_mail_not_configured');
  const session=createBufferedTlsSession({host:config.imapHost,port:config.imapPort,tlsConnect});
  try{
    await session.waitFor(buf=>buf.includes(Buffer.from('\r\n'))?{bytes:buf.indexOf(Buffer.from('\r\n'))+2}:null).then(x=>session.consume(x.bytes));
    await imapCommand(session,'B1',`LOGIN ${q(config.username)} ${q(config.password)}`);
    await imapCommand(session,'B2','SELECT INBOX');
    await imapCommand(session,'B3',`UID STORE ${uid} +FLAGS (\\Seen)`);
    await imapCommand(session,'B4','LOGOUT').catch(()=>{});
    return true;
  }finally{session.socket.end();}
}

export function createTitanImapReader({env=process.env,readRaw=readTitanImapRaw,markSeenRaw=markTitanImapSeenRaw}={}){
  const config=titanMailConfig(env);
  return Object.freeze({
    provider:'titan',
    ready:()=>config.configured,
    status:()=>({provider:'titan',configured:config.configured,imapHost:config.imapHost,imapPort:config.imapPort}),
    pollUnread:({limit=25}={})=>readRaw(config,{limit}),
    markSeen:uid=>markSeenRaw(config,uid)
  });
}

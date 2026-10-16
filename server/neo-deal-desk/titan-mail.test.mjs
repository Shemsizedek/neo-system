import test from 'node:test';
import assert from 'node:assert/strict';
import { createTitanMailAdapter, createTitanImapReader, titanMailConfig } from './titan-mail.mjs';

const env={NEO_MAIL_USERNAME:'postmaster@holytemples.org',NEO_MAIL_APP_PASSWORD:'secret',NEO_MAIL_FROM:'postmaster@holytemples.org'};

test('Titan config uses secure official server defaults without exposing secret in status',()=>{
  const cfg=titanMailConfig(env);
  assert.equal(cfg.smtpHost,'smtp.titan.email');
  assert.equal(cfg.smtpPort,465);
  assert.equal(cfg.imapHost,'imap.titan.email');
  assert.equal(cfg.imapPort,993);
  assert.equal(cfg.configured,true);
  const adapter=createTitanMailAdapter({env,sendRaw:async()=>({provider:'test'})});
  const status=adapter.status();
  assert.equal(status.configured,true);
  assert.equal('password' in status,false);
});

test('Titan adapter requires a verified recipient email and passes Deal Desk metadata',async()=>{
  const captured=[];
  const adapter=createTitanMailAdapter({env,sendRaw:async(_cfg,msg)=>{captured.push(msg);return {provider:'titan-smtp',messageId:msg.messageId,accepted:[msg.to]};}});
  await assert.rejects(()=>adapter.send({subject:'Hello',body:'Body',metadata:{itemId:'wave1:1'}}),/recipient_email_required/);
  const result=await adapter.send({recipientEmail:'public@example.org',subject:'Hello',body:'Body',metadata:{itemId:'wave1:1',campaign:'NEO-DEALDESK-004'}});
  assert.equal(result.provider,'titan-smtp');
  assert.equal(captured[0].to,'public@example.org');
  assert.match(captured[0].messageId,/^<neo-dealdesk\.wave1-1\./);
});

test('Titan IMAP reader can be injected for deterministic reply polling',async()=>{
  const reader=createTitanImapReader({env,readRaw:async()=>[{uid:'7',inReplyTo:'<m1>',references:'',text:'Interested'}],markSeenRaw:async()=>true});
  assert.equal(reader.ready(),true);
  const rows=await reader.pollUnread({limit:2});
  assert.equal(rows[0].uid,'7');
});


test('Titan self-test can only target the configured mailbox',async()=>{
  const captured=[];
  const adapter=createTitanMailAdapter({env,sendRaw:async(_cfg,msg)=>{captured.push(msg);return {provider:'titan-smtp',messageId:msg.messageId,accepted:[msg.to]};}});
  const result=await adapter.selfTest();
  assert.equal(result.provider,'titan-smtp');
  assert.equal(captured.length,1);
  assert.equal(captured[0].to,'postmaster@holytemples.org');
  assert.equal(captured[0].campaign,'NEO-MAIL-CERT');
  assert.equal(captured[0].itemId,'neo-mail-self-test');
});

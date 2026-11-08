import test from 'node:test';
import assert from 'node:assert/strict';
import {renderTemplistLogin} from './templist-portal.mjs';

test('unconfigured authentication offers no unusable password or Google control',()=>{
  const html=renderTemplistLogin();
  assert.match(html,/Member sign-in is temporarily unavailable/);
  assert.match(html,/Google Sign-In is awaiting administrator configuration/);
  assert.doesNotMatch(html,/<form|<input|g_id_signin|class="divider"/);
});
test('configured password login preserves the existing form and autocomplete',()=>{
  const html=renderTemplistLogin({passwordLoginAvailable:true});
  assert.match(html,/method="post" action="\/login"/);
  assert.match(html,/autocomplete="username"/);
  assert.match(html,/autocomplete="current-password"/);
  assert.doesNotMatch(html,/temporarily unavailable|class="divider"/);
});
test('Google-only configuration offers Google without a password form',()=>{
  const html=renderTemplistLogin({googleClientId:'synthetic.apps.googleusercontent.com'});
  assert.match(html,/g_id_signin/);
  assert.doesNotMatch(html,/<form|<input|class="divider"|awaiting administrator/);
});
test('both configured methods have one separator and preserve generic failed-login feedback',()=>{
  const html=renderTemplistLogin({googleClientId:'synthetic',passwordLoginAvailable:true,loginFailed:true});
  assert.equal((html.match(/class="divider"/g)||[]).length,1);
  assert.match(html,/password was not recognized/);
});
test('an unconfigured method never displays a failed-password accusation',()=>{
  assert.doesNotMatch(renderTemplistLogin({loginFailed:true}),/password was not recognized/);
  assert.doesNotMatch(renderTemplistLogin({passwordLoginAvailable:'true'}),/<form/);
  assert.doesNotMatch(renderTemplistLogin({googleClientId:'   '}),/g_id_signin/);
});
test('Google client identifier cannot inject HTML with lower, upper or mixed-case tags',()=>{
  for(const tag of ['script','SCRIPT','ScRiPt']){
    const html=renderTemplistLogin({googleClientId:'"><'+tag+'>alert(1)</'+tag+'>'});
    assert.match(html,/data-client_id="&quot;&gt;&lt;script&gt;/i);
    assert.doesNotMatch(html,/<script|data-client_id="">/i);
  }
});

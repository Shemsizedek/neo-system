<?php
require __DIR__.'/merchant.test.php';
$adapter=false;$evidence=null;
function has_filter($name){global $adapter;return $adapter?10:false;}
function apply_filters($name,$value,...$args){global $evidence;return $evidence;}
require __DIR__.'/activation.php';
function fresh_activation_order($n){global $input,$uid,$admin;$uid=7;$admin=true;return neo_counter_prepare_merchant($input,request_key($n));}
function transition_current($order,$action){return neo_counter_transition_invoice($order,neo_counter_invoice($order)['payload_hash'],$action);}
function good_evidence($order){$r=neo_counter_invoice($order);return array('wallet_control_verified'=>true,'chain_verified'=>true,'network'=>'mainnet','ledger'=>$r['invoice']['ledger'],'destination'=>$r['invoice']['destination'],'payload_hash'=>$r['payload_hash'],'observed_at'=>time(),'expires_at'=>$r['invoice']['expires_at'],'proof_id'=>str_repeat('a',64));}
$o=fresh_activation_order(201);$r=neo_counter_invoice($o);$before=$r['payload_hash'];
$uid=7;rejects(fn()=>transition_current($o,'accept'),'Admin cannot accept for customer');
$uid=0;rejects(fn()=>transition_current($o,'accept'),'Anonymous customer denied');
$uid=99;$admin=false;transition_current($o,'accept');$accepted=neo_counter_invoice($o);
check($accepted['state']==='AWAITING_ACTIVATION'&&$accepted['invoice']['terms_accepted']&&!$accepted['invoice']['payable'],'Acceptance preserves payment hold');
rejects(fn()=>neo_counter_transition_invoice($o,$before,'accept'),'Stale form rejected');
rejects(fn()=>transition_current($o,'activate'),'Customer cannot activate');
$uid=7;$admin=true;rejects(fn()=>transition_current($o,'activate'),'Missing verifier adapter holds');
check(neo_counter_invoice($o)['payload_hash']===$accepted['payload_hash'],'Failed activation rolls back unchanged');
$adapter=true;$evidence=good_evidence($o);
foreach(array('wallet_control_verified'=>false,'chain_verified'=>false,'network'=>'testnet','ledger'=>'cp20','destination'=>'attacker','payload_hash'=>str_repeat('f',64),'observed_at'=>time()-61,'expires_at'=>time()-1,'proof_id'=>'not-proof') as $key=>$value){
    $evidence=good_evidence($o);$evidence[$key]=$value;rejects(fn()=>transition_current($o,'activate'),'Reject invalid proof '.$key);
}
$evidence=good_evidence($o);$evidence['observed_at']=time()+120;rejects(fn()=>transition_current($o,'activate'),'Future observation rejected');
$evidence=good_evidence($o);transition_current($o,'activate');$active=neo_counter_invoice($o);
check($active['state']==='AWAITING_PAYMENT'&&neo_counter_invoice_payable($active),'Verified operator activation exposes payable invoice');
check($active['invoice']['amount_minor']===$accepted['invoice']['amount_minor']&&$active['invoice']['destination']===$accepted['invoice']['destination']&&$active['invoice']['terms_hash']===$accepted['invoice']['terms_hash'],'Activation cannot rewrite amount recipient or terms');
rejects(fn()=>transition_current($o,'activate'),'Activation cannot replay');
$adapter=false;check(!neo_counter_invoice_payable($active),'Adapter loss hides payment instructions');$adapter=true;
transition_current($o,'cancel');check(!neo_counter_invoice_payable(neo_counter_invoice($o))&&neo_counter_invoice($o)['state']==='CANCELLED','Cancellation closes payment instructions');
rejects(fn()=>transition_current($o,'activate'),'Cancelled invoice cannot reopen');
$o=fresh_activation_order(202);$wpdb->update(neo_counter_tables()['invoices'],array('payment_txid'=>str_repeat('b',64)),array('order_id'=>$o));rejects(fn()=>transition_current($o,'cancel'),'Observed payment prevents cancellation');
$o=fresh_activation_order(203);$row=neo_counter_invoice($o);$p=$row['invoice'];$p['expires_at']=time()-1;$json=wp_json_encode($p);$wpdb->update(neo_counter_tables()['invoices'],array('payload'=>$json,'payload_hash'=>hash('sha256',$json)),array('order_id'=>$o));$uid=99;rejects(fn()=>transition_current($o,'accept'),'Expired invoice cannot be accepted');
$o=fresh_activation_order(204);$row=neo_counter_invoice($o);$p=$row['invoice'];$p['terms_snapshot']='altered without hash update';$json=wp_json_encode($p);$wpdb->update(neo_counter_tables()['invoices'],array('payload'=>$json,'payload_hash'=>hash('sha256',$json)),array('order_id'=>$o));$uid=99;rejects(fn()=>transition_current($o,'accept'),'Altered terms cannot be accepted');
$o=fresh_activation_order(205);$row=neo_counter_invoice($o);$wpdb->insert(neo_counter_tables()['claims'],array('invoice_id'=>$row['id'],'txid'=>str_repeat('c',64)));rejects(fn()=>transition_current($o,'cancel'),'Existing claim blocks changes');
$o=fresh_activation_order(206);$row=neo_counter_invoice($o);$uid=99;$admin=false;$wpdb->fail_update=true;
rejects(fn()=>transition_current($o,'accept'),'Injected write failure rejects acceptance');$wpdb->fail_update=false;
check(neo_counter_invoice($o)['payload_hash']===$row['payload_hash']&&neo_counter_invoice($o)['state']==='LOCKED_NOT_PAYABLE','Write failure rolls back exact invoice');
$form=neo_counter_transition_form($row,'accept');check(strpos($form,'name="accept_terms"')!==false&&strpos($form,'required')!==false&&strpos($form,'name="_wpnonce"')!==false&&strpos($form,$row['payload_hash'])!==false,'Customer form binds explicit consent, nonce and exact payload');
echo "PASS: customer-only acceptance, operator-only activation, proof binding/freshness, atomic rollback, cancellation, replay, expiry and payment reconciliation holds\n";

<?php
require __DIR__.'/settlement.test.php';
function get_userdata($id){return in_array($id,array(7,99),true)?(object)array('ID'=>$id):false;}
$posts=array();$post_seq=1000;
function wp_insert_post($data,$errors=false){global $posts,$post_seq;$posts[++$post_seq]=$data;return $post_seq;}
function wp_delete_post($id,$force){global $posts;unset($posts[$id]);}
require __DIR__.'/payment.php';require __DIR__.'/currencies.php';
function neo_stewardship_currency_by_id($id){foreach(neo_stewardship_currency_catalog() as $e)if($e['id']===$id)return $e;return null;}
$market_fail=false;
function neo_stewardship_daily_market($ledger,$asset,$owner=''){
 global $market_fail;if($market_fail)return false;
 foreach(neo_stewardship_currency_catalog() as $e)if($e['counterpartyAsset']===$asset){$v=$e['verification'][$ledger]??array();if(!in_array($v['status']??'',array('native_asset','treasury_asset_verified'),true))return false;return array('asset'=>$asset,'owner'=>$owner,'divisible'=>$v['divisible'],'day'=>gmdate('Y-m-d'),'priceSats'=>'1000');}return false;
}
require __DIR__.'/merchant.php';
$admin=true;$uid=7;
$input=array('order_kind'=>'service_bill','ledger'=>'classic','payment_asset'=>'XCP','base_minor'=>'100000000','payer'=>NEO_STEWARDSHIP_BOND_SOURCE,'member_id'=>99,'item_reference'=>'SERVICE-001','terms'=>'Service bill for the agreed consultation.','payable'=>true,'destination'=>'attacker');
$order=neo_counter_prepare_merchant($input,request_key(101));check(is_int($order),'Operator prepares merchant invoice');$m=neo_counter_invoice($order);$p=$m['invoice'];
check($p['order_kind']==='service_bill'&&$p['amount_minor']==='109000000','Bill type and once-rounded 9 percent');
check($p['destination']===NEO_STEWARDSHIP_COLLECTION&&!$p['payable']&&!$p['terms_accepted'],'Caller cannot override collection, activation or member acceptance');
check((int)$m['user_id']===99&&$posts[$order]['post_status']==='private','Private member-owned invoice');
$n=count($posts);check(is_wp_error(neo_counter_prepare_merchant($input,request_key(101)))&&count($posts)===$n,'Duplicate request creates no orphan order');
$admin=false;check(is_wp_error(neo_counter_prepare_merchant($input,request_key(102))),'Member cannot set merchant prices');$admin=true;
foreach(array('ledger'=>'unknown','payment_asset'=>'USD','payer'=>'not-an-address','member_id'=>88,'order_kind'=>'arbitrary','base_minor'=>'1.5','terms'=>'','item_reference'=>'https://attacker/') as $key=>$value){$bad=$input;$bad[$key]=$value;check(is_wp_error(neo_counter_prepare_merchant($bad,request_key(103))),'Invalid merchant '.$key);}
check(neo_counter_merchant_amount('1')==='2'&&neo_counter_merchant_amount('100')==='109'&&neo_counter_merchant_amount('999999999999999')==='1089999999999999','Atomic markup precision and bounds');
$confirmed=array('state'=>'PAYMENT_CONFIRMED');$late=array('state'=>'LATE_PAYMENT_REVIEW');
foreach(array('token_sale','digital_goods','physical_goods','service_bill') as $kind){
 $x=$p;$x['order_kind']=$kind;check(neo_counter_fulfillment_plan($x,$confirmed,true)['invoice_state']==='PAYMENT_REVIEW_REQUIRED','Draft remains held '.$kind);
 $x['payable']=true;check(neo_counter_fulfillment_plan($x,$late,true)['job_state']==='HOLD_PAYMENT_REVIEW','Late payment never fulfills '.$kind);
}
$x=$p;$x['payable']=true;$x['terms_accepted']=true;check(neo_counter_fulfillment_plan($x,$confirmed)['job_state']==='BILL_PAID','Bill paid is separate from service completion');
$x['order_kind']='physical_goods';check(neo_counter_fulfillment_plan($x,$confirmed)['job_state']==='PAID_AWAITING_SHIPMENT','Payment is not shipment');
$x['order_kind']='digital_goods';check(neo_counter_fulfillment_plan($x,$confirmed)['job_state']==='HOLD_DIGITAL_DELIVERY_SETUP','No public download bypass');
$x['order_kind']='token_sale';check(neo_counter_fulfillment_plan($x,$confirmed,false)['job_state']==='HOLD_INVENTORY','Token delivery needs inventory');
check(!neo_counter_tokenworks_plan($x)['onChainEscrowVerified'],'Merchant wallet is not called protocol escrow');
check(!neo_counter_tokenworks_plan($x,'dex_order')['canExecute'],'DEX plan is not an executable escrow adapter');
rejects(fn()=>neo_counter_tokenworks_plan($x,'utxo_atomic_swap'),'No Classic atomic-swap assumption');$x['ledger']='cp20';check(!neo_counter_tokenworks_plan($x,'utxo_atomic_swap')['canExecute'],'CP2 swap adapter not fabricated');
$x['order_kind']='service_bill';rejects(fn()=>neo_counter_tokenworks_plan($x,'dex_order'),'DEX exchange cannot prove service delivery');
check(neo_counter_merchant_price_to_minor('0.00000001')==='1'&&neo_counter_merchant_price_to_minor('2.5')==='250000000','Human price exact decimal conversion');
foreach(array('0','1e3','0.000000001','99999999','1,000','-1') as $badprice)rejects(fn()=>neo_counter_merchant_price_to_minor($badprice),'Reject invalid human price');
$unaccepted=$p;$unaccepted['payable']=true;check(neo_counter_fulfillment_plan($unaccepted,$confirmed)['job_state']==='HOLD_MEMBER_ACCEPTANCE','Member terms acceptance is independent of activation');
$world=$input;unset($world['payment_asset'],$world['base_minor']);$world['currency_id']='neo';$world['base_price']='2';$worldorder=neo_counter_prepare_merchant($world,request_key(120));check(is_int($worldorder),'World Currency merchant invoice');
$worldinvoice=neo_counter_invoice($worldorder)['invoice'];check($worldinvoice['currency_asset']==='NEOCASH'&&$worldinvoice['currency_id']==='neo'&&$worldinvoice['currency_decimals']===0&&$worldinvoice['amount_minor']==='3','Indivisible token price plus once-rounded markup');
$world['base_price']='2.5';check(is_wp_error(neo_counter_prepare_merchant($world,request_key(121))),'Indivisible fractional price blocked');
$market_fail=true;$world['base_price']='2';check(is_wp_error(neo_counter_prepare_merchant($world,request_key(122))),'Missing daily rate never falls back to BTC');$market_fail=false;
$world['currency_id']='nmni';check(is_wp_error(neo_counter_prepare_merchant($world,request_key(123))),'Classic NOMNI source mismatch held');
$world['ledger']='cp20';check(is_int(neo_counter_prepare_merchant($world,request_key(124))),'Verified CP2 identity accepted');
// Exercise the actual atomic payment writer with a token-denominated service bill.
$pay=$to;$pay['transaction']['txid']=str_repeat('e',64);$pay['token']['ledger']='classic';$pay['token']['sends'][0]=array('tx_hash'=>str_repeat('e',64),'source'=>$p['payer'],'destination'=>$p['destination'],'asset'=>'XCP','quantity'=>109000000,'status'=>'valid','block_index'=>100);
$pay['transaction']['status']['block_time']=time()+1;
$r=neo_counter_record_payment($order,$pay);check($r['state']==='PAYMENT_REVIEW_REQUIRED','Real writer keeps draft bill held');
$job=$wpdb->db->query('SELECT * FROM t_neo_counter_delivery WHERE invoice_id='.(int)$m['id'])->fetch(PDO::FETCH_ASSOC);
check($job['fulfillment_kind']==='service_bill'&&$job['state']==='HOLD_ACTIVATION','Service bill gets correct outbox job');
neo_counter_record_payment($order,$pay);check((int)$wpdb->db->query('SELECT COUNT(*) FROM t_neo_counter_delivery WHERE invoice_id='.(int)$m['id'])->fetchColumn()===1,'Service outbox replay idempotent');
check($wpdb->count('reservations')===1,'Goods and bills never reserve token stock');
$pay['chain']['canonical_hash']=str_repeat('f',64);neo_counter_record_payment($order,$pay);
check($wpdb->db->query('SELECT state FROM t_neo_counter_delivery WHERE invoice_id='.(int)$m['id'])->fetchColumn()==='HOLD_PAYMENT_RECHECK','Bill reorg returns to hold');
echo "PASS: merchant drafts, authorization, collection isolation, exact markup, fulfillment routing, escrow capability boundaries, service payment replay and reorg\n";
function esc_url($x){return htmlspecialchars($x,ENT_QUOTES);}function esc_attr($x){return htmlspecialchars($x,ENT_QUOTES);}function esc_html($x){return htmlspecialchars($x,ENT_QUOTES);}
function admin_url($x){return 'https://example.test/wp-admin/'.$x;}function home_url($x){return 'https://example.test'.$x;}
function wp_nonce_field($action){echo '<input type="hidden" name="_wpnonce" value="fixture-'.htmlspecialchars($action,ENT_QUOTES).'">';}
function submit_button($text){echo '<button>'.htmlspecialchars($text,ENT_QUOTES).'</button>';}
$admin=true;ob_start();neo_counter_merchant_admin();$html=ob_get_clean();
check(strpos($html,'name="base_price"')!==false&&strpos($html,'fixture-neo_counter_merchant_prepare')!==false,'Admin form uses human price and nonce');
check(substr_count($html,'<form')===1&&substr_count($html,'</form>')===1&&strpos($html,'Service bill')!==false,'Admin form renders complete merchant options');
$admin=false;ob_start();neo_counter_merchant_admin();check(ob_get_clean()==='','Unauthorized user sees no operator screen');
echo "PASS: merchant admin form rendering, nonce and capability guard\n";

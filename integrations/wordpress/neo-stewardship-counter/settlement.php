<?php
defined('ABSPATH') || exit;
require_once __DIR__.'/settlement-core.php';
require_once __DIR__.'/token-settlement.php';
require_once __DIR__.'/inventory.php';
require_once __DIR__.'/merchant-core.php';
function neo_counter_tables(){global $wpdb;return array('invoices'=>$wpdb->prefix.'neo_counter_invoices','claims'=>$wpdb->prefix.'neo_counter_claims','jobs'=>$wpdb->prefix.'neo_counter_delivery','stock'=>$wpdb->prefix.'neo_counter_stock','reservations'=>$wpdb->prefix.'neo_counter_reservations');}
function neo_counter_transactional_tables(){global $wpdb;foreach(neo_counter_tables() as $table){$r=$wpdb->get_row($wpdb->prepare('SHOW TABLE STATUS WHERE Name = %s',$table),ARRAY_A);if(!$r||strtolower($r['Engine'])!=='innodb')return false;}return true;}
function neo_counter_install_settlement(){
    if(get_option('neo_counter_settlement_schema')==='3'&&get_option('neo_counter_settlement_selftest')==='passed-v3')return;
    global $wpdb;$t=neo_counter_tables();$collate=$wpdb->get_charset_collate();require_once ABSPATH.'wp-admin/includes/upgrade.php';
    dbDelta("CREATE TABLE {$t['invoices']} (
 id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
 order_id bigint(20) unsigned NOT NULL,
 user_id bigint(20) unsigned NOT NULL,
 request_key varchar(64) NOT NULL,
 payload longtext NOT NULL,
 payload_hash char(64) NOT NULL,
 state varchar(40) NOT NULL,
 payment_txid char(64) DEFAULT NULL,
 observation longtext DEFAULT NULL,
 created_at bigint(20) unsigned NOT NULL,
 expires_at bigint(20) unsigned NOT NULL,
 updated_at bigint(20) unsigned NOT NULL,
 PRIMARY KEY  (id),
 UNIQUE KEY order_id (order_id),
 UNIQUE KEY request_key (request_key),
 KEY state (state)
) ENGINE=InnoDB $collate;");
    dbDelta("CREATE TABLE {$t['claims']} (
 txid char(64) NOT NULL,
 invoice_id bigint(20) unsigned NOT NULL,
 vout int(10) unsigned NOT NULL,
 block_hash char(64) NOT NULL,
 claimed_at bigint(20) unsigned NOT NULL,
 PRIMARY KEY  (txid),
 UNIQUE KEY invoice_id (invoice_id)
) ENGINE=InnoDB $collate;");
    dbDelta("CREATE TABLE {$t['jobs']} (
 id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
 invoice_id bigint(20) unsigned NOT NULL,
 fulfillment_kind varchar(32) NOT NULL DEFAULT 'token_sale',
 state varchar(40) NOT NULL,
 payment_txid char(64) NOT NULL,
 delivery_txid char(64) DEFAULT NULL,
 attempts int(10) unsigned NOT NULL DEFAULT 0,
 updated_at bigint(20) unsigned NOT NULL,
 PRIMARY KEY  (id),
 UNIQUE KEY invoice_id (invoice_id),
 UNIQUE KEY delivery_txid (delivery_txid),
 KEY state (state)
) ENGINE=InnoDB $collate;");
    dbDelta("CREATE TABLE {$t['stock']} (
 stock_key char(64) NOT NULL,
 reserved bigint(20) unsigned NOT NULL DEFAULT 0,
 observed_at bigint(20) unsigned NOT NULL DEFAULT 0,
 PRIMARY KEY  (stock_key)
) ENGINE=InnoDB $collate;");
    dbDelta("CREATE TABLE {$t['reservations']} (
 invoice_id bigint(20) unsigned NOT NULL,
 stock_key char(64) NOT NULL,
 quantity bigint(20) unsigned NOT NULL,
 state varchar(40) NOT NULL,
 created_at bigint(20) unsigned NOT NULL,
 PRIMARY KEY  (invoice_id),
 KEY stock_key (stock_key)
) ENGINE=InnoDB $collate;");
    if(neo_counter_transactional_tables()&&neo_counter_storage_selftest()){update_option('neo_counter_settlement_schema','3',false);update_option('neo_counter_settlement_selftest','passed-v3',false);}
}
/** Rollback-only schema probe: no fake invoice, claim or job may survive. */
function neo_counter_storage_selftest(){
    global $wpdb;$t=neo_counter_tables();$previous=$wpdb->suppress_errors(true);$started=false;$ok=false;
    $nonce=hash('sha256',wp_generate_uuid4());$tx=hash('sha256','schema-test:'.$nonce);$first=0;$second=0;
    try{
        if($wpdb->query('START TRANSACTION')===false)throw new RuntimeException('Probe transaction unavailable.');$started=true;
        foreach(array(0,PHP_INT_MAX) as $i=>$order){
            $row=array('order_id'=>$order,'user_id'=>0,'request_key'=>hash('sha256',$nonce.':'.$i),'payload'=>'{}','payload_hash'=>hash('sha256','{}'),'state'=>'SCHEMA_PROBE','created_at'=>time(),'expires_at'=>time(),'updated_at'=>time());
            if(!$wpdb->insert($t['invoices'],$row))throw new RuntimeException('Probe invoice insert failed.');
            if($i===0)$first=(int)$wpdb->insert_id;else $second=(int)$wpdb->insert_id;
        }
        $claim=array('txid'=>$tx,'invoice_id'=>$first,'vout'=>0,'block_hash'=>str_repeat('0',64),'claimed_at'=>time());
        if(!$wpdb->insert($t['claims'],$claim))throw new RuntimeException('Probe claim failed.');
        $duplicate=$claim;$duplicate['invoice_id']=$second;
        if($wpdb->insert($t['claims'],$duplicate)!==false)throw new RuntimeException('Transaction uniqueness missing.');
        $duplicate=$claim;$duplicate['txid']=hash('sha256',$tx);
        if($wpdb->insert($t['claims'],$duplicate)!==false)throw new RuntimeException('Invoice claim uniqueness missing.');
        $job=array('invoice_id'=>$first,'fulfillment_kind'=>'service_bill','state'=>'SCHEMA_PROBE','payment_txid'=>$tx,'updated_at'=>time());
        if(!$wpdb->insert($t['jobs'],$job)||$wpdb->insert($t['jobs'],$job)!==false)throw new RuntimeException('Job uniqueness missing.');
        if(!$wpdb->insert($t['stock'],array('stock_key'=>$nonce,'reserved'=>1,'observed_at'=>time())))throw new RuntimeException('Stock probe failed.');
        $reservation=array('invoice_id'=>$first,'stock_key'=>$nonce,'quantity'=>1,'state'=>'SCHEMA_PROBE','created_at'=>time());
        if(!$wpdb->insert($t['reservations'],$reservation)||$wpdb->insert($t['reservations'],$reservation)!==false)throw new RuntimeException('Reservation uniqueness missing.');
        if($wpdb->query('ROLLBACK')===false)throw new RuntimeException('Probe rollback failed.');$started=false;
        $counts=array($wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['invoices']} WHERE id IN (%d,%d)",$first,$second)),
            $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['claims']} WHERE txid = %s",$tx)),
            $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['jobs']} WHERE invoice_id = %d",$first)),
            $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['stock']} WHERE stock_key = %s",$nonce)),
            $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['reservations']} WHERE invoice_id = %d",$first)));
        $ok=true;foreach($counts as $count)if($count===null||!ctype_digit((string)$count)||(int)$count!==0)$ok=false;
    }catch(Throwable $e){$ok=false;}
    finally{if($started)$wpdb->query('ROLLBACK');$wpdb->suppress_errors($previous);}
    return $ok;
}
add_action('init','neo_counter_install_settlement',1);
function neo_counter_create_locked_invoice($order_id,$record,$request_key){
    if(!neo_counter_transactional_tables())return new WP_Error('storage_unavailable','Transactional invoice storage is unavailable.');
    if(!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i',$request_key))return new WP_Error('request_key','Reload checkout before continuing.');
    global $wpdb;$t=neo_counter_tables();$now=time();
    if($record['market_reference']['expiresAt']<=$now*1000)return new WP_Error('expired_quote','Refresh the expired quote.');
    $p=array('version'=>2,'order_kind'=>'token_sale','settlement_method'=>'merchant_inventory','terms_accepted'=>true,'order_id'=>(int)$order_id,'currency_asset'=>$record['payment_currency'],'currency_decimals'=>$record['currency_decimals'],'amount_minor'=>$record['total_minor'],
        'payer'=>$record['delivery_wallet'],'destination'=>$record['collection_address'],'ledger'=>$record['counterparty_ledger'],'delivery_asset'=>$record['asset'],'delivery_quantity'=>$record['quantity'],
        'delivery_wallet'=>$record['delivery_wallet'],'token_source'=>$record['token_source_address'],'reference_id'=>$record['market_reference']['referenceId'],
        'valuation_day'=>$record['market_reference']['valuationDay'],'markup_bps'=>900,'terms_hash'=>$record['terms_sha256'],'quote_expires_at'=>intdiv($record['market_reference']['expiresAt'],1000),
        'created_at'=>$now,'expires_at'=>$now+1800,'confirmations'=>3,'payable'=>false);
    $json=wp_json_encode($p);$key=hash('sha256',get_current_user_id().':'.$request_key);
    $ok=$wpdb->insert($t['invoices'],array('order_id'=>$order_id,'user_id'=>get_current_user_id(),'request_key'=>$key,'payload'=>$json,'payload_hash'=>hash('sha256',$json),'state'=>'LOCKED_NOT_PAYABLE','created_at'=>$now,'expires_at'=>$p['expires_at'],'updated_at'=>$now));
    if(!$ok)return new WP_Error('invoice_conflict','Checkout was already submitted or could not be saved. Open your existing checkout before retrying.');return (int)$wpdb->insert_id;
}
function neo_counter_invoice($order_id){global $wpdb;$t=neo_counter_tables();$row=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$t['invoices']} WHERE order_id = %d",$order_id),ARRAY_A);if(!$row)return false;if(!hash_equals($row['payload_hash'],hash('sha256',$row['payload'])))return new WP_Error('invoice_changed','Invoice integrity check failed.');$row['invoice']=json_decode($row['payload'],true);return $row;}
function neo_counter_http($url,$json=true){$r=wp_remote_get($url,array('timeout'=>4,'redirection'=>0,'limit_response_size'=>1048576));if(is_wp_error($r)||wp_remote_retrieve_response_code($r)!==200)throw new RuntimeException('Bitcoin index unavailable; retry later.');$body=wp_remote_retrieve_body($r);$out=$json?json_decode($body,true,512,JSON_BIGINT_AS_STRING):trim($body);if($json&&!is_array($out))throw new RuntimeException('Invalid Bitcoin index response.');return $out;}
function neo_counter_read_btc($txid){
    if(!preg_match('/^[a-f0-9]{64}$/i',$txid))throw new InvalidArgumentException('Invalid transaction ID.');$observations=array();
    foreach(array('https://blockstream.info/api','https://mempool.space/api') as $host){
        $tx=neo_counter_http($host.'/tx/'.$txid);if(!isset($tx['txid'])||strtolower($tx['txid'])!==strtolower($txid))throw new RuntimeException('Transaction ID mismatch.');
        $height=neo_counter_http($host.'/blocks/tip/height',false);if(!ctype_digit($height))throw new RuntimeException('Invalid chain height.');$canonical=null;
        if(!empty($tx['status']['confirmed'])){if(!isset($tx['status']['block_height'])||!is_int($tx['status']['block_height']))throw new RuntimeException('Invalid block height.');$canonical=neo_counter_http($host.'/block-height/'.$tx['status']['block_height'],false);if(!preg_match('/^[a-f0-9]{64}$/i',$canonical))throw new RuntimeException('Invalid canonical block.');}
        $observations[]=array('transaction'=>$tx,'chain'=>array('height'=>(int)$height,'canonical_hash'=>$canonical),'source'=>$host);
    }
    if(!neo_counter_observations_agree($observations[0],$observations[1]))throw new RuntimeException('Bitcoin indexes disagree; payment is on hold.');
    $observations[0]['chain']['height']=min($observations[0]['chain']['height'],$observations[1]['chain']['height']);return $observations[0];
}
function neo_counter_record_payment($order_id,$observed){
    global $wpdb;$t=neo_counter_tables();if(!neo_counter_transactional_tables())throw new RuntimeException('Transactional payment storage unavailable.');
    if($wpdb->query('START TRANSACTION')===false)throw new RuntimeException('Could not lock payment record.');
    try{
        $row=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$t['invoices']} WHERE order_id = %d FOR UPDATE",$order_id),ARRAY_A);
        if(!$row||!hash_equals($row['payload_hash'],hash('sha256',$row['payload'])))throw new RuntimeException('Invoice integrity check failed.');
        $invoice=json_decode($row['payload'],true);$kind=neo_counter_order_kind($invoice);$assessment=$invoice['currency_asset']==='BTC'?neo_counter_assess_btc($invoice,$observed['transaction'],$observed['chain'],time()):neo_counter_assess_token($invoice,$observed,time());$txid=strtolower($observed['transaction']['txid']);
        $claim=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$t['claims']} WHERE txid = %s",$txid),ARRAY_A);
        if($claim&&(int)$claim['invoice_id']!==(int)$row['id'])throw new RuntimeException('This payment is already claimed by another invoice.');
        $existing=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$t['claims']} WHERE invoice_id = %d",$row['id']),ARRAY_A);if($existing&&$existing['txid']!==$txid)throw new RuntimeException('This invoice already has a claimed payment.');
        $state=$assessment['state'];$job=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$t['jobs']} WHERE invoice_id = %d",$row['id']),ARRAY_A);
        if($job&&!empty($job['delivery_txid']))throw new RuntimeException('Delivery already recorded; manual reconciliation required.');
        if(in_array($state,array('PAYMENT_CONFIRMED','LATE_PAYMENT_REVIEW'),true)&&($assessment['confirmations']??0)>=$invoice['confirmations']){
            if(!$claim&&!$wpdb->insert($t['claims'],array('txid'=>$txid,'invoice_id'=>$row['id'],'vout'=>$assessment['vout'],'block_hash'=>$assessment['block_hash'],'claimed_at'=>time())))throw new RuntimeException('Payment claim conflict.');
            $reserved=$kind==='token_sale'&&isset($observed['inventory'])&&neo_counter_reserve_inventory($row,$observed['inventory']);
            $plan=neo_counter_fulfillment_plan($invoice,$assessment,$reserved);$state=$plan['invoice_state'];
            $data=array('state'=>$plan['job_state'],'fulfillment_kind'=>$kind,'payment_txid'=>$txid,'updated_at'=>time());
            if($job){if($wpdb->update($t['jobs'],$data,array('invoice_id'=>$row['id']))===false)throw new RuntimeException('Delivery hold could not be saved.');}
            elseif(!$wpdb->insert($t['jobs'],array_merge($data,array('invoice_id'=>$row['id']))))throw new RuntimeException('Delivery queue could not be saved.');
        }elseif($claim){if($wpdb->update($t['jobs'],array('state'=>'HOLD_PAYMENT_RECHECK','updated_at'=>time()),array('invoice_id'=>$row['id']))===false)throw new RuntimeException('Delivery hold could not be saved.');$state='PAYMENT_RECHECK_REQUIRED';}
        if($wpdb->update($t['invoices'],array('state'=>$state,'payment_txid'=>$txid,'observation'=>wp_json_encode($assessment),'updated_at'=>time()),array('id'=>$row['id']))===false)throw new RuntimeException('Payment status could not be saved.');
        if($wpdb->query('COMMIT')===false)throw new RuntimeException('Payment commit failed.');return array('state'=>$state,'assessment'=>$assessment,'delivery'=>'NOT_SENT');
    }catch(Throwable $e){$wpdb->query('ROLLBACK');throw $e;}
}
function neo_counter_verify_order($order,$txid){
    $row=neo_counter_invoice($order);if(!$row||is_wp_error($row))throw new RuntimeException('Checkout not found or invoice integrity failed.');
    $p=$row['invoice'];$o=$p['currency_asset']==='BTC'?neo_counter_read_btc($txid):neo_counter_read_token($p,$txid);
    if(neo_counter_order_kind($p)==='token_sale'){try{$o['inventory']=neo_counter_read_inventory($p,$o['chain']['height']);}catch(Throwable $e){$o['inventory_error']='Inventory unavailable; delivery held.';}}
    $result=neo_counter_record_payment($order,$o);
    if(in_array($result['state'],array('PAYMENT_DETECTED','TOKEN_UNCONFIRMED','NO_EXACT_TOKEN_PAYMENT','PAYMENT_RECHECK_REQUIRED'),true)&&!wp_next_scheduled('neo_counter_watch_payment',array($order,$txid)))wp_schedule_single_event(time()+60,'neo_counter_watch_payment',array($order,$txid));return $result;
}
add_action('neo_counter_watch_payment',function($order,$txid){$row=neo_counter_invoice($order);if(!$row||is_wp_error($row)||time()>(int)$row['expires_at']+10800)return;try{neo_counter_verify_order($order,$txid);}catch(Throwable $e){if(!wp_next_scheduled('neo_counter_watch_payment',array($order,$txid)))wp_schedule_single_event(time()+120,'neo_counter_watch_payment',array($order,$txid));}},10,2);
add_action('rest_api_init',function(){
    register_rest_route('neo-counter/v1','/invoices/(?P<order_id>[0-9]+)',array('methods'=>'GET','permission_callback'=>function(){return is_user_logged_in();},'callback'=>function($r){$row=neo_counter_invoice((int)$r['order_id']);if(is_wp_error($row))return $row;if(!$row||((int)$row['user_id']!==get_current_user_id()&&!current_user_can('manage_options')))return new WP_Error('not_found','Checkout not found.',array('status'=>404));$response=new WP_REST_Response(array('state'=>$row['state'],'invoice'=>$row['invoice'],'payable'=>false,'delivery'=>'NOT_SENT'));$response->header('Cache-Control','private, no-store');return $response;}));
    register_rest_route('neo-counter/v1','/invoices/(?P<order_id>[0-9]+)/verify',array('methods'=>'POST','permission_callback'=>function(){return current_user_can('manage_options');},'callback'=>function($r){$txid=strtolower((string)$r->get_param('txid'));if(!preg_match('/^[a-f0-9]{64}$/',$txid))return new WP_Error('invalid_txid','Enter a valid transaction ID.',array('status'=>400));try{return neo_counter_verify_order((int)$r['order_id'],$txid);}catch(Throwable $e){return new WP_Error('verification_hold',$e->getMessage(),array('status'=>409));}}));
    register_rest_route('neo-counter/v1','/settlement-status',array('methods'=>'GET','permission_callback'=>'__return_true','callback'=>function(){return array('version'=>'0.18.0','invoiceStorageReady'=>neo_counter_transactional_tables(),'storageConstraintsChecked'=>get_option('neo_counter_settlement_selftest')==='passed-v3','btcVerification'=>'dual-index-exact-payment','requiredConfirmations'=>3,'tokenPaymentVerification'=>'ledger-specific-node-and-bitcoin','inventoryReservationsReady'=>neo_counter_transactional_tables(),'inventoryReservationPolicy'=>'confirmed-payment-hold','automaticDelivery'=>false,'paymentsEnabled'=>false);}));
});

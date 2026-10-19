<?php
defined('ABSPATH') || exit;
function neo_counter_read_inventory($invoice,$height){
    $ledger=$invoice['ledger'];$asset=$invoice['delivery_asset'];$source=$invoice['token_source'];
    if(!in_array($asset,array('PLEDGEBOND','TEMPLEBOND'),true)||!preg_match('/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{26,35}$/',$source))throw new RuntimeException('Invalid bond inventory source.');
    neo_counter_ledger_status($ledger,$height);
    if($ledger==='classic')$rows=neo_counter_classic_rpc('get_balances',array('filters'=>array(array('field'=>'address','op'=>'==','value'=>$source),array('field'=>'asset','op'=>'==','value'=>$asset)),'filterop'=>'AND','limit'=>2));
    else{$r=neo_counter_http('https://api.counterparty.io:4000/v2/addresses/'.$source.'/balances/'.$asset.'?type=address&verbose=true&limit=2');if(!empty($r['next_cursor']))throw new RuntimeException('Inventory response requires review.');$rows=$r['result']??null;}
    if(!is_array($rows)||count($rows)!==1)throw new RuntimeException('Bond balance is unavailable.');$b=$rows[0];
    if(($b['address']??null)!==$source||($b['asset']??null)!==$asset||!empty($b['utxo']))throw new RuntimeException('Bond balance identity mismatch.');
    $div=$ledger==='classic'?($b['divisible']??null):($b['asset_info']['divisible']??null);
    if(!in_array($div,array(true,false,1,0),true))throw new RuntimeException('Bond precision unavailable.');
    neo_counter_ledger_status($ledger,$height);
    return array('ledger'=>$ledger,'source'=>$source,'asset'=>$asset,'available'=>neo_counter_atomic_quantity($b['quantity']??null),'decimals'=>$div?8:0,'height'=>$height,'observed_at'=>time());
}
/** Caller holds invoice lock and owns the transaction. Reservations never auto-expire after payment. */
function neo_counter_reserve_inventory($row,$snapshot){
    global $wpdb;$t=neo_counter_tables();$p=json_decode($row['payload'],true);$now=time();
    foreach(array('ledger'=>'ledger','source'=>'token_source','asset'=>'delivery_asset') as $s=>$i)if(($snapshot[$s]??null)!==$p[$i])return false;
    if(!is_int($snapshot['observed_at']??null)||$snapshot['observed_at']>$now||$snapshot['observed_at']<$now-60||!in_array($snapshot['decimals']??null,array(0,8),true))return false;
    $available=neo_counter_atomic_quantity($snapshot['available']);$qty=$p['delivery_quantity'];
    if(!is_string($qty)||!preg_match('/^[1-9][0-9]{0,8}$/',$qty))return false;
    $needed=(int)$qty*($snapshot['decimals']===8?100000000:1);$key=hash('sha256',$p['ledger'].':'.$p['token_source'].':'.$p['delivery_asset']);
    // INSERT IGNORE creates a shared row; SELECT FOR UPDATE serializes reservations for this source/asset/ledger.
    if($wpdb->query($wpdb->prepare("INSERT IGNORE INTO {$t['stock']} (stock_key,reserved,observed_at) VALUES (%s,0,0)",$key))===false)throw new RuntimeException('Inventory lock unavailable.');
    $stock=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$t['stock']} WHERE stock_key = %s FOR UPDATE",$key),ARRAY_A);
    if(!$stock)throw new RuntimeException('Inventory lock missing.');
    $existing=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$t['reservations']} WHERE invoice_id = %d",$row['id']),ARRAY_A);
    if($existing)return $existing['stock_key']===$key&&(string)$existing['quantity']===(string)$needed;
    if((int)$stock['observed_at']>$snapshot['observed_at']||(int)$stock['reserved']>(int)$available-$needed)return false;
    if(!$wpdb->insert($t['reservations'],array('invoice_id'=>$row['id'],'stock_key'=>$key,'quantity'=>(string)$needed,'state'=>'HELD','created_at'=>$now)))throw new RuntimeException('Bond reservation conflict.');
    if($wpdb->update($t['stock'],array('reserved'=>(string)((int)$stock['reserved']+$needed),'observed_at'=>$snapshot['observed_at']),array('stock_key'=>$key))===false)throw new RuntimeException('Bond reservation could not be saved.');return true;
}

<?php
defined('ABSPATH') || exit;
function neo_counter_assess_btc($invoice,$tx,$chain,$now) {
    if(($invoice['currency_asset']??null)!=='BTC')return array('state'=>'ASSET_VERIFIER_REQUIRED');
    foreach(array('amount_minor','payer','destination','created_at','expires_at','confirmations') as $field)if(!isset($invoice[$field]))throw new InvalidArgumentException('Incomplete invoice');
    if(!is_string($invoice['amount_minor'])||!preg_match('/^[1-9][0-9]{0,15}$/',$invoice['amount_minor'])||!is_int($invoice['created_at'])||!is_int($invoice['expires_at'])||$invoice['expires_at']<=$invoice['created_at']||!is_int($invoice['confirmations'])||$invoice['confirmations']<1)throw new InvalidArgumentException('Invalid invoice');
    if(!isset($tx['txid'])||!preg_match('/^[a-f0-9]{64}$/i',$tx['txid']))throw new InvalidArgumentException('Invalid transaction');
    if(empty($tx['vin'])||empty($tx['vout']))return array('state'=>'NO_MATCH');
    foreach($tx['vin'] as $input)if(($input['prevout']['scriptpubkey_address']??null)!==$invoice['payer'])return array('state'=>'PAYER_MISMATCH');
    $outputs=array();foreach($tx['vout'] as $i=>$output)if(($output['scriptpubkey_address']??null)===$invoice['destination'])$outputs[$i]=$output;
    if(count($outputs)!==1)return array('state'=>'NO_EXACT_PAYMENT');
    $index=array_key_first($outputs);$value=$outputs[$index]['value']??null;
    if(!is_int($value)||(string)$value!==$invoice['amount_minor'])return array('state'=>'NO_EXACT_PAYMENT');
    $result=array('state'=>'PAYMENT_DETECTED','txid'=>strtolower($tx['txid']),'vout'=>$index,'confirmations'=>0);
    if(empty($tx['status']['confirmed']))return $result;
    $s=$tx['status'];
    if(!isset($s['block_height'],$s['block_time'],$s['block_hash'],$chain['height'],$chain['canonical_hash'])||!is_int($s['block_height'])||!is_int($s['block_time'])||!is_int($chain['height'])||$s['block_height']>$chain['height']||!preg_match('/^[a-f0-9]{64}$/i',$s['block_hash']))throw new InvalidArgumentException('Invalid chain observation');
    if($s['block_hash']!==$chain['canonical_hash'])return array_merge($result,array('state'=>'REORG_HOLD'));
    $result['confirmations']=$chain['height']-$s['block_height']+1;$result['block_hash']=$s['block_hash'];$result['block_height']=$s['block_height'];
    if($s['block_time']<$invoice['created_at'])return array_merge($result,array('state'=>'PREEXISTING_PAYMENT_REVIEW'));
    if($s['block_time']>$now+120)return array_merge($result,array('state'=>'CHAIN_TIME_REVIEW'));
    if($s['block_time']>$invoice['expires_at'])return array_merge($result,array('state'=>'LATE_PAYMENT_REVIEW'));
    if($result['confirmations']>=$invoice['confirmations'])$result['state']='PAYMENT_CONFIRMED';
    return $result;
}
function neo_counter_observations_agree($a,$b) {
    if(!isset($a['transaction'],$b['transaction'],$a['chain']['height'],$b['chain']['height']))return false;
    $pick=function($t){$s=$t['status']??array();return array('txid'=>$t['txid']??null,'vin'=>array_map(function($i){return array('txid'=>$i['txid']??null,'vout'=>$i['vout']??null,'address'=>$i['prevout']['scriptpubkey_address']??null,'value'=>$i['prevout']['value']??null);},$t['vin']??array()),'vout'=>array_map(function($o){return array('script'=>$o['scriptpubkey']??null,'address'=>$o['scriptpubkey_address']??null,'value'=>$o['value']??null);},$t['vout']??array()),'status'=>array('confirmed'=>$s['confirmed']??null,'height'=>$s['block_height']??null,'hash'=>$s['block_hash']??null,'time'=>$s['block_time']??null));};
    return $pick($a['transaction'])===$pick($b['transaction'])&&abs($a['chain']['height']-$b['chain']['height'])<=2&&($a['chain']['canonical_hash']??null)===($b['chain']['canonical_hash']??null);
}

<?php
defined('ABSPATH') || exit;
/** Fixed, ledger-specific read-only endpoints. No browser supplied proof or RPC URL. */
function neo_counter_classic_rpc($method,$params=array()){
    if(!in_array($method,array('get_running_info','get_sends','get_balances','get_asset_info','get_blocks'),true))throw new InvalidArgumentException('Unsupported ledger query.');
    $r=wp_remote_post('https://classic-api.tokenscan.io:4001',array('timeout'=>6,'redirection'=>0,'limit_response_size'=>1048576,'headers'=>array('Content-Type'=>'application/json','Authorization'=>'Basic '.base64_encode('rpc:rpc')),'body'=>wp_json_encode(array('jsonrpc'=>'2.0','id'=>1,'method'=>$method,'params'=>(object)$params))));
    if(is_wp_error($r)||wp_remote_retrieve_response_code($r)!==200)throw new RuntimeException('Classic ledger unavailable.');
    $d=json_decode(wp_remote_retrieve_body($r),true,512,JSON_BIGINT_AS_STRING);
    if(!is_array($d)||!empty($d['error'])||!array_key_exists('result',$d))throw new RuntimeException('Invalid Classic ledger response.');return $d['result'];
}
function neo_counter_ledger_status($ledger,$bitcoin_height){
    if($ledger==='classic'){
        $r=neo_counter_classic_rpc('get_running_info');
        if(($r['server_ready']??false)!==true||($r['db_caught_up']??false)!==true||($r['running_testnet']??true)!==false||($r['running_regtest']??true)!==false||($r['running_testcoin']??true)!==false)throw new RuntimeException('Classic ledger is not ready on mainnet.');
        $height=$r['last_block']['block_index']??null;
    }elseif($ledger==='cp20'){
        $r=neo_counter_http('https://api.counterparty.io:4000/v2/')['result']??array();
        if(($r['server_ready']??false)!==true||($r['network']??null)!=='mainnet'||($r['ledger_state']??null)!=='Following')throw new RuntimeException('Counterparty 2.0 ledger is not ready on mainnet.');
        $height=$r['counterparty_height']??null;
    }else throw new RuntimeException('Select a supported Counterparty ledger.');
    if(!is_int($height)||$height<$bitcoin_height||$height>$bitcoin_height+2)throw new RuntimeException('Token ledger has not caught up with Bitcoin.');return $height;
}
function neo_counter_read_token($invoice,$txid){
    $o=neo_counter_read_btc($txid);$ledger=$invoice['ledger'];$h=neo_counter_ledger_status($ledger,$o['chain']['height']);
    if($ledger==='classic')$s=neo_counter_classic_rpc('get_sends',array('filters'=>array(array('field'=>'tx_hash','op'=>'==','value'=>strtolower($txid))),'limit'=>101));
    else{$r=neo_counter_http('https://api.counterparty.io:4000/v2/transactions/'.strtolower($txid).'/sends?limit=100');if(!empty($r['next_cursor']))throw new RuntimeException('Complex token transaction requires review.');$s=$r['result']??null;}
    if(!is_array($s)||count($s)>100)throw new RuntimeException('Invalid token send response.');
    // Recheck parser readiness after the read; canonical Bitcoin confirmation is assessed below.
    neo_counter_ledger_status($ledger,$o['chain']['height']);
    $block_hash=null;
    if(!empty($o['transaction']['status']['confirmed'])){
        $index=$o['transaction']['status']['block_height'];
        if($ledger==='classic'){$blocks=neo_counter_classic_rpc('get_blocks',array('block_indexes'=>array($index)));$block_hash=$blocks[0]['block_hash']??null;}
        else{$block=neo_counter_http('https://api.counterparty.io:4000/v2/blocks/'.$index);$block_hash=$block['result']['block_hash']??null;}
        if(!is_string($block_hash)||$block_hash!==$o['chain']['canonical_hash'])throw new RuntimeException('Token ledger block differs from Bitcoin; payment held.');
    }
    $o['token']=array('ledger'=>$ledger,'height'=>$h,'block_hash'=>$block_hash,'sends'=>$s);return $o;
}
function neo_counter_atomic_quantity($value){
    if(is_int($value))$value=(string)$value;
    if(!is_string($value)||!preg_match('/^(0|[1-9][0-9]{0,17})$/',$value))throw new RuntimeException('Invalid atomic token quantity.');return $value;
}
function neo_counter_assess_token($invoice,$observed,$now){
    $tx=$observed['transaction'];$chain=$observed['chain'];$token=$observed['token']??array();
    if(($invoice['currency_asset']??'BTC')==='BTC')throw new InvalidArgumentException('Token assessment requires a token invoice.');
    if(($token['ledger']??null)!==($invoice['ledger']??null))return array('state'=>'LEDGER_MISMATCH');
    if(!is_int($token['height']??null)||$token['height']<$chain['height'])return array('state'=>'LEDGER_BEHIND');
    $sends=$token['sends']??array();$matching=array();
    foreach($sends as $s){
        if(($s['tx_hash']??null)!==strtolower($tx['txid']))return array('state'=>'TOKEN_TX_MISMATCH');
        if(($s['status']??null)!=='valid')return array('state'=>'INVALID_TOKEN_SEND');
        if(isset($s['send_type'])&&$s['send_type']!=='send')return array('state'=>'TOKEN_SEND_TYPE_REVIEW');
        if(($s['destination']??null)===$invoice['destination'])$matching[]=$s;
    }
    if(count($matching)!==1)return array('state'=>'NO_EXACT_TOKEN_PAYMENT');$s=$matching[0];
    if(($s['source']??null)!==$invoice['payer'])return array('state'=>'PAYER_MISMATCH');
    if(($s['asset']??null)!==$invoice['currency_asset']||neo_counter_atomic_quantity($s['quantity']??null)!==$invoice['amount_minor'])return array('state'=>'NO_EXACT_TOKEN_PAYMENT');
    if(empty($tx['status']['confirmed']))return array('state'=>'TOKEN_UNCONFIRMED');
    if(($token['block_hash']??null)!==($chain['canonical_hash']??null))return array('state'=>'TOKEN_CHAIN_MISMATCH');
    if(($s['block_index']??null)!==($tx['status']['block_height']??null))return array('state'=>'TOKEN_BLOCK_MISMATCH');
    // Reuse timing and canonical-chain rules without treating dust as the payment amount.
    $btc=$invoice;$btc['currency_asset']='BTC';$btc['amount_minor']='1';$copy=$tx;
    $copy['vin']=array(array('prevout'=>array('scriptpubkey_address'=>$invoice['payer'])));
    $copy['vout']=array(array('scriptpubkey_address'=>$invoice['destination'],'value'=>1));
    $a=neo_counter_assess_btc($btc,$copy,$chain,$now);$a['asset']=$s['asset'];$a['amount_minor']=$invoice['amount_minor'];$a['ledger']=$invoice['ledger'];return $a;
}

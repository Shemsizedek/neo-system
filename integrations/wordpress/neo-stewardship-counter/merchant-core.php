<?php
defined('ABSPATH') || exit;
/** One payment verifier; different obligations after payment. No external effects here. */
function neo_counter_order_kind($invoice){
    $kind=$invoice['order_kind']??'token_sale';
    if(!in_array($kind,array('token_sale','digital_goods','physical_goods','service_bill'),true))throw new InvalidArgumentException('Unknown order type.');return $kind;
}
function neo_counter_fulfillment_plan($invoice,$assessment,$reserved=false){
    $kind=neo_counter_order_kind($invoice);$s=$assessment['state']??'';
    if($s!=='PAYMENT_CONFIRMED')return array('invoice_state'=>'PAYMENT_REVIEW_REQUIRED','job_state'=>'HOLD_PAYMENT_REVIEW','kind'=>$kind);
    // Draft checkout is never promoted to a payable order by a callback or chain observation.
    if(($invoice['payable']??false)!==true)return array('invoice_state'=>'PAYMENT_REVIEW_REQUIRED','job_state'=>$kind==='token_sale'?($reserved?'HOLD_TREASURY_SETUP':'HOLD_INVENTORY'):'HOLD_ACTIVATION','kind'=>$kind);
    if(($invoice['terms_accepted']??false)!==true)return array('invoice_state'=>'PAYMENT_REVIEW_REQUIRED','job_state'=>'HOLD_MEMBER_ACCEPTANCE','kind'=>$kind);
    switch($kind){
        case 'token_sale':return array('invoice_state'=>'PAYMENT_CONFIRMED','job_state'=>$reserved?'HOLD_TREASURY_SETUP':'HOLD_INVENTORY','kind'=>$kind);
        case 'digital_goods':return array('invoice_state'=>'PAYMENT_CONFIRMED','job_state'=>'HOLD_DIGITAL_DELIVERY_SETUP','kind'=>$kind);
        case 'physical_goods':return array('invoice_state'=>'PAYMENT_CONFIRMED','job_state'=>'PAID_AWAITING_SHIPMENT','kind'=>$kind);
        case 'service_bill':return array('invoice_state'=>'PAYMENT_CONFIRMED','job_state'=>'BILL_PAID','kind'=>$kind);
    }
}
function neo_counter_merchant_price_to_minor($price){
    if(!is_string($price)||!preg_match('/^(0|[1-9][0-9]{0,6})(?:\.([0-9]{1,8}))?$/',$price,$m))throw new InvalidArgumentException('Enter a price with up to eight decimal places.');
    $minor=ltrim($m[1].str_pad($m[2]??'',8,'0'),'0');if($minor==='')throw new InvalidArgumentException('The price must be greater than zero.');return $minor;
}
function neo_counter_merchant_amount($base){
    if(!is_string($base)||!preg_match('/^[1-9][0-9]{0,14}$/',$base))throw new InvalidArgumentException('Enter a positive price in atomic units, up to 15 digits.');
    $n=(int)$base;return (string)(intdiv($n,100)*109+intdiv(($n%100)*109+99,100));
}
/** Tokenworks capability negotiation: descriptive plans never unlock/sign/broadcast funds. */
function neo_counter_tokenworks_plan($invoice,$mode='merchant_inventory'){
    $kind=neo_counter_order_kind($invoice);
    if(!in_array($invoice['ledger']??null,array('classic','cp20'),true))throw new InvalidArgumentException('Choose a supported ledger.');
    if(!in_array($mode,array('merchant_inventory','dex_order','utxo_atomic_swap'),true))throw new InvalidArgumentException('Unknown settlement method.');
    if($kind!=='token_sale'&&$mode!=='merchant_inventory')throw new InvalidArgumentException('Token exchange cannot prove delivery of goods or services.');
    if($mode==='utxo_atomic_swap'&&($invoice['ledger']??null)!=='cp20')throw new InvalidArgumentException('UTXO atomic-swap adapter is not supported for Classic.');
    return array('version'=>1,'orderKind'=>$kind,'mode'=>$mode,'ledger'=>$invoice['ledger']??null,
        'custody'=>$kind!=='token_sale'?'merchant_collection':($mode==='merchant_inventory'?'merchant_wallet':($mode==='dex_order'?'protocol_escrow':'utxo_offer')),
        'onChainEscrowVerified'=>false,'adapterConnected'=>false,'canExecute'=>false,
        'requiredEvidence'=>$mode==='dex_order'?array('escrow_order','exact_match','settlement','expiry_or_cancel'):($mode==='utxo_atomic_swap'?array('asset_utxo','signed_offer','exact_outputs','confirmed_swap'):array('confirmed_payment', $kind==='token_sale'?'funded_inventory_and_signer':'fulfillment_adapter')));
}

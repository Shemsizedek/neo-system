<?php
defined('ABSPATH') || exit;
function neo_counter_retail_currency($entry){
    $out=array_intersect_key($entry,array_flip(array('id','symbol','name','counterpartyAsset','enabledForCollection')));$out['verification']=array();
    foreach(array('classic','cp20') as $ledger){$v=$entry['verification'][$ledger]??array();$out['verification'][$ledger]=array_intersect_key($v,array_flip(array('divisible')));$out['verification'][$ledger]['status']=in_array($v['status']??'',array('native_asset','treasury_asset_verified'),true)?'asset_verified':'verification_pending';}
    return $out;
}
function neo_counter_retail_references($references){
    $out=array();$keys=array_flip(array('ledger','currency','currencyAsset','currencyId','currencyDecimals','unitPriceMinor','conversion','feeAllowanceMinor','spreadBps','processorFeeBps','roundingMinor','source','referenceId','observedAt','expiresAt','valuationDay'));
    foreach($references as $asset=>$r)if(in_array($asset,array('TEMPLEBOND','PLEDGEBOND'),true)&&is_array($r))$out[$asset]=array_intersect_key($r,$keys);return $out;
}
function neo_counter_retail_invoice($invoice){return array_intersect_key($invoice,array_flip(array('version','order_id','order_kind','item_reference','currency_asset','currency_id','currency_symbol','currency_decimals','amount_minor','base_minor','markup_bps','ledger','payer','destination','created_at','expires_at','confirmations','terms_hash','terms_snapshot','terms_accepted','payable','delivery_asset','delivery_quantity','delivery_wallet')));}
function neo_counter_display_amount($minor,$currency,$decimals=8){
    if(!is_string($minor)||!ctype_digit($minor)||!in_array($decimals,array(0,8),true))return '—';
    if($decimals===0)return $minor.' '.$currency;$s=str_pad($minor,9,'0',STR_PAD_LEFT);return substr($s,0,-8).'.'.substr($s,-8).' '.$currency;
}

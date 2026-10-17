<?php
// Offline WP adapter harness; no network, keys, orders or funds.
define('ABSPATH',__DIR__);
$options=array();$transients=array();$calls=0;$bad_owner=false;$unavailable=false;$dex_case='recent';
function add_action(...$args) {}
function get_option($key){global $options;return isset($options[$key])?$options[$key]:false;}
function update_option($key,$value,$autoload=false){global $options;$options[$key]=$value;}
function get_transient($key){global $transients;return isset($transients[$key])?$transients[$key]:false;}
function set_transient($key,$value,$ttl){global $transients;$transients[$key]=$value;}
function wp_json_encode($value){return json_encode($value);}
function is_wp_error($value){return false;}
function wp_remote_retrieve_response_code($value){return $value['code'];}
function wp_remote_retrieve_body($value){return $value['body'];}
function wp_remote_get($url,$args){global $calls,$bad_owner,$unavailable,$dex_case;$calls++;
if (strpos($url,'api.xcpdex.com')!==false) {
 $a=explode('/',parse_url($url,PHP_URL_PATH));
 return array('code'=>200,'body'=>json_encode(array('asset'=>$dex_case==='wrong'?'OTHER':$a[2],'trades'=>array(array('quote_asset'=>$dex_case==='xcp'?'XCP':'BTC','price'=>$dex_case==='xcp'?1:0.00000002,'amount'=>1,'block_time'=>time()-($dex_case==='stale'?90000:10),'tx_hash'=>str_repeat('a',64))))));
}
$asset=basename($url);return array('code'=>$unavailable?503:200,'body'=>json_encode(array('asset'=>$asset,'owner'=>$bad_owner?'wrong':($asset==='NOMNI'?'18FyntJG9hdXYvanm67mGgbyo1P7adckvg':'1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'),'issuer'=>'fixture','divisible'=>$asset!=='NOMNI','market_info'=>array('btc'=>array('price'=>$asset==='NOMNI'?'0.00077041':'0.00059442')))));}
function check($yes,$message){if(!$yes)throw new Exception($message);}
require __DIR__.'/currencies.php';require __DIR__.'/market.php';
$refs=neo_stewardship_market_references('cp20','nmni');check(count($refs)===2,'Both bonds priced');check($calls===3,'Three public-index reads');
check(neo_stewardship_price_order($refs['TEMPLEBOND'],'1')['totalMinor']==='1','Indivisible conversion');
check(neo_stewardship_price_order($refs['TEMPLEBOND'],'10')['totalMinor']==='9','Quantity uses rational cross rate before rounding');
neo_stewardship_market_references('cp20','nmni');check($calls===3,'Daily cache reused');
$btc=neo_stewardship_market_references('cp20','btc');check(neo_stewardship_price_order($btc['TEMPLEBOND'],'1')['totalMinor']==='64792','Exactly 9% and one-satoshi rounding');
check(neo_stewardship_price_order($btc['TEMPLEBOND'],'999999')===false,'10 BTC limit');
check(neo_stewardship_market_references('cp20','svc')===array(),'Unmapped currency cannot inherit BTC');
$bad_owner=true;check(neo_stewardship_market_references('classic','nmni')===array(),'Ownership is ledger-specific');
$bad_owner=false;$unavailable=true;$key='neo_daily_v1_cp20_nomni';$options[$key]['day']='2000-01-01';check(neo_stewardship_market_references('cp20','nmni')===array(),'Old daily rate cannot be reused after outage');
$unavailable=false;
check(neo_stewardship_dex_reference('MOORCASH')['priceSats']==='2','Recent direct BTC fallback');
$dex_case='xcp';check(neo_stewardship_dex_reference('MOORCASH')['priceSats']==='59442','Recent XCP trade cross rate');
$dex_case='stale';check(neo_stewardship_dex_reference('MOORCASH')===false,'Historical trade cannot supply current fallback');
$dex_case='wrong';check(neo_stewardship_dex_reference('MOORCASH')===false,'Wrong asset cannot supply fallback');
echo "PASS: daily caching, cross-currency quotes, 9% fee, ownership, no stale/BTC fallback, bounds\n";

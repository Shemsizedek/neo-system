<?php
defined('ABSPATH') || exit;
define('NEO_STEWARDSHIP_MARKUP_BPS', 900);
function neo_stewardship_market_host($ledger) {
    $hosts = array('classic'=>'https://classic.tokenscan.io','cp20'=>'https://cp20.tokenscan.io');
    return isset($hosts[$ledger]) ? $hosts[$ledger] : '';
}
function neo_stewardship_btc_sats($price) {
    if (!is_string($price) || !preg_match('/^([0-9]{1,6})[.]([0-9]{1,8})$/',$price,$parts)) return false;
    $sats=(int)$parts[1]*100000000+(int)str_pad($parts[2],8,'0');
    return $sats>0 && $sats<=10000000000000 ? $sats : false;
}
/** Fallback: latest direct-BTC execution within 24 hours on the CP2 index. */
function neo_stewardship_dex_reference($asset) {
    $url='https://api.xcpdex.com/asset/'.rawurlencode($asset).'/trades?limit=100';
    $r=wp_remote_get($url,array('timeout'=>6,'redirection'=>0,'limit_response_size'=>131072));
    if (is_wp_error($r) || wp_remote_retrieve_response_code($r)!==200) return false;
    $d=json_decode(wp_remote_retrieve_body($r),true);
    if (!is_array($d) || !isset($d['asset'],$d['trades']) || $d['asset']!==$asset || !is_array($d['trades'])) return false;
    foreach (array_slice($d['trades'],0,100) as $t) {
        if (!isset($t['quote_asset'],$t['price'],$t['block_time'],$t['tx_hash'],$t['amount']) || !in_array($t['quote_asset'],array('BTC','XCP'),true) || !is_numeric($t['price']) || !is_numeric($t['amount']) || $t['amount']<=0 || !is_numeric($t['block_time']) || $t['block_time']<time()-86400 || $t['block_time']>time() || !preg_match('/^[a-f0-9]{64}$/i',$t['tx_hash'])) continue;
        // The upstream API publishes a JSON number; the local rate is quantized to 1 sat/BTC-unit.
        $btc_price=(float)$t['price'];
        if ($t['quote_asset']==='XCP') {
            if ($asset==='XCP') continue;
            $xcp=neo_stewardship_daily_market('cp20','XCP');
            if (!$xcp) continue;
            $btc_price*=(int)$xcp['priceSats']/100000000;
        }
        $price=number_format($btc_price,8,'.','');$sats=neo_stewardship_btc_sats($price);
        if ($sats) return array('priceSats'=>(string)$sats,'source'=>$url,'tradeAt'=>(int)$t['block_time']*1000,'txid'=>$t['tx_hash']);
    }
    return false;
}
/** Daily retrieval snapshot. The public index does not supply a last-trade timestamp. */
function neo_stewardship_daily_market($ledger, $asset, $expected_owner = '') {
    $host = neo_stewardship_market_host($ledger);
    if (!$host || !preg_match('/^[A-Z][A-Z0-9.]{0,99}$/', $asset)) return false;
    $key = 'neo_daily_v1_' . $ledger . '_' . strtolower($asset);
    $day = gmdate('Y-m-d');
    $cached = get_option($key);
    if (is_array($cached) && isset($cached['day'],$cached['owner']) && $cached['day'] === $day && (!$expected_owner || $cached['owner'] === $expected_owner)) return $cached;
    // Avoid hammering an unavailable index. A previous day's price is never substituted.
    if (get_transient($key . '_failed')) return false;
    if ($asset === 'BTC') return array('asset'=>'BTC','owner'=>'','priceSats'=>'100000000','divisible'=>true,'day'=>$day,'retrievedAt'=>time()*1000,'source'=>'bitcoin:unit');
    $url = $host . '/api/asset/' . rawurlencode($asset);
    $response = wp_remote_get($url,array('timeout'=>6,'redirection'=>0,'limit_response_size'=>65536));
    $data = !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200 ? json_decode(wp_remote_retrieve_body($response),true) : false;
    $owner = is_array($data) && isset($data['owner']) ? $data['owner'] : '';
    $price = is_array($data) && isset($data['market_info']['btc']['price']) ? $data['market_info']['btc']['price'] : '';
    if (!is_array($data) || !isset($data['asset'],$data['divisible']) || $data['asset'] !== $asset || !is_bool($data['divisible']) ||
        ($expected_owner && $owner !== $expected_owner)) {
        set_transient($key . '_failed',1,300);return false;
    }
    $sats=neo_stewardship_btc_sats($price);$dex=false;
    if (!$sats && $ledger==='cp20') $dex=neo_stewardship_dex_reference($asset);
    if ($dex) $sats=(int)$dex['priceSats'];
    if (!$sats) {set_transient($key . '_failed',1,300);return false;}
    $snapshot = array('asset'=>$asset,'owner'=>$owner,'issuer'=>isset($data['issuer'])?$data['issuer']:'','priceSats'=>(string)$sats,
        'divisible'=>$data['divisible'],'day'=>$day,'retrievedAt'=>time()*1000,'source'=>$dex?$dex['source']:$url,'identitySource'=>$url,'upstreamTradeTimeKnown'=>(bool)$dex,'tradeAt'=>$dex?$dex['tradeAt']:null,'tradeTxid'=>$dex?$dex['txid']:null);
    update_option($key,$snapshot,false);
    return $snapshot;
}
function neo_stewardship_currency_by_id($id) {
    foreach (neo_stewardship_currency_catalog() as $entry) if ($entry['id'] === $id) return $entry;
    return false;
}
function neo_stewardship_market_references($ledger = '', $currency_id = 'btc') {
    $entry = neo_stewardship_currency_by_id($currency_id);
    if (!$entry || empty($entry['counterpartyAsset'])) return array();
    $currency = neo_stewardship_daily_market($ledger,$entry['counterpartyAsset'],isset($entry['expectedOwner'])?$entry['expectedOwner']:'');
    if (!$currency) return array();
    $references = array();
    foreach (array('TEMPLEBOND','PLEDGEBOND') as $asset) {
        $bond = neo_stewardship_daily_market($ledger,$asset,'1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8');
        if (!$bond || $bond['day'] !== $currency['day'] || (int)$bond['priceSats']>1000000000) continue;
        $scale=$currency['divisible']?100000000:1;
        $unit=intdiv((int)$bond['priceSats']*$scale+(int)$currency['priceSats']-1,(int)$currency['priceSats']);
        $now = time()*1000;
        $references[$asset] = array('ledger'=>$ledger,'currency'=>$entry['symbol'],'currencyAsset'=>$entry['counterpartyAsset'],
            'currencyId'=>$entry['id'],'currencyDecimals'=>$currency['divisible']?8:0,
            'unitPriceMinor'=>(string)$unit,'conversion'=>array('bondPriceSats'=>$bond['priceSats'],'currencyPriceSats'=>$currency['priceSats'],'scale'=>$currency['divisible']?'100000000':'1'),
            'feeAllowanceMinor'=>'0','spreadBps'=>'900','processorFeeBps'=>'0','roundingMinor'=>'1',
            'source'=>$bond['source'],'referenceId'=>hash('sha256',wp_json_encode(array($bond,$currency,'markupBps'=>900))),
            'observedAt'=>$now,'expiresAt'=>min($now+300000,strtotime('tomorrow UTC')*1000),
            'valuationDay'=>$bond['day'],'bondMarket'=>$bond,'currencyMarket'=>$currency,'referenceType'=>'daily_public_index','upstreamTradeTimeKnown'=>false);
    }
    return $references;
}
/** Bounded integer arithmetic, matching the browser's rational BigInt quote. */
function neo_stewardship_price_order($ref,$quantity) {
    $q = (int)$quantity;
    if ($q < 1 || $q > 999999 || empty($ref['conversion'])) return false;
    $c = $ref['conversion'];
    foreach (array('bondPriceSats','currencyPriceSats','scale') as $key) if (!isset($c[$key]) || !is_string($c[$key]) || !ctype_digit($c[$key])) return false;
    $bond = (int)$c['bondPriceSats'];$currency = (int)$c['currencyPriceSats'];$scale = (int)$c['scale'];
    if ($bond < 1 || $bond > 1000000000 || $currency < 1 || $currency > 10000000000000 || !in_array($scale,array(1,100000000),true)) return false;
    $btc_base = $bond*$q;
    if ($btc_base > 1000000000) return false;
    $numerator = $btc_base*$scale;$denominator = $currency*100;
    // Split quotient and remainder before multiplication to stay within signed 64-bit integers.
    $whole = intdiv($numerator,$denominator);$remainder = $numerator%$denominator;
    $total = $whole*109 + intdiv($remainder*109 + $denominator-1,$denominator);
    return array('marketSubtotalMinor'=>(string)intdiv($numerator,$currency),'totalMinor'=>(string)$total,'markupBps'=>'900','currencyDecimals'=>$ref['currencyDecimals']);
}
add_action('neo_stewardship_daily_refresh',function(){
    $assets = array('TEMPLEBOND'=>'1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8','PLEDGEBOND'=>'1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8');
    foreach (neo_stewardship_currency_catalog() as $entry) if (!empty($entry['counterpartyAsset'])) $assets[$entry['counterpartyAsset']] = isset($entry['expectedOwner'])?$entry['expectedOwner']:'';
    $offset=0;
    foreach (array('classic','cp20') as $ledger) foreach ($assets as $asset=>$owner) {
        $args=array($ledger,$asset,$owner);
        if (!wp_next_scheduled('neo_stewardship_refresh_asset',$args)) wp_schedule_single_event(time()+$offset,'neo_stewardship_refresh_asset',$args);
        $offset+=15;
    }
});
add_action('neo_stewardship_refresh_asset','neo_stewardship_daily_market',10,3);
add_action('init',function(){if (!wp_next_scheduled('neo_stewardship_daily_refresh')) wp_schedule_event(time()+30,'daily','neo_stewardship_daily_refresh');});

add_action('rest_api_init',function(){
    register_rest_route('neo-counter/v1','/rates',array('methods'=>'GET','permission_callback'=>'__return_true','callback'=>function($request){
        $ledger=sanitize_key((string)$request->get_param('ledger'));$currency=sanitize_key((string)$request->get_param('currency'));
        if (!neo_stewardship_market_host($ledger) || !neo_stewardship_currency_by_id($currency)) return new WP_Error('invalid_market','Unknown wallet version or currency.',array('status'=>400));
        $response=new WP_REST_Response(array('references'=>neo_counter_retail_references(neo_stewardship_market_references($ledger,$currency)),'markupBps'=>900,'valuationDay'=>gmdate('Y-m-d')));
        $response->header('Cache-Control','no-store, max-age=0');return $response;
    }));
});

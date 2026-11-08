<?php
require __DIR__.'/merchant.test.php';
function add_shortcode($name,$callback){global $shortcodes;$shortcodes[$name]=$callback;}
function shortcode_atts($defaults,$input){return array_merge($defaults,$input);}
function absint($value){return abs((int)$value);}
function plugins_url($path,$file){return 'https://example.test/plugins/'.$path;}
function rest_url($path){return 'https://example.test/wp-json/'.$path;}
function wp_create_nonce($action){return 'synthetic-nonce';}
function wp_enqueue_style(...$args){}
require __DIR__.'/merchant-checkout.php';
$render=$shortcodes['neo_counter_checkout'];
$uid=99;$admin=false;$html=$render(array('order_id'=>$vendor_order));
check(strpos($html,'data-neo-merchant-checkout')!==false&&strpos($html,'"payable":false')!==false,'Customer checkout renders but cannot activate the invoice');
check(strpos($html,'Example vendor')!==false&&strpos($html,'1BoatSLRHtKNngkdXEeobR76b53LETtpyT')!==false,'Customer sees authoritative merchant and destination');
$uid=7;check(strpos($render(array('order_id'=>$vendor_order)),'data-neo-merchant-checkout')===false,'Other customer cannot view invoice');
$uid=0;check(strpos($render(array('order_id'=>$vendor_order)),'Sign in')!==false,'Anonymous access does not disclose invoice');
$uid=7;$admin=true;$unsafe=$input;$unsafe['merchant_name']='</script><script>alert(1)</script>';
$unsafe_order=neo_counter_prepare_merchant($unsafe,request_key(152));
$html=$render(array('order_id'=>$unsafe_order));
check(strpos($html,'</script><script>alert')===false&&strpos($html,'\\u003C')!==false,'Script-bound invoice text is safely JSON-escaped');
echo "PASS: simple checkout shortcode ownership, unchanged activation hold, authoritative destination and JSON escaping\n";

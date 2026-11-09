<?php
require __DIR__.'/merchant.test.php';
function add_shortcode($name,$callback){global $shortcodes;$shortcodes[$name]=$callback;}
function shortcode_atts($defaults,$input){return array_merge($defaults,$input);}
function absint($value){return abs((int)$value);}
function plugins_url($path,$file){return 'https://example.test/plugins/'.$path;}
function rest_url($path){return 'https://example.test/wp-json/'.$path;}
function wp_create_nonce($action){return 'synthetic-nonce';}
function wp_login_url($redirect){return 'https://example.test/wp-login.php?redirect_to='.rawurlencode($redirect);}
function wp_enqueue_style(...$args){}
class WP_Post {public $post_content='';}
function get_queried_object(){global $queried;return $queried;}
function is_singular(){global $singular;return $singular;}
function has_shortcode($content,$tag){return strpos($content,'['.$tag.']')!==false;}
function wp_dequeue_script($handle){global $dequeued;$dequeued[]=$handle;}
require __DIR__.'/merchant-checkout.php';
$guard=end($actions['wp_enqueue_scripts']);
$queried=new WP_Post();$singular=true;$dequeued=array();
$queried->post_content='[neo_counter_checkout]';$guard();
check($dequeued===array('neo-temple-suite'),'Checkout suppresses only the welcome Suite script');
$dequeued=array();$queried->post_content='[neo_temple_dashboard]';$guard();
check(!$dequeued,'Unrelated Temple pages retain the welcome Suite');
$queried->post_content='[neo_counter_checkout]';$singular=false;$guard();
check(!$dequeued,'Archive content cannot suppress the Suite');
$singular=true;$queried=null;$guard();check(!$dequeued,'Missing queried post is safe');
$render=$shortcodes['neo_counter_checkout'];
$uid=99;$admin=false;$html=$render(array('order_id'=>$vendor_order));
check(strpos($html,'data-neo-merchant-checkout')!==false&&strpos($html,'"payable":false')!==false,'Customer checkout renders but cannot activate the invoice');
check(strpos($html,'Example vendor')!==false&&strpos($html,'1BoatSLRHtKNngkdXEeobR76b53LETtpyT')!==false,'Customer sees authoritative merchant and destination');
$uid=7;check(strpos($render(array('order_id'=>$vendor_order)),'data-neo-merchant-checkout')===false,'Other customer cannot view invoice');
$uid=0;check(strpos($render(array('order_id'=>$vendor_order)),'Sign in')!==false,'Anonymous access does not disclose invoice');
$uid=99;$_GET['neo_order']=(string)$vendor_order;check(strpos($render(array()),'Example vendor')!==false,'Authenticated owner can open the merchant order link');
$_GET['neo_order']=array('invalid');check(strpos($render(array()),'checkout link')!==false,'Malformed order pointer never becomes invoice data');unset($_GET['neo_order']);
$uid=7;$admin=true;$unsafe=$input;$unsafe['merchant_name']='</script><script>alert(1)</script>';
$unsafe_order=neo_counter_prepare_merchant($unsafe,request_key(152));
$html=$render(array('order_id'=>$unsafe_order));
check(strpos($html,'</script><script>alert')===false&&strpos($html,'\\u003C')!==false,'Script-bound invoice text is safely JSON-escaped');
echo "PASS: simple checkout shortcode ownership, unchanged activation hold, authoritative destination and JSON escaping\n";

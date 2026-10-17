<?php
defined('ABSPATH') || exit;
// User-confirmed on 2026-10-17. This is a public address, never signing material.
define('NEO_STEWARDSHIP_TREASURY', '1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8');
add_action('init', function () {
    register_post_type('neo_steward_order', array('label'=>'NEO Stewardship Checkouts',
        'public'=>false, 'show_ui'=>true, 'show_in_rest'=>false, 'supports'=>array('title'),
        'capabilities'=>array('edit_posts'=>'manage_options','edit_others_posts'=>'manage_options',
            'publish_posts'=>'manage_options','read_private_posts'=>'manage_options',
            'delete_posts'=>'manage_options','create_posts'=>'do_not_allow'), 'map_meta_cap'=>true));
});
/** Validate legacy mainnet P2PKH wallet addresses including Base58Check checksum. */
function neo_stewardship_wallet_valid($address) {
    if (!is_string($address) || !preg_match('/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/', $address)) return false;
    $alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    $bytes = array(0);
    foreach (str_split($address) as $char) {
        $carry = strpos($alphabet, $char);
        if ($carry === false) return false;
        for ($i=0; $i<count($bytes); $i++) {
            $carry += $bytes[$i] * 58;
            $bytes[$i] = $carry & 255;
            $carry >>= 8;
        }
        while ($carry > 0) { $bytes[] = $carry & 255; $carry >>= 8; }
    }
    $raw = '';
    foreach (array_reverse($bytes) as $byte) $raw .= chr($byte);
    for ($i=0; $i<strlen($address) && $address[$i] === '1'; $i++) $raw = chr(0) . $raw;
    if (strlen($raw) !== 25 || ord($raw[0]) !== 0) return false;
    $body = substr($raw,0,21);
    return hash_equals(substr(hash('sha256', hash('sha256',$body,true),true),0,4), substr($raw,21));
}
function neo_stewardship_indenture_snapshot() {
    $page = get_page_by_path('holy-stewardship');
    if (!$page) return '';
    foreach (parse_blocks($page->post_content) as $block) {
        if ($block['blockName'] === 'core/details' && strpos($block['innerHTML'],'The Indenture') !== false) {
            return serialize_block($block);
        }
    }
    return '';
}
add_action('admin_post_neo_stewardship_prepare', function () {
    if (!is_user_logged_in()) wp_die('Sign in required.', '', array('response'=>403));
    check_admin_referer('neo_stewardship_prepare');
    if (!neo_stewardship_form144_received()) wp_die('Upload completed Form 144 first.', '', array('response'=>403));
    $ledger = isset($_POST['ledger']) && is_string($_POST['ledger']) ? sanitize_key($_POST['ledger']) : '';
    if (!in_array($ledger,array('classic','cp20'),true)) wp_die('Select a supported Counterparty ledger.', '', array('response'=>400));
    $currency = isset($_POST['currency']) && is_string($_POST['currency']) ? sanitize_key($_POST['currency']) : '';
    if ($currency !== 'btc') wp_die('This currency does not have a verified payment route. No substitution is permitted.', '', array('response'=>409));
    $asset = isset($_POST['asset']) ? sanitize_text_field(wp_unslash($_POST['asset'])) : '';
    $wallet = isset($_POST['wallet']) ? trim(wp_unslash($_POST['wallet'])) : '';
    $qty = isset($_POST['quantity']) && is_string($_POST['quantity']) ? $_POST['quantity'] : '';
    if (!in_array($asset,array('TEMPLEBOND','PLEDGEBOND'),true) || !preg_match('/^[1-9][0-9]{0,5}$/',$qty) ||
        !neo_stewardship_wallet_valid($wallet) || !isset($_POST['accept_indent'])) {
        wp_die('Select a bond, a positive whole quantity, a valid mainnet legacy wallet and acknowledge the Indenture.', '', array('response'=>400));
    }
    $terms = neo_stewardship_indenture_snapshot();
    $expected = isset($_POST['terms_hash']) ? sanitize_text_field(wp_unslash($_POST['terms_hash'])) : '';
    if (!$terms || !hash_equals(hash('sha256',$terms), $expected)) {
        wp_die('The Indenture changed. Reload and review its current version.', '', array('response'=>409));
    }
    $refs = neo_stewardship_market_references($ledger);
    if (!isset($refs[$asset]) || $refs[$asset]['expiresAt'] <= time()*1000) {
        wp_die('Market reference unavailable. Refresh and retry.', '', array('response'=>503));
    }
    $ref = $refs[$asset];
    $base = (int) $ref['unitPriceMinor'] * (int) $qty;
    if (!is_int($base) || $base <= 0 || $base > 1000000000) {
        wp_die('Prepared checkout exceeds the 10 BTC reference limit.', '', array('response'=>400));
    }
    $spread = intdiv($base*200 + 9999, 10000);
    $total = intdiv($base + $spread + 2000 + 999, 1000)*1000;
    $id = wp_insert_post(array('post_type'=>'neo_steward_order','post_status'=>'private',
        'post_author'=>get_current_user_id(),'post_title'=>'Prepared checkout — ' . $asset . ' — ' . gmdate('Y-m-d H:i:s')), true);
    if (is_wp_error($id) || !$id) wp_die('Checkout record could not be saved.', '', array('response'=>500));
    $record = array('state'=>'PREPARED_NOT_PAYABLE','payment_currency'=>'BTC','payment_network'=>'bitcoin-mainnet','asset'=>$asset,'quantity'=>$qty,
        'delivery_wallet'=>$wallet,'treasury_address'=>NEO_STEWARDSHIP_TREASURY,
        'token_source_address'=>NEO_STEWARDSHIP_TREASURY,'signing_wallet'=>'Freewallet',
        'signing_status'=>'CONNECTION_REQUIRED','counterparty_ledger'=>$ledger,
        'total_sats'=>(string)$total,'market_reference'=>$ref,
        'terms_sha256'=>hash('sha256',$terms),'terms_snapshot'=>$terms,
        'acknowledged_at'=>gmdate('c'),'payment_status'=>'NOT_REQUESTED',
        'token_delivery'=>'NOT_STARTED','note'=>'Acknowledgment recorded; payment and fulfillment have not occurred.');
    if (!add_post_meta($id,'_neo_checkout',$record,true)) {
        wp_delete_post($id,true);
        wp_die('Checkout record could not be saved.', '', array('response'=>500));
    }
    wp_safe_redirect(add_query_arg('neo_prepared',$id,add_query_arg('neo_ledger',$ledger,home_url('/holy-stewardship/'))) . '#neo-stewardship-gateway');
    exit;
});
add_action('add_meta_boxes_neo_steward_order',function(){
    add_meta_box('neo_checkout_record','Checkout record',function($post){
        if (!current_user_can('manage_options')) return;
        echo '<p>Freewallet signing handoff: after independently verified payment, send the recorded instrument and exact quantity from ' .
            esc_html(NEO_STEWARDSHIP_TREASURY) . ' to the recorded delivery wallet. Verify the correct Counterparty ledger, source inventory, destination, amount and network fee inside Freewallet. This record does not authorize or broadcast a transfer.</p>';
        echo '<pre style="white-space:pre-wrap;overflow-wrap:anywhere">' .
            esc_html(wp_json_encode(get_post_meta($post->ID,'_neo_checkout',true),JSON_PRETTY_PRINT)) . '</pre>';
    },'neo_steward_order');
});

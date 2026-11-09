<?php
defined('ABSPATH') || exit;

/** Server-side verifier binding only. A wallet connect result is not a proof. */
function neo_counter_activation_ready() {
    return has_filter('neo_counter_activation_evidence') !== false && neo_counter_transactional_tables();
}
function neo_counter_invoice_payable($row) {
    $p=$row['invoice'];$a=$p['activation']??array();
    return neo_counter_activation_ready() && ($p['payable']??false)===true && ($p['terms_accepted']??false)===true
        && in_array($row['state'],array('AWAITING_PAYMENT'),true) && ($p['expires_at']??0)>time()
        && ($a['expires_at']??0)>=($p['expires_at']??0) && ($a['destination']??null)===($p['destination']??null);
}
function neo_counter_activation_proof($row,$now) {
    // Only trusted PHP integration code supplies evidence; never a REST parameter.
    $e=apply_filters('neo_counter_activation_evidence',null,$row);
    $p=$row['invoice'];
    if(!is_array($e)||($e['wallet_control_verified']??null)!==true||($e['chain_verified']??null)!==true
        ||($e['network']??null)!=='mainnet'||($e['ledger']??null)!==$p['ledger']
        ||($e['destination']??null)!==$p['destination']||($e['payload_hash']??null)!==$row['payload_hash']
        ||!is_int($e['observed_at']??null)||$e['observed_at']>$now||$e['observed_at']<$now-60
        ||!is_int($e['expires_at']??null)||$e['expires_at']<$p['expires_at']
        ||!is_string($e['proof_id']??null)||!preg_match('/^[a-f0-9]{64}$/',$e['proof_id'])) {
        throw new RuntimeException('Verified merchant wallet control and current mainnet evidence are required.');
    }
    return array('proof_id'=>$e['proof_id'],'destination'=>$e['destination'],'observed_at'=>$e['observed_at'],
        'expires_at'=>$e['expires_at'],'accepted_payload_hash'=>$row['payload_hash'],'operator_id'=>get_current_user_id());
}
/** Serialized with settlement's invoice lock. No transfers or delivery side effects. */
function neo_counter_transition_invoice($order,$expected_hash,$action) {
    if(!is_user_logged_in())throw new RuntimeException('Sign in required.');
    if(!in_array($action,array('accept','activate','cancel'),true)||!is_string($expected_hash)||!preg_match('/^[a-f0-9]{64}$/',$expected_hash))throw new RuntimeException('Reload the invoice.');
    if($action!=='accept'&&!current_user_can('manage_options'))throw new RuntimeException('Operator access required.');
    if(!neo_counter_transactional_tables())throw new RuntimeException('Transactional invoice storage unavailable.');
    global $wpdb;$t=neo_counter_tables();
    if($wpdb->query('START TRANSACTION')===false)throw new RuntimeException('Could not lock invoice.');
    try {
        $row=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$t['invoices']} WHERE order_id = %d FOR UPDATE",$order),ARRAY_A);
        if(!$row||!hash_equals($row['payload_hash'],hash('sha256',$row['payload']))||!hash_equals($row['payload_hash'],$expected_hash))throw new RuntimeException('Invoice changed. Reload before continuing.');
        if($action==='accept'&&(int)$row['user_id']!==get_current_user_id())throw new RuntimeException('Only the invoice customer can accept its terms.');
        $p=json_decode($row['payload'],true);$now=time();
        if(!in_array($p['order_kind']??'',array('physical_goods','service_bill'),true))throw new RuntimeException('This order type requires its separate delivery or bond activation workflow.');
        if(($p['expires_at']??0)<=$now||!empty($row['payment_txid'])||!in_array($row['state'],array('LOCKED_NOT_PAYABLE','AWAITING_ACTIVATION','AWAITING_PAYMENT'),true))throw new RuntimeException('Invoice expired, closed or already has payment evidence.');
        if($wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['claims']} WHERE invoice_id = %d",$row['id']))||$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['jobs']} WHERE invoice_id = %d",$row['id'])))throw new RuntimeException('Payment reconciliation is required before changing this invoice.');
        if($action==='accept') {
            if($row['state']!=='LOCKED_NOT_PAYABLE'||!empty($p['payable'])||!empty($p['terms_accepted']))throw new RuntimeException('Terms are already accepted or this invoice is active.');
            if(!is_string($p['terms_snapshot']??null)||!is_string($p['terms_hash']??null)||!hash_equals($p['terms_hash'],hash('sha256',$p['terms_snapshot'])))throw new RuntimeException('Terms integrity failed.');
            $p['terms_accepted']=true;$p['acceptance']=array('user_id'=>get_current_user_id(),'at'=>$now,'payload_hash'=>$expected_hash,'terms_hash'=>$p['terms_hash']);$state='AWAITING_ACTIVATION';
        } elseif($action==='activate') {
            if($row['state']!=='AWAITING_ACTIVATION'||($p['terms_accepted']??false)!==true||($p['acceptance']['user_id']??null)!==(int)$row['user_id'])throw new RuntimeException('Customer acceptance is required.');
            if(!neo_counter_activation_ready())throw new RuntimeException('Counterpay wallet-proof adapter is not connected.');
            $p['activation']=neo_counter_activation_proof(array_merge($row,array('invoice'=>$p)),$now);$p['payable']=true;$state='AWAITING_PAYMENT';
        } else {$p['payable']=false;$p['cancelled_at']=$now;$p['cancelled_by']=get_current_user_id();$state='CANCELLED';}
        $json=wp_json_encode($p);
        if(!is_string($json)||$wpdb->update($t['invoices'],array('payload'=>$json,'payload_hash'=>hash('sha256',$json),'state'=>$state,'updated_at'=>$now),array('id'=>$row['id']))!==1)throw new RuntimeException('Invoice change could not be saved.');
        if($wpdb->query('COMMIT')===false)throw new RuntimeException('Invoice commit failed.');
        return array('state'=>$state,'paymentSubmitted'=>false,'delivery'=>'NOT_SENT');
    }catch(Throwable $e){$wpdb->query('ROLLBACK');throw $e;}
}

add_action('admin_post_neo_counter_invoice_transition',function(){
    if(!is_user_logged_in())wp_die('Sign in required.','',array('response'=>403));
    $order=isset($_POST['order_id'])&&is_string($_POST['order_id'])&&ctype_digit($_POST['order_id'])?(int)$_POST['order_id']:0;
    check_admin_referer('neo_counter_invoice_transition_'.$order);
    $action=isset($_POST['transition'])&&is_string($_POST['transition'])?$_POST['transition']:'';
    $hash=isset($_POST['payload_hash'])&&is_string($_POST['payload_hash'])?$_POST['payload_hash']:'';
    if($action==='accept'&&($_POST['accept_terms']??'')!=='yes')wp_die('Review and accept the invoice terms.','',array('response'=>400));
    try{neo_counter_transition_invoice($order,$hash,$action);}catch(Throwable $e){wp_die(esc_html($e->getMessage()),'',array('response'=>409));}
    wp_safe_redirect($action==='accept'?home_url('/neo-counter-checkout/').'?neo_order='.$order:admin_url('post.php?post='.$order.'&action=edit'));exit;
});
function neo_counter_transition_form($row,$action) {
    $order=(int)$row['order_id'];
    $html='<form method="post" action="'.esc_url(admin_url('admin-post.php')).'"><input type="hidden" name="action" value="neo_counter_invoice_transition"><input type="hidden" name="order_id" value="'.$order.'"><input type="hidden" name="payload_hash" value="'.esc_attr($row['payload_hash']).'"><input type="hidden" name="transition" value="'.esc_attr($action).'">';
    $html.=wp_nonce_field('neo_counter_invoice_transition_'.$order,'_wpnonce',true,false);
    if($action==='accept')$html.='<p><label><input type="checkbox" name="accept_terms" value="yes" required> I reviewed the exact amount, currency, receiving wallet and order terms above.</label></p>';
    $labels=array('accept'=>'Accept invoice terms','activate'=>'Enable this invoice','cancel'=>'Cancel this invoice');
    return $html.'<button type="submit">'.esc_html($labels[$action]).'</button></form>';
}
add_action('add_meta_boxes_neo_steward_order',function(){add_meta_box('neo_counter_activation','Invoice activation',function($post){
    if(!current_user_can('manage_options'))return;$row=neo_counter_invoice($post->ID);if(!$row||is_wp_error($row))return;
    echo '<p>Customer acceptance and verified merchant wallet control are required. No payment or delivery is submitted by activation.</p>';
    if(!neo_counter_activation_ready())echo '<p>Counterpay wallet-proof adapter is not connected. Activation is unavailable.</p>';
    if($row['state']==='AWAITING_ACTIVATION'&&neo_counter_activation_ready())echo neo_counter_transition_form($row,'activate');
    if(in_array($row['state'],array('LOCKED_NOT_PAYABLE','AWAITING_ACTIVATION','AWAITING_PAYMENT'),true))echo neo_counter_transition_form($row,'cancel');
},'neo_steward_order');});

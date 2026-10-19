<?php
defined('ABSPATH') || exit;
require_once __DIR__.'/merchant-core.php';
/** Operator-prepared merchant invoice. There is no customer-controlled price or activation flag. */
function neo_counter_prepare_merchant($input,$request_key){
    if(!current_user_can('manage_options'))return new WP_Error('forbidden','Operator access required.');
    if(!neo_counter_transactional_tables())return new WP_Error('storage','Invoice storage is unavailable.');
    try{
        $kind=neo_counter_order_kind(array('order_kind'=>$input['order_kind']??''));if($kind==='token_sale')throw new InvalidArgumentException('Use Holy Stewardship to prepare bond purchases.');
        $ledger=$input['ledger']??'';if(!in_array($ledger,array('classic','cp20'),true))throw new InvalidArgumentException('Choose a Counterparty ledger.');
        $currency_id=$input['currency_id']??strtolower($input['payment_asset']??'');$entry=neo_stewardship_currency_by_id($currency_id);
        if(!$entry||empty($entry['counterpartyAsset']))throw new InvalidArgumentException('Choose a currency with a verified token mapping.');
        $asset=$entry['counterpartyAsset'];$market=neo_stewardship_daily_market($ledger,$asset,$entry['expectedOwner']??'');
        if(!$market)throw new InvalidArgumentException('The daily market rate or treasury verification is unavailable for this currency.');$decimals=$market['divisible']?8:0;
        $base=array_key_exists('base_price',$input)?neo_counter_merchant_price_to_minor($input['base_price'],$decimals):($input['base_minor']??null);
        $amount=neo_counter_merchant_amount($base);$payer=$input['payer']??'';
        if(!neo_stewardship_wallet_valid($payer))throw new InvalidArgumentException('Enter the member legacy mainnet wallet.');
        $uid=$input['member_id']??0;if(!is_int($uid)||$uid<1||!get_userdata($uid))throw new InvalidArgumentException('Choose an existing member account.');
        $ref=$input['item_reference']??'';if(!is_string($ref)||!preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$/',$ref))throw new InvalidArgumentException('Enter an item or bill reference (maximum 64 characters).');
        $terms=$input['terms']??'';if(!is_string($terms)||strlen($terms)<10||strlen($terms)>4096)throw new InvalidArgumentException('Enter the order terms (10–4096 bytes).');
        if(!is_string($request_key)||!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i',$request_key))throw new InvalidArgumentException('Reload before preparing another order.');
        $now=time();$p=array('version'=>2,'order_kind'=>$kind,'item_reference'=>$ref,'currency_asset'=>$asset,'currency_id'=>$entry['id'],'currency_symbol'=>$entry['symbol'],'currency_market'=>$market,'currency_decimals'=>$decimals,'amount_minor'=>$amount,'base_minor'=>$base,'markup_bps'=>900,'ledger'=>$ledger,'payer'=>$payer,'destination'=>NEO_STEWARDSHIP_COLLECTION,'created_at'=>$now,'expires_at'=>$now+1800,'confirmations'=>3,'terms_hash'=>hash('sha256',$terms),'terms_snapshot'=>$terms,'terms_accepted'=>false,'payable'=>false,'settlement_method'=>'merchant_inventory');
        global $wpdb;$t=neo_counter_tables();$key=hash('sha256',get_current_user_id().':merchant:'.$request_key);
        // Reject repeat requests before creating a private WordPress order; DB uniqueness is authoritative.
        if($wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$t['invoices']} WHERE request_key = %s",$key)))throw new RuntimeException('This order request was already prepared.');
        $order=wp_insert_post(array('post_type'=>'neo_steward_order','post_status'=>'private','post_author'=>$uid,'post_title'=>'Merchant draft — '.$ref),true);
        if(!$order||is_wp_error($order))throw new RuntimeException('Order could not be saved.');$p['order_id']=(int)$order;$json=wp_json_encode($p);
        if(!$wpdb->insert($t['invoices'],array('order_id'=>$order,'user_id'=>$uid,'request_key'=>$key,'payload'=>$json,'payload_hash'=>hash('sha256',$json),'state'=>'LOCKED_NOT_PAYABLE','created_at'=>$now,'expires_at'=>$p['expires_at'],'updated_at'=>$now))){wp_delete_post($order,true);throw new RuntimeException('Order request already exists or storage failed.');}
        return (int)$order;
    }catch(Throwable $e){return new WP_Error('merchant_draft',$e->getMessage());}
}
add_action('admin_post_neo_counter_merchant_prepare',function(){
    if(!current_user_can('manage_options'))wp_die('Operator access required.','',array('response'=>403));check_admin_referer('neo_counter_merchant_prepare');
    $input=array();foreach(array('order_kind','ledger','currency_id','base_price','payer','item_reference','terms') as $key)$input[$key]=isset($_POST[$key])&&is_string($_POST[$key])?trim(wp_unslash($_POST[$key])):'';
    $input['member_id']=isset($_POST['member_id'])&&is_string($_POST['member_id'])&&ctype_digit($_POST['member_id'])?(int)$_POST['member_id']:0;
    $request=isset($_POST['request_key'])&&is_string($_POST['request_key'])?wp_unslash($_POST['request_key']):'';$order=neo_counter_prepare_merchant($input,$request);
    if(is_wp_error($order))wp_die(esc_html($order->get_error_message()),'',array('response'=>409));wp_safe_redirect(admin_url('post.php?post='.$order.'&action=edit'));exit;
});
add_action('admin_menu',function(){add_menu_page('NEO Counter','NEO Counter','manage_options','neo-counter-merchant','neo_counter_merchant_admin','dashicons-cart',56);});
function neo_counter_merchant_admin(){
    if(!current_user_can('manage_options'))return;
    echo '<div class="wrap"><h1>NEO Counter</h1><p>Prepare a product order or service bill. No payment is requested until checkout activation is complete.</p><p><a href="'.esc_url(admin_url('edit.php?post_type=neo_steward_order')).'">View orders</a> · <a href="'.esc_url(home_url('/holy-stewardship/')).'">Bond checkout</a></p>';
    echo '<table class="widefat striped"><thead><tr><th>Order</th><th>Payment goes to</th><th>What follows payment</th></tr></thead><tbody><tr><td>Buy tokens</td><td>Collection wallet</td><td>Reserve merchant token inventory; send tokens after verified payment</td></tr><tr><td>Buy a digital product</td><td>Collection wallet</td><td>Secure download or access grant</td></tr><tr><td>Buy a physical product</td><td>Collection wallet</td><td>Paid order awaiting shipment</td></tr><tr><td>Pay a service bill</td><td>Collection wallet</td><td>Bill marked paid; service completion tracked separately</td></tr></tbody></table>';
    echo '<h2>Prepare merchant order</h2><form method="post" action="'.esc_url(admin_url('admin-post.php')).'">';wp_nonce_field('neo_counter_merchant_prepare');
    echo '<input type="hidden" name="action" value="neo_counter_merchant_prepare"><input type="hidden" name="request_key" value="'.esc_attr(wp_generate_uuid4()).'"><table class="form-table"><tr><th><label for="neo-kind">Order type</label></th><td><select id="neo-kind" name="order_kind"><option value="digital_goods">Digital product</option><option value="physical_goods">Physical product</option><option value="service_bill">Service bill</option></select></td></tr><tr><th><label for="neo-ledger">Ledger</label></th><td><select id="neo-ledger" name="ledger"><option value="classic">Counterparty Classic</option><option value="cp20">Counterparty 2.0</option></select></td></tr><tr><th><label for="neo-pay-asset">Price currency</label></th><td><select id="neo-pay-asset" name="currency_id">';
    foreach(neo_stewardship_currency_catalog() as $currency)echo '<option value="'.esc_attr($currency['id']).'"'.($currency['id']==='btc'?' selected':'').(empty($currency['counterpartyAsset'])?' disabled':'').'>'.esc_html($currency['symbol'].' — '.$currency['name'].(empty($currency['counterpartyAsset'])?' (token pending)':'')).'</option>';
    echo '</select></td></tr>';
    $fields=array('member_id'=>array('Member account ID','number'),'payer'=>array('Member wallet','text'),'item_reference'=>array('Item or bill reference','text'),'base_price'=>array('Base price','text'));
    foreach($fields as $name=>$f)echo '<tr><th><label for="neo-'.esc_attr($name).'">'.esc_html($f[0]).'</label></th><td><input required id="neo-'.esc_attr($name).'" name="'.esc_attr($name).'" type="'.esc_attr($f[1]).'" class="regular-text"></td></tr>';
    echo '<tr><th><label for="neo-terms">Order terms</label></th><td><textarea required id="neo-terms" name="terms" rows="4" maxlength="4096" class="large-text"></textarea></td></tr></table><p>Enter the price in the selected token. Whole-unit tokens cannot use fractional amounts. The daily market rate and treasury identity must be available. The total adds 9%, rounded up once. This creates a private draft; member acceptance is still required.</p>';submit_button('Prepare draft order');echo '</form><h2>Tokenworks settlement</h2><p>Merchant inventory stays in its wallet. Native DEX escrow and UTXO atomic swaps need separate verified adapters. No inventory reservation is labelled on-chain escrow.</p></div>';
}
add_action('rest_api_init',function(){register_rest_route('neo-counter/v1','/merchant-status',array('methods'=>'GET','permission_callback'=>'__return_true','callback'=>function(){return array('version'=>'0.19.0','orderKinds'=>array('token_sale','digital_goods','physical_goods','service_bill'),'collectionMode'=>'merchant_wallet','fulfillmentRouting'=>true,'worldCurrencyCatalogReady'=>true,'merchantDraftCurrencyPolicy'=>'mapped-asset-current-market-and-treasury-check','tokenworks'=>array('contractVersion'=>1,'escrowAdapterConnected'=>false,'onChainEscrowVerified'=>false),'digitalDeliveryConnected'=>false,'paymentsEnabled'=>false); }));});

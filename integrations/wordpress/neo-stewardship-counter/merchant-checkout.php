<?php
defined('ABSPATH') || exit;
/** Separate retail presentation. Holy Stewardship and settlement rules are untouched. */
add_shortcode('neo_counter_checkout', function($attributes) {
    wp_enqueue_style('neo-counter-merchant-checkout',plugins_url('merchant-checkout.css',__FILE__),array(),'0.22.0');
    $attributes=shortcode_atts(array('order_id'=>0),$attributes);
    $order=absint($attributes['order_id']);
    if (!$order && isset($_GET['neo_order']) && is_string($_GET['neo_order']) && preg_match('/^[1-9][0-9]{0,9}$/',$_GET['neo_order'])) $order=(int)$_GET['neo_order'];
    $checkout=home_url('/neo-counter-checkout/').($order?'?neo_order='.$order:'');
    if (!is_user_logged_in()) return '<section data-neo-merchant-checkout><header class="nc-head"><span class="nc-brand">NEO <span>COUNTER</span></span><span class="nc-secure">Direct to merchant</span></header><section class="nc-summary"><p class="nc-eyebrow">MERCHANT CHECKOUT</p><h2>Sign in to view your checkout.</h2><p>Your merchant\'s checkout link opens the exact invoice, currency and receiving wallet.</p><p><a href="'.esc_url(wp_login_url($checkout)).'">Sign in to continue &rarr;</a></p></section></section>';
    if (!$order) return '<section data-neo-merchant-checkout><section class="nc-summary"><p class="nc-eyebrow">NEO COUNTER</p><h2>Open your merchant\'s checkout link.</h2><p>The link will show your order, the exact amount and where your payment goes.</p></section></section>';
    $row=neo_counter_invoice($order);
    if (!$row || is_wp_error($row) || ((int)$row['user_id']!==get_current_user_id() && !current_user_can('manage_options'))) return '<p>Checkout unavailable. Contact the merchant.</p>';
    // Match the existing REST route's global payment hold. UI never activates an invoice.
    $data=array('state'=>$row['state'],'invoice'=>neo_counter_retail_invoice($row['invoice']),'payable'=>false,'delivery'=>'NOT_SENT');
    $script=plugins_url('merchant-checkout.mjs',__FILE__);
    $status=rest_url('neo-counter/v1/invoices/'.$order);
    return '<section data-neo-merchant-checkout data-status-url="'.esc_url($status).'" data-nonce="'.esc_attr(wp_create_nonce('wp_rest')).'"><script type="application/json">'.wp_json_encode($data,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT).'</script></section><script type="module" src="'.esc_url($script).'"></script>';
});
add_action('add_meta_boxes_neo_steward_order',function(){
    add_meta_box('neo_counter_customer_link','Customer checkout',function($post){
        if (!current_user_can('manage_options')) return;
        echo '<p><a href="'.esc_url(home_url('/neo-counter-checkout/').'?neo_order='.(int)$post->ID).'" target="_blank" rel="noopener">Open customer checkout &rarr;</a></p><p>Copy this link for the customer. Invoice access and activation requirements still apply.</p>';
    },'neo_steward_order');
});

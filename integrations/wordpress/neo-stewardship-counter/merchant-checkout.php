<?php
defined('ABSPATH') || exit;
/** Separate retail presentation. Holy Stewardship and settlement rules are untouched. */
add_shortcode('neo_counter_checkout', function($attributes) {
    if (!is_user_logged_in()) return '<p>Sign in to view your checkout.</p>';
    $attributes=shortcode_atts(array('order_id'=>0),$attributes);
    $order=absint($attributes['order_id']);
    $row=neo_counter_invoice($order);
    if (!$row || is_wp_error($row) || ((int)$row['user_id']!==get_current_user_id() && !current_user_can('manage_options'))) return '<p>Checkout unavailable. Contact the merchant.</p>';
    // Match the existing REST route's global payment hold. UI never activates an invoice.
    $data=array('state'=>$row['state'],'invoice'=>neo_counter_retail_invoice($row['invoice']),'payable'=>false,'delivery'=>'NOT_SENT');
    wp_enqueue_style('neo-counter-merchant-checkout',plugins_url('merchant-checkout.css',__FILE__),array(),'0.22.0');
    $script=plugins_url('merchant-checkout.mjs',__FILE__);
    $status=rest_url('neo-counter/v1/invoices/'.$order);
    return '<section data-neo-merchant-checkout data-status-url="'.esc_url($status).'" data-nonce="'.esc_attr(wp_create_nonce('wp_rest')).'"><script type="application/json">'.wp_json_encode($data,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT).'</script></section><script type="module" src="'.esc_url($script).'"></script>';
});

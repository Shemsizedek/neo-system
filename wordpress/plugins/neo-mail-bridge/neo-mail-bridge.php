<?php
/**
 * Plugin Name: NEO Mail Bridge
 * Description: Provider-neutral WordPress entrypoint for NEO Mail. No mailbox credentials are stored in WordPress.
 * Version: 0.1.0
 * Author: NEO Systems
 */
if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    register_rest_route('neo-mail/v1', '/status', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function () {
            return rest_ensure_response([
                'service' => 'neo-mail-bridge',
                'version' => '0.1.0',
                'integration' => 'standalone-compatible',
                'inbox_available' => false,
                'outbound_enabled' => false,
                'authentication' => 'not_configured',
            ]);
        },
    ]);
    register_rest_route('neo-mail/v1', '/inbox', [
        'methods' => 'GET',
        'permission_callback' => function () {
            return is_user_logged_in() && current_user_can('manage_options');
        },
        'callback' => function () {
            return new WP_Error('neo_mail_upstream_not_certified', 'NEO Mail protected inbox is not yet connected.', ['status' => 503]);
        },
    ]);
});
add_shortcode('neo_mail', function () {
    if (!is_user_logged_in() || !current_user_can('manage_options')) {
        return '<p>NEO Mail access requires an authorized operator session.</p>';
    }
    return '<div class="neo-mail-bridge"><p>NEO Mail bridge installed. Protected mailbox connection pending certification.</p></div>';
});

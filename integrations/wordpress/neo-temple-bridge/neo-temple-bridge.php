<?php
/**
 * Plugin Name: NEO Temple Bridge
 * Description: Connects approved NEO System dashboards and Google AI Studio visual modules to the live NEO API.
 * Version: 3.2.0
 * Author: NEO System
 */

if (!defined('ABSPATH')) exit;

const NEO_TEMPLE_BRIDGE_VERSION = '3.2.0';
const NEO_TEMPLE_API = 'https://neo.holytemples.org/api';
const NEO_TEMPLE_SCRIPT = 'https://neo.holytemples.org/assets/neo-bridge.js';

function neo_temple_bridge_enqueue() {
    wp_enqueue_script('neo-temple-bridge', NEO_TEMPLE_SCRIPT, array(), NEO_TEMPLE_BRIDGE_VERSION, true);
    wp_script_add_data('neo-temple-bridge', 'strategy', 'defer');
}
add_action('wp_enqueue_scripts', 'neo_temple_bridge_enqueue');

function neo_temple_bridge_dashboard($atts = array()) {
    $atts = shortcode_atts(array(
        'endpoint' => NEO_TEMPLE_API,
        'refresh_rate' => '4000',
        'layout' => 'executive_dashboard',
    ), $atts, 'neo_temple_dashboard');

    $endpoint = esc_url($atts['endpoint']);
    if (strpos($endpoint, 'https://') !== 0) $endpoint = NEO_TEMPLE_API;
    $refresh = max(4000, absint($atts['refresh_rate']));
    $layout = sanitize_key($atts['layout']);

    return sprintf(
        '<neo-temple-dashboard api-endpoint="%s" refresh-rate="%d" data-layout="%s"></neo-temple-dashboard>',
        esc_attr($endpoint),
        $refresh,
        esc_attr($layout)
    );
}
add_shortcode('neo_temple_dashboard', 'neo_temple_bridge_dashboard');
add_shortcode('neo_temple_live', 'neo_temple_bridge_dashboard');

function neo_temple_bridge_register_block() {
    register_block_type('neo-system/temple-telemetry', array(
        'api_version' => 3,
        'attributes' => array(
            'apiEndpoint' => array('type' => 'string', 'default' => NEO_TEMPLE_API),
            'layout' => array('type' => 'string', 'default' => 'executive_dashboard'),
            'refreshRate' => array('type' => 'number', 'default' => 4000),
        ),
        'render_callback' => function($attributes) {
            return neo_temple_bridge_dashboard(array(
                'endpoint' => $attributes['apiEndpoint'] ?? NEO_TEMPLE_API,
                'layout' => $attributes['layout'] ?? 'executive_dashboard',
                'refresh_rate' => $attributes['refreshRate'] ?? 4000,
            ));
        },
    ));
}
add_action('init', 'neo_temple_bridge_register_block');

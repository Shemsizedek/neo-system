<?php
/**
 * Plugin Name: NEO Temple Suite
 * Description: Governed WordPress blocks for NEO telemetry, Noogle, NOMNI, World Library, NEOpass, NEOpay, Google AI Studio visual surfaces, and the authenticated NEO AI Gateway.
 * Version: 4.1.0
 * Author: NEO System
 */
if (!defined('ABSPATH')) exit;

const NEO_TEMPLE_SUITE_VERSION = '4.1.0';
const NEO_TEMPLE_API = 'https://neo.holytemples.org/api';
const NEO_TEMPLE_AI_ENDPOINT = 'https://neo.holytemples.org/api/ai/execute';

function neo_temple_suite_enqueue() {
    wp_enqueue_script('neo-temple-bridge', 'https://neo.holytemples.org/assets/neo-bridge.js', array(), NEO_TEMPLE_SUITE_VERSION, true);
    wp_enqueue_script('neo-temple-suite', 'https://neo.holytemples.org/assets/neo-suite.js', array('neo-temple-bridge'), NEO_TEMPLE_SUITE_VERSION, true);
    wp_enqueue_script('neo-temple-ai', 'https://neo.holytemples.org/assets/neo-ai.js', array('neo-temple-bridge'), NEO_TEMPLE_SUITE_VERSION, true);
    wp_script_add_data('neo-temple-bridge', 'strategy', 'defer');
    wp_script_add_data('neo-temple-suite', 'strategy', 'defer');
    wp_script_add_data('neo-temple-ai', 'strategy', 'defer');
}
add_action('wp_enqueue_scripts', 'neo_temple_suite_enqueue');

function neo_temple_dashboard_shortcode($atts = array()) {
    $atts = shortcode_atts(array('endpoint' => NEO_TEMPLE_API, 'refresh_rate' => '4000', 'layout' => 'executive_dashboard'), $atts, 'neo_temple_dashboard');
    $endpoint = esc_url($atts['endpoint']);
    if (strpos($endpoint, 'https://') !== 0) $endpoint = NEO_TEMPLE_API;
    return sprintf('<neo-temple-dashboard api-endpoint="%s" refresh-rate="%d" data-layout="%s"></neo-temple-dashboard>', esc_attr($endpoint), max(4000, absint($atts['refresh_rate'])), esc_attr(sanitize_key($atts['layout'])));
}

function neo_temple_ai_shortcode($atts = array()) {
    $atts = shortcode_atts(array('endpoint' => NEO_TEMPLE_AI_ENDPOINT, 'capability' => 'reasoning'), $atts, 'neo_temple_ai');
    $endpoint = esc_url($atts['endpoint']);
    if (strpos($endpoint, 'https://') !== 0) $endpoint = NEO_TEMPLE_AI_ENDPOINT;
    $allowed = array('reasoning', 'planning', 'review', 'frontend', 'design', 'backend', 'multimodal', 'media');
    $capability = sanitize_key($atts['capability']);
    if (!in_array($capability, $allowed, true)) $capability = 'reasoning';
    return sprintf('<neo-temple-ai endpoint="%s" capability="%s"></neo-temple-ai>', esc_attr($endpoint), esc_attr($capability));
}

function neo_temple_simple_shortcode($atts, $content, $tag) {
    $map = array(
        'neo_noogle_search' => '<neo-noogle-search></neo-noogle-search>',
        'neo_nomni_value' => '<neo-nomni-value></neo-nomni-value>',
        'neo_service_status' => '<neo-service-grid></neo-service-grid>',
        'neo_app_grid' => '<neo-launchers kind="all"></neo-launchers>',
        'neo_world_library' => '<neo-launchers kind="world library"></neo-launchers>',
        'neo_neopay' => '<neo-launchers kind="neopay"></neo-launchers>',
        'neo_neopass' => '<neo-launchers kind="neopass"></neo-launchers>',
    );
    return $map[$tag] ?? '';
}

add_shortcode('neo_temple_dashboard', 'neo_temple_dashboard_shortcode');
add_shortcode('neo_temple_live', 'neo_temple_dashboard_shortcode');
add_shortcode('neo_temple_ai', 'neo_temple_ai_shortcode');
foreach (array('neo_noogle_search', 'neo_nomni_value', 'neo_service_status', 'neo_app_grid', 'neo_world_library', 'neo_neopay', 'neo_neopass') as $tag) add_shortcode($tag, 'neo_temple_simple_shortcode');

function neo_ai_surface_shortcode($atts = array()) {
    $atts = shortcode_atts(array('module' => 'service-status'), $atts, 'neo_ai_surface');
    $modules = array(
        'dashboard' => '[neo_temple_dashboard]',
        'assistant' => '[neo_temple_ai]',
        'noogle' => '[neo_noogle_search]',
        'nomni' => '[neo_nomni_value]',
        'service-status' => '[neo_service_status]',
        'apps' => '[neo_app_grid]'
    );
    $module = sanitize_key($atts['module']);
    return do_shortcode($modules[$module] ?? $modules['service-status']);
}
add_shortcode('neo_ai_surface', 'neo_ai_surface_shortcode');

function neo_temple_suite_register_blocks() {
    $blocks = array(
        'temple-telemetry' => 'neo_temple_dashboard',
        'temple-ai' => 'neo_temple_ai',
        'noogle-search' => 'neo_noogle_search',
        'nomni-value' => 'neo_nomni_value',
        'service-status' => 'neo_service_status',
        'app-grid' => 'neo_app_grid'
    );
    foreach ($blocks as $name => $shortcode) register_block_type('neo-system/' . $name, array('api_version' => 3, 'render_callback' => function() use ($shortcode) { return do_shortcode('[' . $shortcode . ']'); }));
}
add_action('init', 'neo_temple_suite_register_blocks');

<?php
/**
 * Plugin Name: NEO Crown Explorer
 * Description: Read-only public Crown asset lookup. No signing, wallet access, or privileged operations.
 * Version: 0.1.0
 */
if (!defined('ABSPATH')) exit;
function neo_crown_explorer_shortcode($atts) {
    $atts = shortcode_atts(array('asset' => ''), $atts, 'neo_crown_explorer');
    $asset = strtoupper(trim((string) $atts['asset']));
    if (!preg_match('/^[A-Z][A-Z0-9_.-]{3,23}$/D', $asset)) {
        return '<p class="neo-crown-error">Enter a valid canonical asset identifier.</p>';
    }
    $url = 'https://crown.holytemples.org/assets/' . rawurlencode($asset) . '/info.json';
    $response = wp_safe_remote_get($url, array('timeout' => 5, 'redirection' => 0, 'limit_response_size' => 32768, 'headers' => array('Accept' => 'application/json')));
    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
        return '<p class="neo-crown-error">Public asset metadata is currently unavailable.</p>';
    }
    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (!is_array($data) || !isset($data['asset']) || !is_string($data['asset']) || $data['asset'] !== $asset) {
        return '<p class="neo-crown-error">Asset metadata could not be verified.</p>';
    }
    $description = isset($data['description']) && is_string($data['description']) ? $data['description'] : '';
    $website = isset($data['website']) && is_string($data['website']) ? esc_url($data['website'], array('https')) : '';
    $html = '<section class="neo-crown-asset"><h3>' . esc_html($asset) . '</h3>';
    if ($description !== '') $html .= '<p>' . esc_html($description) . '</p>';
    if ($website !== '') $html .= '<p><a rel="noopener noreferrer" href="' . esc_url($website) . '">Asset website</a></p>';
    return $html . '<small>Public metadata only; ownership and issuer claims are not independently verified.</small></section>';
}
add_shortcode('neo_crown_explorer', 'neo_crown_explorer_shortcode');

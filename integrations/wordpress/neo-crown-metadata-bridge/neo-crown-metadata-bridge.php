<?php
/**
 * Plugin Name: NEO Crown Enhanced Metadata Bridge (staging candidate)
 * Description: Read-only exact-path Counterparty enhanced JSON bridge for the verified canonical Crown WordPress host.
 * Version: 0.1.0
 * Requires PHP: 8.1
 * License: MIT
 *
 * Install only on the verified WordPress site serving crown.holytemples.org; do not install on unrelated production sites.
 */
if (!defined('ABSPATH')) {
    exit;
}

define('NEO_CROWN_METADATA_ORIGIN', 'https://neo-crown-cardmaster-staging.onrender.com');
define('NEO_CROWN_METADATA_PUBLIC_HOST', 'crown.holytemples.org');

function neo_crown_metadata_add_routes() {
    add_rewrite_rule(
        '^assets/([A-Z][A-Z0-9]{0,23})/tokenscan\.json$',
        'index.php?neo_crown_enhanced_asset=$matches[1]',
        'top'
    );
}
function neo_crown_metadata_query_vars($vars) {
    $vars[] = 'neo_crown_enhanced_asset';
    return $vars;
}
function neo_crown_metadata_activate() {
    neo_crown_metadata_add_routes();
    flush_rewrite_rules();
}
function neo_crown_metadata_deactivate() {
    flush_rewrite_rules();
}
add_action('init', 'neo_crown_metadata_add_routes', 1);
add_filter('query_vars', 'neo_crown_metadata_query_vars');
add_action('template_redirect', 'neo_crown_metadata_serve', 0);
register_activation_hook(__FILE__, 'neo_crown_metadata_activate');
register_deactivation_hook(__FILE__, 'neo_crown_metadata_deactivate');

function neo_crown_metadata_valid_asset($asset) {
    return is_string($asset) && preg_match('/^[A-Z][A-Z0-9]{0,23}$/D', $asset) === 1;
}
function neo_crown_metadata_valid_json($json, $asset) {
    if (!neo_crown_metadata_valid_asset($asset) || !is_string($json) || strlen($json) > 8192) {
        return false;
    }
    $value = json_decode($json, true);
    if (!is_array($value) || array_is_list($value) || ($value['asset'] ?? null) !== $asset) {
        return false;
    }
    $allowed = array('asset', 'description', 'website', 'image', 'pgpsig');
    foreach (array_keys($value) as $field) {
        if (!in_array($field, $allowed, true)) {
            return false;
        }
    }
    if (!is_string($value['description'] ?? null) || trim($value['description']) === '' || strlen($value['description']) > 2048) {
        return false;
    }
    foreach (array('website', 'image', 'pgpsig') as $key) {
        if (!array_key_exists($key, $value)) {
            continue;
        }
        $url = $value[$key];
        if (!is_string($url) || strlen($url) > 100 || !filter_var($url, FILTER_VALIDATE_URL) || !str_starts_with($url, 'https://')) {
            return false;
        }
    }
    if (isset($value['image']) && !str_ends_with($value['image'], '.png')) {
        return false;
    }
    return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
function neo_crown_metadata_get($asset) {
    if (!neo_crown_metadata_valid_asset($asset)) {
        return array('status' => 400, 'body' => '{"error":"invalid_asset"}');
    }
    $cache_key = 'neo_crown_enhanced_v1_' . strtolower($asset);
    $cached = get_transient($cache_key);
    if (is_string($cached)) {
        $valid = neo_crown_metadata_valid_json($cached, $asset);
        if ($valid !== false) {
            return array('status' => 200, 'body' => $valid, 'cache' => true);
        }
    }
    $url = NEO_CROWN_METADATA_ORIGIN . '/assets/' . $asset . '/tokenscan.json';
    $response = wp_safe_remote_get($url, array(
        'timeout' => 4,
        'redirection' => 0,
        'limit_response_size' => 8192,
        'headers' => array('Accept' => 'application/json'),
    ));
    if (is_wp_error($response)) {
        return array('status' => 503, 'body' => '{"error":"metadata_origin_unavailable"}');
    }
    $code = wp_remote_retrieve_response_code($response);
    if ($code === 404) {
        return array('status' => 404, 'body' => '{"error":"asset_not_published"}');
    }
    if ($code !== 200) {
        return array('status' => 503, 'body' => '{"error":"metadata_origin_unavailable"}');
    }
    $mime = strtolower((string) wp_remote_retrieve_header($response, 'content-type'));
    if (!str_contains($mime, 'application/json')) {
        return array('status' => 503, 'body' => '{"error":"invalid_metadata_mime"}');
    }
    $valid = neo_crown_metadata_valid_json(wp_remote_retrieve_body($response), $asset);
    if ($valid === false) {
        return array('status' => 503, 'body' => '{"error":"invalid_metadata_json"}');
    }
    set_transient($cache_key, $valid, 120);
    return array('status' => 200, 'body' => $valid, 'cache' => false);
}
function neo_crown_metadata_serve() {
    $asset = get_query_var('neo_crown_enhanced_asset', '');
    if (!is_string($asset) || $asset === '') {
        return;
    }
    // Never make the World Temple apex a second Crown metadata authority.
    $host = strtolower(trim((string) ($_SERVER['HTTP_HOST'] ?? '')));
    $host = preg_replace('/:[0-9]+$/', '', $host);
    if ($host !== NEO_CROWN_METADATA_PUBLIC_HOST) {
        status_header(404);
        exit;
    }
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, array('GET', 'HEAD'), true)) {
        status_header(405);
        header('Allow: GET, HEAD');
        exit;
    }
    $result = neo_crown_metadata_get($asset);
    status_header($result['status']);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: ' . ($result['status'] === 200 ? 'public, max-age=120' : 'no-store'));
    if ($method === 'GET') {
        echo $result['body']; // Strict JSON produced by json_encode, not untrusted HTML.
    }
    exit;
}

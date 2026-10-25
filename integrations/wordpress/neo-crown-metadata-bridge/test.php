<?php
declare(strict_types=1);
define('ABSPATH', __DIR__ . '/');
$GLOBALS['wp_routes'] = [];
$GLOBALS['wp_cache'] = [];
$GLOBALS['wp_remote_requests'] = [];
$GLOBALS['wp_remote_response'] = null;

function add_action(...$args) {}
function add_filter(...$args) {}
function register_activation_hook(...$args) {}
function register_deactivation_hook(...$args) {}
function flush_rewrite_rules() {}
function add_rewrite_rule($regex, $target, $priority = 'bottom') {
    $GLOBALS['wp_routes'][] = [$regex, $target, $priority];
}
function get_transient($key) {
    return $GLOBALS['wp_cache'][$key] ?? false;
}
function set_transient($key, $value, $seconds) {
    $GLOBALS['wp_cache'][$key] = $value;
    $GLOBALS['wp_cache_ttl'] = $seconds;
}
function wp_safe_remote_get($url, $options) {
    $GLOBALS['wp_remote_requests'][] = [$url, $options];
    return $GLOBALS['wp_remote_response'];
}
class WP_Error {}
function is_wp_error($response) {
    return $response instanceof WP_Error;
}
function wp_remote_retrieve_response_code($response) {
    return $response['status'];
}
function wp_remote_retrieve_header($response, $name) {
    return $response['headers'][$name] ?? null;
}
function wp_remote_retrieve_body($response) {
    return $response['body'];
}
function get_query_var($name, $default = '') {
    return $default;
}
function status_header($status) {}
require __DIR__ . '/neo-crown-metadata-bridge.php';

function check($condition, $description) {
    if (!$condition) {
        throw new RuntimeException('FAIL: ' . $description);
    }
    echo "PASS: " . $description . "\n";
}
function response($status, $body, $type = 'application/json; charset=utf-8') {
    return ['status' => $status, 'headers' => ['content-type' => $type], 'body' => $body];
}
function clearMock() {
    $GLOBALS['wp_cache'] = [];
    $GLOBALS['wp_remote_requests'] = [];
}
$valid = json_encode([
    'asset' => 'NOMNI',
    'description' => 'Public NOMNI description with no price or backed reserve assertion.',
    'website' => 'https://neo-crown-cardmaster-runtime.onrender.com/'
], JSON_UNESCAPED_SLASHES);

check(neo_crown_metadata_valid_asset('NOMNI') && !neo_crown_metadata_valid_asset('../../NOMNI') && !neo_crown_metadata_valid_asset('nomni'), 'Asset allowlist excludes path traversal and lowercase input');
check(
    neo_crown_metadata_valid_json($valid, 'NOMNI') !== false &&
    neo_crown_metadata_valid_json($valid, 'WRONG') === false &&
    neo_crown_metadata_valid_json($valid . '<script>', 'NOMNI') === false,
    'Canonical JSON requires exact asset and forbids injection'
);
check(
    neo_crown_metadata_valid_json('{"asset":"NOMNI","description":"test","private_key":"unsafe"}', 'NOMNI') === false &&
    neo_crown_metadata_valid_json('{"asset":"NOMNI","description":"test","image":"https://site.example/icon.svg"}', 'NOMNI') === false &&
    neo_crown_metadata_valid_json('{"asset":"NOMNI","description":"test","website":"http://127.0.0.1"}', 'NOMNI') === false,
    'Unapproved metadata fields and image/website formats are rejected'
);
neo_crown_metadata_add_routes();
check(
    count($GLOBALS['wp_routes']) === 1 &&
    str_contains($GLOBALS['wp_routes'][0][0], 'tokenscan') &&
    $GLOBALS['wp_routes'][0][2] === 'top' &&
    in_array('neo_crown_enhanced_asset', neo_crown_metadata_query_vars(['p']), true),
    'Only an exact high-priority metadata path and namespaced query variable are registered'
);
clearMock();
$GLOBALS['wp_remote_response'] = response(200, $valid);
$first = neo_crown_metadata_get('NOMNI');
$second = neo_crown_metadata_get('NOMNI');
check($first['status'] === 200 && $second['status'] === 200 && count($GLOBALS['wp_remote_requests']) === 1, 'Valid JSON is cached for repeat requests');
$call = $GLOBALS['wp_remote_requests'][0];
check(
    $call[0] === 'https://neo-crown-cardmaster-staging.onrender.com/assets/NOMNI/tokenscan.json' &&
    $call[1]['timeout'] === 4 && $call[1]['redirection'] === 0 &&
    $call[1]['limit_response_size'] === 8192 && $GLOBALS['wp_cache_ttl'] === 120,
    'Remote source, timeout, zero redirects, response size and cache are fixed'
);
foreach ([
    response(302, $valid, 'text/html'),
    response(404, '{"error":"not_found"}'),
    response(503, 'upstream unavailable'),
    response(200, '<html>not JSON</html>', 'text/html'),
    response(200, '{"asset":"WRONG","description":"wrong"}')
] as $mock) {
    clearMock();
    $GLOBALS['wp_remote_response'] = $mock;
    $observed = neo_crown_metadata_get('NOMNI');
    check($observed['status'] !== 200, 'Redirects, missing files, upstream errors and invalid metadata fail closed');
}
clearMock();
$GLOBALS['wp_remote_response'] = new WP_Error();
check(neo_crown_metadata_get('NOMNI')['status'] === 503, 'Network or WordPress API error returns 503, never fabricated JSON');
check(neo_crown_metadata_get('../NOMNI')['status'] === 400, 'Invalid asset never reaches public upstream');

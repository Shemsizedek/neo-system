<?php
defined('ABSPATH') || exit;
function neo_stewardship_currency_catalog() {
    $data = require __DIR__ . '/currency-registry.php';
    return isset($data['currencies']) && is_array($data['currencies']) ? $data['currencies'] : array();
}
function neo_stewardship_selected_currency() {
    $requested = isset($_GET['neo_currency']) && is_string($_GET['neo_currency']) ? sanitize_key($_GET['neo_currency']) : 'btc';
    foreach (neo_stewardship_currency_catalog() as $entry) if ($entry['id'] === $requested) return $entry;
    wp_die('Unknown payment currency. Choose an entry from the World Currency catalog.', '', array('response'=>400));
}

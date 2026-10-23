<?php
/**
 * Plugin Name: NEO AMP Auto Ads
 * Description: Adds Google AMP Auto ads to valid AMP requests only.
 * Version: 0.1.0
 * Author: NEO Systems
 */
defined('ABSPATH') || exit;

function neo_ads_is_amp_request(): bool {
    // Official AMP plugin v2 exposes amp_is_request(); older versions use is_amp_endpoint().
    if (function_exists('amp_is_request')) {
        return (bool) amp_is_request();
    }
    if (function_exists('is_amp_endpoint')) {
        return (bool) is_amp_endpoint();
    }
    return false; // Fail closed: never inject AMP markup on normal HTML pages.
}

function neo_ads_amp_head(): void {
    if (!neo_ads_is_amp_request()) {
        return;
    }
    // AMP requires the custom element script inside <head>.
    echo '<script async custom-element="amp-auto-ads" src="https://cdn.ampproject.org/v0/amp-auto-ads-0.1.js"></script>' . "\n";
}
add_action('wp_head', 'neo_ads_amp_head', 20);

function neo_ads_amp_body(): void {
    if (!neo_ads_is_amp_request()) {
        return;
    }
    echo '<amp-auto-ads type="adsense" data-ad-client="ca-pub-7219200716649339"></amp-auto-ads>' . "\n";
}
add_action('wp_body_open', 'neo_ads_amp_body', 20);

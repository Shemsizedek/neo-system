<?php
defined('ABSPATH') || exit;

/** TokenScan snapshot, not an executable offer or proof of trade freshness. */
function neo_stewardship_market_references() {
    $references = array();
    foreach (array('TEMPLEBOND', 'PLEDGEBOND') as $asset) {
        $key = 'neo_stewardship_market_' . strtolower($asset);
        $cached = get_transient($key);
        if (is_array($cached) && isset($cached['expiresAt']) && $cached['expiresAt'] > time() * 1000) {
            $references[$asset] = $cached;
            continue;
        }
        $url = 'https://tokenscan.io/api/asset/' . $asset;
        $response = wp_remote_get($url, array('timeout' => 6, 'redirection' => 0, 'limit_response_size' => 65536));
        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            continue;
        }
        $data = json_decode(wp_remote_retrieve_body($response), true);
        if (!is_array($data) || !isset($data['asset'], $data['issuer']) || $data['asset'] !== $asset ||
            $data['issuer'] !== '1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8') {
            continue;
        }
        $price = isset($data['market_info']['btc']['price']) ? $data['market_info']['btc']['price'] : '';
        if (!is_string($price) || !preg_match('/^([0-9]{1,7})[.]([0-9]{1,8})$/', $price, $parts)) {
            continue;
        }
        $sats = ((int) $parts[1] * 100000000) + (int) str_pad($parts[2], 8, '0');
        if ($sats <= 0) {
            continue;
        }
        $now = time() * 1000;
        $references[$asset] = array(
            'currency' => 'BTC',
            'unitPriceMinor' => (string) $sats,
            'feeAllowanceMinor' => '2000',
            'spreadBps' => '200',
            'processorFeeBps' => '0',
            'roundingMinor' => '1000',
            'source' => $url,
            'referenceId' => $asset . '-snapshot-' . (string) $now,
            'observedAt' => $now,
            'expiresAt' => $now + 300000,
            'referenceType' => 'retrieved_snapshot',
            'upstreamTradeTimeKnown' => false
        );
        set_transient($key, $references[$asset], 60);
    }
    return $references;
}

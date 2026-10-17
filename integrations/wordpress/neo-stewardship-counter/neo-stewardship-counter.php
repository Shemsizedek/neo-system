<?php
/**
 * Plugin Name: NEO Counter Holy Stewardship
 * Description: Page-specific stewardship checkout review. Itemized market-reference checkout preview.
 * Version: 0.12.0
 */
defined('ABSPATH') || exit;
require_once __DIR__ . '/market.php';
require_once __DIR__ . '/form144.php';
require_once __DIR__ . '/payment.php';
require_once __DIR__ . '/currencies.php';
add_shortcode('neo_stewardship_counter', function () {
    if (!is_page('holy-stewardship')) {
        return '';
    }
    $ledger = isset($_GET['neo_ledger']) && is_string($_GET['neo_ledger']) ? sanitize_key($_GET['neo_ledger']) : '';
    if (!in_array($ledger,array('classic','cp20'),true)) $ledger = '';
    $ledger_hosts = array('classic'=>'https://classic.tokenscan.io','cp20'=>'https://cp20.tokenscan.io');
    $explorer = $ledger ? $ledger_hosts[$ledger] : 'https://tokenscan.io';
    $selected_currency = neo_stewardship_selected_currency();
    $currency_is_btc = $selected_currency['id'] === 'btc';
    $received144 = neo_stewardship_form144_received();
    $id = wp_unique_id('neo-stewardship-');
    // Only trusted server-side adapters supply quote inputs. Never use query parameters.
    $references = $currency_is_btc ? apply_filters('neo_stewardship_quote_references', neo_stewardship_market_references($ledger)) : array();
    if (!is_array($references)) {
        $references = array();
    }
    $references = array_intersect_key($references, array('TEMPLEBOND' => true, 'PLEDGEBOND' => true));
    ob_start();
    ?>
    <section data-selected-ledger="<?php echo esc_attr($ledger); ?>" data-currency="<?php echo esc_attr($selected_currency['id']); ?>" data-ledger-explorer="<?php echo esc_url($explorer); ?>" data-form144-received="<?php echo $received144 ? '1' : '0'; ?>" id="<?php echo esc_attr($id); ?>" aria-label="NEO Counter stewardship checkout">
      <style>
      #<?php echo esc_attr($id); ?>{background:#edf3e9;color:#152b20;padding:clamp(20px,4vw,40px);border-radius:18px;margin:24px 0}
      #<?php echo esc_attr($id); ?> label{display:block;margin:18px 0}
      #<?php echo esc_attr($id); ?> select,#<?php echo esc_attr($id); ?> input[type=number]{display:block;width:100%;padding:12px;margin-top:8px;box-sizing:border-box;font:inherit}
      #<?php echo esc_attr($id); ?> button{background:#194b36;color:white;padding:14px 22px;border:0;border-radius:8px;font:inherit;cursor:pointer}
      #<?php echo esc_attr($id); ?> [hidden]{display:none}
      #<?php echo esc_attr($id); ?> output{display:block;margin-top:24px;white-space:pre-line}
#<?php echo esc_attr($id); ?> .neo-heading{display:flex;justify-content:space-between;align-items:start;gap:16px;flex-wrap:wrap;margin-bottom:22px}
#<?php echo esc_attr($id); ?> .neo-heading h2{font-size:32px;margin:0;color:#194b36}
#<?php echo esc_attr($id); ?> .neo-eyebrow{font-size:12px;font-weight:700;letter-spacing:.12em}
#<?php echo esc_attr($id); ?> .neo-badge{background:#f4e9c9;color:#655018;border-radius:20px;padding:6px 12px;font-size:12px}
#<?php echo esc_attr($id); ?> .neo-layout{align-items:start;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:18px}
#<?php echo esc_attr($id); ?> .neo-card{background:white;border:1px solid #dce4d7;border-radius:12px;padding:20px;margin-bottom:14px;min-width:0}
#<?php echo esc_attr($id); ?> .neo-receipt{border-top:4px solid #194b36}
#<?php echo esc_attr($id); ?> summary{cursor:pointer;font-weight:600;min-height:30px}
#<?php echo esc_attr($id); ?> output{font-size:clamp(20px,3vw,30px);font-weight:700;overflow-wrap:anywhere}
#<?php echo esc_attr($id); ?> .neo-small{font-size:13px;color:#53645a}
#<?php echo esc_attr($id); ?> select,#<?php echo esc_attr($id); ?> input[type=number],#<?php echo esc_attr($id); ?> input[type=text]{border:1px solid #a7b8ac;border-radius:7px;color:#152b20;background:white;max-width:100%;min-height:46px}
#<?php echo esc_attr($id); ?> p{margin:10px 0} #<?php echo esc_attr($id); ?> a{color:#194b36}
@media(max-width:680px){#<?php echo esc_attr($id); ?> .neo-layout{grid-template-columns:1fr}}
#<?php echo esc_attr($id); ?> select[name=purpose]{font-size:14px}
#<?php echo esc_attr($id); ?> input[type=text]{display:block;width:100%;padding:12px;font:inherit;box-sizing:border-box;margin-top:8px}
      </style>
<div class="neo-heading"><div><p class="neo-eyebrow">HOLY STEWARDSHIP</p><h2>NEO Counter</h2><p>Choose your bond and see your estimate.</p></div><span class="neo-badge">Payments coming soon</span></div><div class="neo-layout"><div class="neo-card"><form data-quote-form><label>Your bond<select name="purpose"><option value="patronage">PLEDGEBOND: member patronage</option><option value="adept">TEMPLEBOND: Adept commitment</option></select></label><label>Quantity<input name="quantity" type="number" min="1" max="999999" step="1" value="1" required></label></form><details <?php if (!$ledger) echo 'open'; ?>><summary>Currency &amp; wallet settings</summary>      <form method="get" action="<?php echo esc_url(home_url('/holy-stewardship/')); ?>">
        <label>Wallet version
          <select name="neo_ledger" required>
            <option value="">Choose wallet version</option>
            <option value="cp20" <?php selected($ledger,'cp20'); ?>>Counterparty 2.0</option>
            <option value="classic" <?php selected($ledger,'classic'); ?>>Counterparty Classic</option>
          </select>
        </label>
        <label>Currency
          <select name="neo_currency">
            <?php foreach (neo_stewardship_currency_catalog() as $currency) : ?>
              <option value="<?php echo esc_attr($currency['id']); ?>" <?php selected($selected_currency['id'],$currency['id']); ?>><?php echo esc_html($currency['symbol'] . ' — ' . $currency['name']); ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <button type="submit">Update estimate</button>
      </form>
</details></div><aside class="neo-card neo-receipt"><p class="neo-eyebrow">ESTIMATED TOTAL</p><output data-total aria-live="polite">—</output><p data-price-status>Choose your wallet version to see pricing.</p><details><summary>Price breakdown</summary><p>Bond value: <span data-subtotal>—</span></p><p>Fees &amp; rounding: <span data-fees>—</span></p><p class="neo-small">Includes a 2% spread and a 2,000-satoshi fee allowance, rounded up to 1,000 satoshis. Actual fees may differ. TokenScan prices are market references.</p></details><p class="neo-small">No payment is taken here yet.</p></aside></div>
      <details id="neo-form144" class="neo-card" <?php if (isset($_GET['form144'])) echo 'open'; ?>><summary>Form 144 — <?php echo $received144 ? 'Received' : 'Required for all members'; ?></summary>
        
        <p><a href="https://holytemples.org/temple-membership/">Membership instructions</a> · <a href="https://www.dropbox.com/scl/fi/fqk2q8k1w3mf0zkxw3akp/Naturalization-Form-144.pdf?rlkey=f98kc5z3cqcvc3bjryxcv1sy9&amp;dl=0" target="_blank" rel="noopener noreferrer">Download Naturalization Form 144</a></p>
        <?php if ($received144) : ?>
          <p role="status">Form 144 received. Membership review is pending.</p>
        <?php else : ?>
          <p>Upload your completed Form 144 before continuing.</p>
        <?php endif; ?>
        <?php if (isset($_GET['form144']) && $_GET['form144'] === 'invalid') : ?>
          <p role="alert">Upload unsuccessful. Select a completed PDF up to 2 MB and confirm completion.</p>
        <?php endif; ?>
        <?php if (is_user_logged_in()) : ?>
          <form method="post" enctype="multipart/form-data" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="neo_form144_upload">
            <?php wp_nonce_field('neo_form144_upload'); ?>
            <label>Completed Form 144 (PDF, maximum 2 MB)
              <input type="file" name="form144" accept="application/pdf,.pdf" required>
            </label>
            <label><input type="checkbox" name="completed144" value="1" required> I confirm this is my completed Form 144 and submit it for Temple membership review.</label>
            <p>Your document is stored privately for authorized Temple administrators. It is not published or recorded on a blockchain.</p>
            <button type="submit">Upload completed Form 144</button>
          </form>
        <?php else : ?>
          <p><a href="<?php echo esc_url(wp_login_url(home_url('/holy-stewardship/#neo-form144'))); ?>">Sign in to upload Form 144 privately</a></p>
        <?php endif; ?>
      </details>
      <details class="neo-card"><summary>Bond information</summary><p><a href="https://tokenscan.io/asset/TEMPLEBOND" target="_blank" rel="noopener noreferrer">TEMPLEBOND — TokenScan asset information</a><br>
      <a href="https://tokenscan.io/asset/PLEDGEBOND" target="_blank" rel="noopener noreferrer">PLEDGEBOND — TokenScan asset information</a></p></details>
      <details id="neo-stewardship-gateway" class="neo-card" data-wallet-scanner><summary>Wallet &amp; checkout details</summary>
        
        <div data-wallet-connections>
          <h4>Connect a Counterparty wallet</h4>
          <p>Connect NeoMask or a compatible NEOpay or CounterPay wallet.</p>
          <button type="button" data-connect-member>Connect member wallet</button>
          <?php if (current_user_can('manage_options')) : ?>
            <button type="button" data-connect-merchant>Connect merchant signing wallet</button>
          <?php endif; ?>
          <p data-connect-status aria-live="polite">No wallet account connected on this page.</p>
          <p><a href="https://freewallet.io/" target="_blank" rel="noopener noreferrer">Freewallet / Freewallet Classic</a> — external signing workflow; browser connection requires a compatible bridge.</p>
        </div>
        <?php
        $prepared_id = isset($_GET['neo_prepared']) ? absint($_GET['neo_prepared']) : 0;
        if ($prepared_id && is_user_logged_in() && get_post_type($prepared_id) === 'neo_steward_order' &&
            (int) get_post_field('post_author',$prepared_id) === get_current_user_id()) :
        ?>
          <p role="status">Checkout prepared. Indenture acknowledgment recorded; payment has not been requested and tokens have not been delivered.</p>
        <?php endif; ?>
        <?php if ($received144 && $ledger && $currency_is_btc) : ?>
          <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="neo_stewardship_prepare">
            <input type="hidden" name="currency" value="btc">
            <input type="hidden" name="ledger" value="<?php echo esc_attr($ledger); ?>">
            <input type="hidden" name="terms_hash" value="<?php echo esc_attr(hash('sha256',neo_stewardship_indenture_snapshot())); ?>">
            <?php wp_nonce_field('neo_stewardship_prepare'); ?>
<input type="hidden" name="asset" value="PLEDGEBOND" data-order-asset><input type="hidden" name="quantity" value="1" data-order-quantity>
            <label>Your receiving wallet
              <input name="wallet" type="text" autocomplete="off" spellcheck="false" required placeholder="Legacy mainnet address beginning with 1">
            </label>
            <button type="button" data-scan-wallet>Scan wallet QR</button>
            <button type="button" data-stop-scan hidden>Stop camera</button>
            <video hidden playsinline muted style="max-width:100%"></video>
            <p data-scan-status aria-live="polite">Scan or paste your own receiving address. Never enter a seed phrase or private key.</p>
            <label><input type="checkbox" name="accept_indent" value="1" required> I have read the Indenture above and acknowledge its terms for my selected instrument. Preparing checkout alone does not complete payment or fulfill the Indenture.</label>
            <button type="submit">Save checkout details</button>
          </form>
        <?php else : ?>
          <p>Select a ledger, sign in and upload completed Form 144 to prepare checkout.</p>
        <?php endif; ?>
      </details>
      <script type="module">
        import { mountWalletConnections } from <?php echo wp_json_encode(add_query_arg('ver','0.9.0',plugins_url('wallet-connect.mjs', __FILE__))); ?>;
        const connectRoot = document.querySelector('[data-wallet-connections]');
        if (connectRoot) mountWalletConnections(connectRoot);
        import { mountWalletScanner } from <?php echo wp_json_encode(plugins_url('wallet-scanner.mjs', __FILE__)); ?>;
        const scanRoot = document.querySelector('[data-wallet-scanner]');
        if (scanRoot && scanRoot.querySelector('[data-scan-wallet]')) mountWalletScanner(scanRoot);
        import { mountStewardship } from <?php echo wp_json_encode(add_query_arg('ver','0.12.0',plugins_url('checkout.mjs', __FILE__)), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
        mountStewardship(
          document.getElementById(<?php echo wp_json_encode($id); ?>),
          <?php echo wp_json_encode($references, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>
        );
      </script>
    </section>
    <?php
    return ob_get_clean();
});

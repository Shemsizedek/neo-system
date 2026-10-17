<?php
/**
 * Plugin Name: NEO Counter Holy Stewardship
 * Description: Page-specific stewardship checkout review. Itemized market-reference checkout preview.
 * Version: 0.8.0
 */
defined('ABSPATH') || exit;
require_once __DIR__ . '/market.php';
require_once __DIR__ . '/form144.php';
require_once __DIR__ . '/payment.php';
add_shortcode('neo_stewardship_counter', function () {
    if (!is_page('holy-stewardship')) {
        return '';
    }
    $ledger = isset($_GET['neo_ledger']) && is_string($_GET['neo_ledger']) ? sanitize_key($_GET['neo_ledger']) : '';
    if (!in_array($ledger,array('classic','cp20'),true)) $ledger = '';
    $ledger_hosts = array('classic'=>'https://classic.tokenscan.io','cp20'=>'https://cp20.tokenscan.io');
    $explorer = $ledger ? $ledger_hosts[$ledger] : 'https://tokenscan.io';
    $received144 = neo_stewardship_form144_received();
    $id = wp_unique_id('neo-stewardship-');
    // Only trusted server-side adapters supply quote inputs. Never use query parameters.
    $references = apply_filters('neo_stewardship_quote_references', neo_stewardship_market_references($ledger));
    if (!is_array($references)) {
        $references = array();
    }
    $references = array_intersect_key($references, array('TEMPLEBOND' => true, 'PLEDGEBOND' => true));
    ob_start();
    ?>
    <section data-ledger-explorer="<?php echo esc_url($explorer); ?>" data-form144-received="<?php echo $received144 ? '1' : '0'; ?>" id="<?php echo esc_attr($id); ?>" aria-label="NEO Counter stewardship checkout">
      <style>
      #<?php echo esc_attr($id); ?>{background:#edf3e9;color:#152b20;padding:clamp(20px,4vw,40px);border-radius:18px;margin:24px 0}
      #<?php echo esc_attr($id); ?> label{display:block;margin:18px 0}
      #<?php echo esc_attr($id); ?> select,#<?php echo esc_attr($id); ?> input[type=number]{display:block;width:100%;padding:12px;margin-top:8px;box-sizing:border-box;font:inherit}
      #<?php echo esc_attr($id); ?> button{background:#194b36;color:white;padding:14px 22px;border:0;border-radius:8px;font:inherit;cursor:pointer}
      #<?php echo esc_attr($id); ?> [hidden]{display:none}
      #<?php echo esc_attr($id); ?> output{display:block;margin-top:24px;white-space:pre-line}
      </style>
      <p>WORLD TEMPLE · HOLY STEWARDSHIP</p>
      <h2>NEO Counter</h2>
      <p>Choose your stewardship instrument and review your participation here.</p>
      <p><strong>Sandbox preview — payments and token delivery are not active.</strong></p>
      <form method="get" action="<?php echo esc_url(home_url('/holy-stewardship/')); ?>">
        <label>Counterparty ledger
          <select name="neo_ledger" required>
            <option value="">Select the ledger used by your wallet</option>
            <option value="cp20" <?php selected($ledger,'cp20'); ?>>Counterparty 2.0</option>
            <option value="classic" <?php selected($ledger,'classic'); ?>>Counterparty Classic</option>
          </select>
        </label>
        <button type="submit">Use selected ledger</button>
      </form>
      <p>Bitcoin mainnet payments share the Bitcoin network. Token balances, pricing and delivery are verified separately on the selected Counterparty ledger. No automatic conversion between ledgers occurs.</p>
      <form data-quote-form>
        <label>Participation path
          <select name="purpose" required>
            <option value="patronage">PLEDGEBOND: member patronage</option>
            <option value="adept">TEMPLEBOND: Adept commitment</option>
          </select>
        </label>
        <p data-description>PLEDGEBOND represents member participation and stewardship pledges.</p>
        <label>Token quantity to review
          <input name="quantity" type="number" min="1" max="999999" step="1" value="1" required>
        </label>
        <p>Preview pricing: 2% market spread plus a 2,000-satoshi estimated fee reserve, rounded up to the next 1,000 satoshis. Actual fees may differ. TokenScan prices are market references; the time of the underlying trade is unavailable.</p>
        <p data-price-status aria-live="polite">Loading quote availability…</p>
        <p><a data-asset href="https://tokenscan.io/asset/PLEDGEBOND" target="_blank" rel="noopener noreferrer">View PLEDGEBOND on TokenScan</a></p>
        <label><input name="acknowledge" type="checkbox" required> I understand this is a preview and creates no payment, token holding, membership recognition or insurance coverage.</label>
        <button type="submit" <?php disabled(!$received144 || !$ledger); ?>>Review stewardship selection</button>
      </form>
      <div id="neo-form144">
        <h3>Required for all members: completed Form 144</h3>
        <p><a href="https://holytemples.org/temple-membership/">Membership instructions</a> · <a href="https://www.dropbox.com/scl/fi/fqk2q8k1w3mf0zkxw3akp/Naturalization-Form-144.pdf?rlkey=f98kc5z3cqcvc3bjryxcv1sy9&amp;dl=0" target="_blank" rel="noopener noreferrer">Download Naturalization Form 144</a></p>
        <?php if ($received144) : ?>
          <p role="status">Form 144 received — pending review. Receipt does not certify completeness or approve membership.</p>
        <?php else : ?>
          <p>Upload your completed Form 144 before reviewing either bond selection.</p>
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
      </div>
      <output aria-live="polite"></output>
      <p><a href="https://tokenscan.io/asset/TEMPLEBOND" target="_blank" rel="noopener noreferrer">TEMPLEBOND — TokenScan asset information</a><br>
      <a href="https://tokenscan.io/asset/PLEDGEBOND" target="_blank" rel="noopener noreferrer">PLEDGEBOND — TokenScan asset information</a></p>
      <div id="neo-stewardship-gateway" data-wallet-scanner>
        <h3>NEO Counter — wallet and checkout</h3>
        <div data-wallet-connections>
          <h4>Connect a Counterparty wallet</h4>
          <p>NEOpay, CounterPay and other wallets can connect through the NEOpay-compatible browser signer interface. The wallet must expose its provider on this page; opening another tab does not connect it automatically.</p>
          <button type="button" data-connect-member>Connect member wallet</button>
          <?php if (current_user_can('manage_options')) : ?>
            <button type="button" data-connect-merchant>Connect merchant signing wallet</button>
          <?php endif; ?>
          <p data-connect-status aria-live="polite">No wallet account connected on this page.</p>
          <p><a href="https://freewallet.io/" target="_blank" rel="noopener noreferrer">Freewallet / Freewallet Classic</a> — external signing workflow; browser connection requires a compatible bridge.</p>
        </div>
        <p>Treasury confirmed: 1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8. Freewallet is the designated signing wallet. Payment collection awaits a tested signing and token-delivery connection; no payable QR code is issued yet.</p>
        <?php
        $prepared_id = isset($_GET['neo_prepared']) ? absint($_GET['neo_prepared']) : 0;
        if ($prepared_id && is_user_logged_in() && get_post_type($prepared_id) === 'neo_steward_order' &&
            (int) get_post_field('post_author',$prepared_id) === get_current_user_id()) :
        ?>
          <p role="status">Checkout prepared. Indenture acknowledgment recorded; payment has not been requested and tokens have not been delivered.</p>
        <?php endif; ?>
        <?php if ($received144 && $ledger) : ?>
          <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="neo_stewardship_prepare">
            <input type="hidden" name="ledger" value="<?php echo esc_attr($ledger); ?>">
            <input type="hidden" name="terms_hash" value="<?php echo esc_attr(hash('sha256',neo_stewardship_indenture_snapshot())); ?>">
            <?php wp_nonce_field('neo_stewardship_prepare'); ?>
            <label>Instrument
              <select name="asset"><option value="PLEDGEBOND">PLEDGEBOND: member patronage</option><option value="TEMPLEBOND">TEMPLEBOND: Adept commitment</option></select>
            </label>
            <label>Whole token quantity<input type="number" name="quantity" min="1" max="999999" step="1" value="1" required></label>
            <label>Your Counterparty-compatible delivery wallet
              <input name="wallet" type="text" autocomplete="off" spellcheck="false" required placeholder="Legacy mainnet address beginning with 1">
            </label>
            <button type="button" data-scan-wallet>Scan wallet QR</button>
            <button type="button" data-stop-scan hidden>Stop camera</button>
            <video hidden playsinline muted style="max-width:100%"></video>
            <p data-scan-status aria-live="polite">Scan or paste your own receiving address. Never enter a seed phrase or private key.</p>
            <label><input type="checkbox" name="accept_indent" value="1" required> I have read the Indenture above and acknowledge its terms for my selected instrument. Preparing checkout alone does not complete payment or fulfill the Indenture.</label>
            <button type="submit">Prepare checkout — no payment</button>
          </form>
        <?php else : ?>
          <p>Select a ledger, sign in and upload completed Form 144 to prepare checkout.</p>
        <?php endif; ?>
      </div>
      <script type="module">
        import { mountWalletConnections } from <?php echo wp_json_encode(add_query_arg('ver','0.8.0',plugins_url('wallet-connect.mjs', __FILE__))); ?>;
        const connectRoot = document.querySelector('[data-wallet-connections]');
        if (connectRoot) mountWalletConnections(connectRoot);
        import { mountWalletScanner } from <?php echo wp_json_encode(plugins_url('wallet-scanner.mjs', __FILE__)); ?>;
        const scanRoot = document.querySelector('[data-wallet-scanner]');
        if (scanRoot && scanRoot.querySelector('[data-scan-wallet]')) mountWalletScanner(scanRoot);
        import { mountStewardship } from <?php echo wp_json_encode(add_query_arg('ver','0.7.0',plugins_url('checkout.mjs', __FILE__)), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
        mountStewardship(
          document.getElementById(<?php echo wp_json_encode($id); ?>),
          <?php echo wp_json_encode($references, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>
        );
      </script>
    </section>
    <?php
    return ob_get_clean();
});

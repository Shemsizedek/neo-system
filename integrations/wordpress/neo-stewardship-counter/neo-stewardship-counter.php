<?php
/**
 * Plugin Name: NEO Counter Holy Stewardship
 * Description: Page-specific stewardship checkout review. Itemized market-reference checkout preview.
 * Version: 0.4.0
 */
defined('ABSPATH') || exit;
require_once __DIR__ . '/market.php';
require_once __DIR__ . '/form144.php';
add_shortcode('neo_stewardship_counter', function () {
    if (!is_page('holy-stewardship')) {
        return '';
    }
    $received144 = neo_stewardship_form144_received();
    $id = wp_unique_id('neo-stewardship-');
    // Only trusted server-side adapters supply quote inputs. Never use query parameters.
    $references = apply_filters('neo_stewardship_quote_references', neo_stewardship_market_references());
    if (!is_array($references)) {
        $references = array();
    }
    $references = array_intersect_key($references, array('TEMPLEBOND' => true, 'PLEDGEBOND' => true));
    ob_start();
    ?>
    <section data-form144-received="<?php echo $received144 ? '1' : '0'; ?>" id="<?php echo esc_attr($id); ?>" aria-label="NEO Counter stewardship checkout">
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
      <form>
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
        <button type="submit" <?php disabled(!$received144); ?>>Review stewardship selection</button>
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
      <script type="module">
        import { mountStewardship } from <?php echo wp_json_encode(plugins_url('checkout.mjs', __FILE__), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
        mountStewardship(
          document.getElementById(<?php echo wp_json_encode($id); ?>),
          <?php echo wp_json_encode($references, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>
        );
      </script>
    </section>
    <?php
    return ob_get_clean();
});

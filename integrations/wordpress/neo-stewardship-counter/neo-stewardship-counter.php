<?php
/**
 * Plugin Name: NEO Counter Holy Stewardship
 * Description: Page-specific stewardship checkout review. Itemized market-reference checkout preview.
 * Version: 0.2.0
 */
defined('ABSPATH') || exit;
add_shortcode('neo_stewardship_counter', function () {
    if (!is_page('holy-stewardship')) {
        return '';
    }
    $id = wp_unique_id('neo-stewardship-');
    // Only trusted server-side adapters supply quote inputs. Never use query parameters.
    $references = apply_filters('neo_stewardship_quote_references', array());
    if (!is_array($references)) {
        $references = array();
    }
    $references = array_intersect_key($references, array('TEMPLEBOND' => true, 'PLEDGEBOND' => true));
    ob_start();
    ?>
    <section id="<?php echo esc_attr($id); ?>" aria-label="NEO Counter stewardship checkout">
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
            <option value="patronage">Temple citizen — pledge patronage</option>
            <option value="apprentice">New apprentice — request protection information</option>
            <option value="adept">Adept — Temple commitment</option>
          </select>
        </label>
        <p data-description>PLEDGEBOND represents member participation and stewardship pledges.</p>
        <p data-protection hidden>Apprentice protection requires a separate review of eligibility, benefits, provider and coverage terms. This preview does not issue insurance or activate coverage.</p>
        <label>Token quantity to review
          <input name="quantity" type="number" min="1" max="999999" step="1" value="1" required>
        </label>
        <p data-price-status aria-live="polite">Loading quote availability…</p>
        <p><a data-asset href="https://tokenscan.io/asset/PLEDGEBOND" target="_blank" rel="noopener noreferrer">View PLEDGEBOND on TokenScan</a></p>
        <label><input name="acknowledge" type="checkbox" required> I understand this is a preview and creates no payment, token holding, membership recognition or insurance coverage.</label>
        <button type="submit">Review stewardship selection</button>
      </form>
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

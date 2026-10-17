<?php
/**
 * Plugin Name: NEO Counter Holy Stewardship
 * Description: Page-specific stewardship checkout review. Gate 1 sandbox only.
 * Version: 0.1.0
 */
defined('ABSPATH') || exit;
add_shortcode('neo_stewardship_counter', function () {
    if (!is_page('holy-stewardship')) {
        return '';
    }
    $id = wp_unique_id('neo-stewardship-');
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
        <p>Pricing, fees and payment instructions will appear after the Temple confirms the instrument terms.</p>
        <p><a data-asset href="https://tokenscan.io/asset/PLEDGEBOND" target="_blank" rel="noopener noreferrer">View PLEDGEBOND on TokenScan</a></p>
        <label><input name="acknowledge" type="checkbox" required> I understand this is a preview and creates no payment, token holding, membership recognition or insurance coverage.</label>
        <button type="submit">Review stewardship selection</button>
      </form>
      <output aria-live="polite"></output>
      <script>
      (() => {
        const root = document.getElementById(<?php echo wp_json_encode($id); ?>);
        const form = root.querySelector('form');
        const output = root.querySelector('output');
        const select = form.elements.purpose;
        const asset = () => select.value === 'adept' ? 'TEMPLEBOND' : 'PLEDGEBOND';
        const update = () => {
          const symbol = asset();
          root.querySelector('[data-description]').textContent = symbol === 'TEMPLEBOND'
            ? 'TEMPLEBOND represents an Adept’s deeper commitment to the Temple mission.'
            : 'PLEDGEBOND represents member participation and stewardship pledges.';
          root.querySelector('[data-protection]').hidden = select.value !== 'apprentice';
          const link = root.querySelector('[data-asset]');
          link.href = 'https://tokenscan.io/asset/' + symbol;
          link.textContent = 'View ' + symbol + ' on TokenScan';
          output.textContent = '';
        };
        form.addEventListener('input', () => { output.textContent = ''; });
        select.addEventListener('change', update);
        form.addEventListener('submit', event => {
          event.preventDefault();
          if (!form.reportValidity()) return;
          const quantity = Number(form.elements.quantity.value);
          if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999999) return;
          output.textContent = [
            'Stewardship selection preview',
            'Service: holy-stewardship',
            'Path: ' + select.options[select.selectedIndex].text,
            'Instrument: ' + asset(),
            'Requested quantity: ' + quantity,
            'Price: awaiting verified Temple terms',
            'Status: PREVIEW — no order submitted or payment requested',
            'No insurance coverage or token delivery has been activated.'
          ].join('\n');
        });
        update();
      })();
      </script>
    </section>
    <?php
    return ob_get_clean();
});

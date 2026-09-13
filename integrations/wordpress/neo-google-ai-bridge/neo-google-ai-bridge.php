<?php
/**
 * Plugin Name: NEO Google AI Bridge
 * Description: Secure WordPress bridge for Gemini API, Gemini Gems launch/mirror workflows, Google Labs apps, and the NEO Opal Bridge.
 * Version: 1.1.0
 * Author: NEO System
 * Requires at least: 6.5
 * Requires PHP: 8.1
 */

if (!defined('ABSPATH')) exit;

define('NEO_GOOGLE_AI_VERSION', '1.1.0');
define('NEO_GOOGLE_AI_REST', 'neo-google-ai/v1');
define('NEO_OPAL_BRIDGE_DEFAULT', 'https://opal.holytemples.org');
define('NEO_GEMINI_API_DEFAULT', 'https://generativelanguage.googleapis.com/v1beta');

function neo_google_ai_get_options() {
    $defaults = array(
        'opal_bridge_url' => NEO_OPAL_BRIDGE_DEFAULT,
        'gemini_api_base' => NEO_GEMINI_API_DEFAULT,
        'default_model' => 'gemini-3.8-flash',
        'allow_public_generation' => false,
        'apps' => array(),
        'gems' => array(),
    );
    $saved = get_option('neo_google_ai_settings', array());
    return wp_parse_args(is_array($saved) ? $saved : array(), $defaults);
}

function neo_google_ai_crypto_key() {
    return hash('sha256', wp_salt('auth'), true);
}

function neo_google_ai_encrypt_secret($value) {
    if ($value === '' || !function_exists('openssl_encrypt')) return '';
    $iv = random_bytes(16);
    $cipher = openssl_encrypt($value, 'AES-256-CBC', neo_google_ai_crypto_key(), OPENSSL_RAW_DATA, $iv);
    return $cipher === false ? '' : base64_encode($iv . $cipher);
}

function neo_google_ai_decrypt_secret($value) {
    if (!$value || !function_exists('openssl_decrypt')) return '';
    $raw = base64_decode($value, true);
    if ($raw === false || strlen($raw) <= 16) return '';
    $iv = substr($raw, 0, 16);
    $cipher = substr($raw, 16);
    $plain = openssl_decrypt($cipher, 'AES-256-CBC', neo_google_ai_crypto_key(), OPENSSL_RAW_DATA, $iv);
    return is_string($plain) ? $plain : '';
}

function neo_google_ai_api_key() {
    if (defined('NEO_GEMINI_API_KEY') && NEO_GEMINI_API_KEY) return NEO_GEMINI_API_KEY;
    $env = getenv('GEMINI_API_KEY');
    if ($env) return $env;
    $o = get_option('neo_google_ai_settings', array());
    return neo_google_ai_decrypt_secret($o['gemini_api_key_enc'] ?? '');
}

function neo_google_ai_admin_menu() {
    add_options_page('NEO Google AI Bridge', 'NEO Google AI', 'manage_options', 'neo-google-ai', 'neo_google_ai_settings_page');
}
add_action('admin_menu', 'neo_google_ai_admin_menu');

function neo_google_ai_register_settings() {
    register_setting('neo_google_ai', 'neo_google_ai_settings', array('sanitize_callback' => 'neo_google_ai_sanitize_settings'));
}
add_action('admin_init', 'neo_google_ai_register_settings');

function neo_google_ai_sanitize_settings($input) {
    $out = neo_google_ai_get_options();
    $out['opal_bridge_url'] = esc_url_raw($input['opal_bridge_url'] ?? NEO_OPAL_BRIDGE_DEFAULT);
    $out['gemini_api_base'] = esc_url_raw($input['gemini_api_base'] ?? NEO_GEMINI_API_DEFAULT);
    $out['default_model'] = sanitize_text_field($input['default_model'] ?? 'gemini-3.8-flash');
    $out['allow_public_generation'] = !empty($input['allow_public_generation']);

    $submitted_key = trim((string)($input['gemini_api_key'] ?? ''));
    if ($submitted_key !== '') {
        $out['gemini_api_key_enc'] = neo_google_ai_encrypt_secret($submitted_key);
    } elseif (!empty($input['clear_gemini_api_key'])) {
        $out['gemini_api_key_enc'] = '';
    }

    foreach (array('apps','gems') as $key) {
        $decoded = json_decode(wp_unslash($input[$key . '_json'] ?? '[]'), true);
        $out[$key] = is_array($decoded) ? neo_google_ai_clean_registry($decoded) : array();
    }
    return $out;
}

function neo_google_ai_clean_registry($items) {
    $clean = array();
    foreach ($items as $item) {
        if (!is_array($item)) continue;
        $slug = sanitize_key($item['slug'] ?? '');
        $name = sanitize_text_field($item['name'] ?? '');
        $url  = esc_url_raw($item['url'] ?? '');
        if (!$slug || !$name || !$url) continue;
        $clean[] = array(
            'slug' => $slug,
            'name' => $name,
            'url' => $url,
            'type' => sanitize_key($item['type'] ?? 'app'),
            'description' => sanitize_text_field($item['description'] ?? ''),
            'instructions' => sanitize_textarea_field($item['instructions'] ?? ''),
        );
    }
    return $clean;
}

function neo_google_ai_settings_page() {
    if (!current_user_can('manage_options')) return;
    $o = neo_google_ai_get_options();
    ?>
    <div class="wrap">
      <h1>NEO Google AI Bridge</h1>
      <p>Connect Gemini generation, Gemini Gems launch/mirror workflows, Google Labs apps, and the NEO Opal Bridge without exposing credentials to browsers.</p>
      <p><strong>Gemini credential:</strong> environment variables still take precedence, but you can now securely store a Gemini API key here. The saved key is encrypted using WordPress salts and is never returned by the public REST endpoints.</p>
      <form method="post" action="options.php">
        <?php settings_fields('neo_google_ai'); ?>
        <table class="form-table"><tbody>
          <tr><th>Opal Bridge URL</th><td><input class="regular-text" name="neo_google_ai_settings[opal_bridge_url]" value="<?php echo esc_attr($o['opal_bridge_url']); ?>"></td></tr>
          <tr><th>Gemini API base</th><td><input class="regular-text" name="neo_google_ai_settings[gemini_api_base]" value="<?php echo esc_attr($o['gemini_api_base']); ?>"></td></tr>
          <tr><th>Default model</th><td><input class="regular-text" name="neo_google_ai_settings[default_model]" value="<?php echo esc_attr($o['default_model']); ?>"></td></tr>
          <tr><th>Gemini API key</th><td><input class="regular-text" type="password" name="neo_google_ai_settings[gemini_api_key]" value="" autocomplete="new-password" placeholder="<?php echo neo_google_ai_api_key() ? esc_attr('Configured — enter a new key to replace') : esc_attr('Paste Gemini API key'); ?>"><p class="description">The key is encrypted at rest with WordPress salts. Leave blank to keep the existing key.</p><?php if (neo_google_ai_api_key()): ?><label><input type="checkbox" name="neo_google_ai_settings[clear_gemini_api_key]" value="1"> Clear stored WordPress Gemini key</label><?php endif; ?></td></tr>
          <tr><th>Public generation</th><td><label><input type="checkbox" name="neo_google_ai_settings[allow_public_generation]" value="1" <?php checked($o['allow_public_generation']); ?>> Allow unauthenticated visitors to call Gemini through WordPress (off by default).</label></td></tr>
          <tr><th>Google Labs apps JSON</th><td><textarea class="large-text code" rows="10" name="neo_google_ai_settings[apps_json]"><?php echo esc_textarea(wp_json_encode($o['apps'], JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)); ?></textarea></td></tr>
          <tr><th>Gems JSON</th><td><textarea class="large-text code" rows="10" name="neo_google_ai_settings[gems_json]"><?php echo esc_textarea(wp_json_encode($o['gems'], JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)); ?></textarea></td></tr>
        </tbody></table>
        <?php submit_button(); ?>
      </form>
      <hr><p><strong>Shortcodes:</strong> <code>[neo_google_ai_hub]</code>, <code>[neo_gemini_chat]</code>, <code>[neo_google_lab_app slug="..."]</code>, <code>[neo_google_gem slug="..."]</code>.</p>
    </div>
    <?php
}

function neo_google_ai_rest_permission($request) {
    $o = neo_google_ai_get_options();
    if (!empty($o['allow_public_generation'])) return true;
    return is_user_logged_in() && current_user_can('read');
}

function neo_google_ai_register_rest() {
    register_rest_route(NEO_GOOGLE_AI_REST, '/status', array('methods'=>'GET','permission_callback'=>'__return_true','callback'=>'neo_google_ai_status'));
    register_rest_route(NEO_GOOGLE_AI_REST, '/catalog', array('methods'=>'GET','permission_callback'=>'__return_true','callback'=>'neo_google_ai_catalog'));
    register_rest_route(NEO_GOOGLE_AI_REST, '/generate', array('methods'=>'POST','permission_callback'=>'neo_google_ai_rest_permission','callback'=>'neo_google_ai_generate'));
}
add_action('rest_api_init', 'neo_google_ai_register_rest');

function neo_google_ai_status() {
    $o = neo_google_ai_get_options();
    return rest_ensure_response(array('ok'=>true,'version'=>NEO_GOOGLE_AI_VERSION,'geminiConfigured'=>(bool)neo_google_ai_api_key(),'opalBridge'=>$o['opal_bridge_url'],'defaultModel'=>$o['default_model'],'labsApps'=>count($o['apps']),'gems'=>count($o['gems'])));
}

function neo_google_ai_catalog() {
    $o = neo_google_ai_get_options();
    return rest_ensure_response(array('apps'=>$o['apps'],'gems'=>array_map(function($g){ unset($g['instructions']); return $g; },$o['gems'])));
}

function neo_google_ai_generate(WP_REST_Request $request) {
    $key = neo_google_ai_api_key();
    if (!$key) return new WP_Error('neo_google_ai_missing_key','Gemini API credential is not configured.',array('status'=>503));
    $o = neo_google_ai_get_options();
    $prompt = sanitize_textarea_field((string)$request->get_param('prompt'));
    $model = sanitize_text_field((string)($request->get_param('model') ?: $o['default_model']));
    $gem_slug = sanitize_key((string)$request->get_param('gem'));
    if ($prompt === '') return new WP_Error('neo_google_ai_empty_prompt','Prompt is required.',array('status'=>400));
    $system = '';
    if ($gem_slug) foreach ($o['gems'] as $gem) if (($gem['slug'] ?? '') === $gem_slug) { $system = (string)($gem['instructions'] ?? ''); break; }
    $body = array('contents'=>array(array('parts'=>array(array('text'=>$prompt)))));
    if ($system !== '') $body['systemInstruction'] = array('parts'=>array(array('text'=>$system)));
    $url = trailingslashit($o['gemini_api_base']) . 'models/' . rawurlencode($model) . ':generateContent';
    $response = wp_remote_post($url,array('timeout'=>60,'headers'=>array('Content-Type'=>'application/json','x-goog-api-key'=>$key),'body'=>wp_json_encode($body)));
    if (is_wp_error($response)) return $response;
    $code = wp_remote_retrieve_response_code($response);
    $json = json_decode(wp_remote_retrieve_body($response),true);
    if ($code < 200 || $code >= 300) return new WP_Error('neo_google_ai_upstream',$json['error']['message'] ?? 'Gemini request failed.',array('status'=>502,'upstream_status'=>$code));
    $text = '';
    foreach (($json['candidates'][0]['content']['parts'] ?? array()) as $part) if (isset($part['text'])) $text .= $part['text'];
    return rest_ensure_response(array('ok'=>true,'model'=>$model,'text'=>$text,'usage'=>$json['usageMetadata'] ?? null));
}

function neo_google_ai_enqueue() {
    wp_register_style('neo-google-ai', plugins_url('assets/neo-google-ai.css', __FILE__), array(), NEO_GOOGLE_AI_VERSION);
    wp_register_script('neo-google-ai', plugins_url('assets/neo-google-ai.js', __FILE__), array(), NEO_GOOGLE_AI_VERSION, true);
    wp_localize_script('neo-google-ai','NEOGoogleAI',array('generateUrl'=>esc_url_raw(rest_url(NEO_GOOGLE_AI_REST . '/generate')),'nonce'=>wp_create_nonce('wp_rest')));
}
add_action('wp_enqueue_scripts','neo_google_ai_enqueue');

function neo_google_ai_assets(){ wp_enqueue_style('neo-google-ai'); wp_enqueue_script('neo-google-ai'); }

function neo_gemini_chat_shortcode($atts=array()) {
    neo_google_ai_assets(); $o=neo_google_ai_get_options();
    $atts=shortcode_atts(array('model'=>$o['default_model'],'gem'=>'','title'=>'NEO Gemini'),$atts,'neo_gemini_chat');
    ob_start(); ?>
    <section class="neo-google-ai-chat" data-model="<?php echo esc_attr($atts['model']); ?>" data-gem="<?php echo esc_attr(sanitize_key($atts['gem'])); ?>">
      <h3><?php echo esc_html($atts['title']); ?></h3><div class="neo-google-ai-log" aria-live="polite"></div>
      <form class="neo-google-ai-form"><textarea rows="4" required placeholder="Ask Gemini..."></textarea><button type="submit">Send</button></form>
    </section>
    <?php return ob_get_clean();
}
add_shortcode('neo_gemini_chat','neo_gemini_chat_shortcode');

function neo_google_ai_hub_shortcode() {
    neo_google_ai_assets(); $o=neo_google_ai_get_options(); ob_start(); ?>
    <section class="neo-google-ai-hub"><header><h2>NEO Google AI Hub</h2><p>Gemini • Gems • Google Labs • Opal</p></header><div class="neo-google-ai-grid">
      <a class="neo-google-ai-card" href="https://gemini.google.com/" target="_blank" rel="noopener"><strong>Gemini</strong><span>Open Gemini</span></a>
      <a class="neo-google-ai-card" href="<?php echo esc_url($o['opal_bridge_url']); ?>" target="_blank" rel="noopener"><strong>NEO Opal Bridge</strong><span>Open bridge</span></a>
      <?php foreach (array_merge($o['gems'],$o['apps']) as $item): ?>
      <a class="neo-google-ai-card" href="<?php echo esc_url($item['url']); ?>" target="_blank" rel="noopener"><strong><?php echo esc_html($item['name']); ?></strong><span><?php echo esc_html($item['description'] ?: ucfirst($item['type'])); ?></span></a>
      <?php endforeach; ?></div></section>
    <?php return ob_get_clean();
}
add_shortcode('neo_google_ai_hub','neo_google_ai_hub_shortcode');

function neo_google_ai_find_item($kind,$slug){
    $o=neo_google_ai_get_options();
    foreach($o[$kind] as $item) if(($item['slug'] ?? '')===$slug) return $item;
    return null;
}

function neo_google_lab_app_shortcode($atts=array()) {
    $atts=shortcode_atts(array('slug'=>''),$atts,'neo_google_lab_app');
    $item=neo_google_ai_find_item('apps',sanitize_key($atts['slug']));
    if(!$item) return '';
    return sprintf('<a class="neo-google-ai-launch" href="%s" target="_blank" rel="noopener">Open %s</a>',esc_url($item['url']),esc_html($item['name']));
}
add_shortcode('neo_google_lab_app','neo_google_lab_app_shortcode');

function neo_google_gem_shortcode($atts=array()) {
    $atts=shortcode_atts(array('slug'=>'','mode'=>'launch'),$atts,'neo_google_gem');
    $slug=sanitize_key($atts['slug']); $item=neo_google_ai_find_item('gems',$slug);
    if(!$item) return '';
    if($atts['mode']==='mirror' && !empty($item['instructions'])) return neo_gemini_chat_shortcode(array('gem'=>$slug,'title'=>$item['name']));
    return sprintf('<a class="neo-google-ai-launch" href="%s" target="_blank" rel="noopener">Open %s</a>',esc_url($item['url']),esc_html($item['name']));
}
add_shortcode('neo_google_gem','neo_google_gem_shortcode');

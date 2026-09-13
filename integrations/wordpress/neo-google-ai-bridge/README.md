# NEO Google AI Bridge

WordPress connector for the NEO System Google AI layer.

## Supported lanes

- Gemini API: server-side `generateContent` requests; API credential never reaches browser JavaScript.
- Gemini Gems: official launch URLs plus optional local "mirror" instructions executed through Gemini API.
- Gems from Google Labs / Opal: launch through official share URLs and the existing NEO Opal Bridge.
- Other Google Labs apps: governed launcher registry for supported/public URLs.

## Credential

Preferred production configuration in `wp-config.php`:

```php
define('NEO_GEMINI_API_KEY', getenv('GEMINI_API_KEY'));
```

Do not hard-code the key in the plugin or expose it in JavaScript.

## Shortcodes

- `[neo_google_ai_hub]`
- `[neo_gemini_chat]`
- `[neo_gemini_chat model="gemini-3.8-flash"]`
- `[neo_google_gem slug="my-gem"]`
- `[neo_google_gem slug="my-gem" mode="mirror"]`
- `[neo_google_lab_app slug="my-lab-app"]`

## REST

- `GET /wp-json/neo-google-ai/v1/status`
- `GET /wp-json/neo-google-ai/v1/catalog`
- `POST /wp-json/neo-google-ai/v1/generate`

Generation is authenticated by default. Public generation can be enabled in Settings > NEO Google AI, but doing so may create billable abuse exposure.

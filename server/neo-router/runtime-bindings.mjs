const AIRBYTE_BINDINGS = Object.freeze({
  'airbyte-github': 'AIRBYTE_GITHUB_CONNECTOR_ID',
  'airbyte-gitlab': 'AIRBYTE_GITLAB_CONNECTOR_ID',
  'airbyte-asana': 'AIRBYTE_ASANA_CONNECTOR_ID',
  'airbyte-gmail': 'AIRBYTE_GMAIL_CONNECTOR_ID',
  'airbyte-search-console': 'AIRBYTE_SEARCH_CONSOLE_CONNECTOR_ID',
  'airbyte-tiktok-marketing': 'AIRBYTE_TIKTOK_MARKETING_CONNECTOR_ID',
})

export function resolveRuntimeBindings(env = process.env) {
  return Object.fromEntries(Object.entries(AIRBYTE_BINDINGS).map(([connector, key]) => [connector, {
    connector,
    envKey: key,
    bound: Boolean(env[key]),
    connectorId: env[key] || null,
  }]))
}

export function runtimeBindingHealth(env = process.env) {
  const bindings = resolveRuntimeBindings(env)
  const values = Object.values(bindings)
  return {
    total: values.length,
    bound: values.filter((v) => v.bound).length,
    unbound: values.filter((v) => !v.bound).map((v) => v.envKey),
    bindings,
  }
}

export { AIRBYTE_BINDINGS }

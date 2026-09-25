import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

async function resolveSecret(value) {
  if (!value?.startsWith('sm://')) return value;
  const name = value.slice(5);
  const [version] = await client.accessSecretVersion({ name });
  return version.payload?.data?.toString('utf8') || '';
}

export async function loadConfig() {
  const keys = [
    'TERABOX_API_BASE','TERABOX_AUTHORIZE_URL','TERABOX_TOKEN_URL','TERABOX_CLIENT_ID',
    'TERABOX_CLIENT_SECRET','TERABOX_REDIRECT_URI','TERABOX_SCOPES','NEO_INTERNAL_API_KEY',
    'NEO_GATEWAY_URL','NEO_ROUTER_URL','NEOSYNC_URL','NEO_ORACLE_URL','NEO_APPROVAL_TOKEN'
  ];
  const cfg = { port: Number(process.env.PORT || 8080), env: process.env.NODE_ENV || 'production' };
  for (const key of keys) cfg[key] = await resolveSecret(process.env[key]);
  cfg.enableProductionWrites = process.env.ENABLE_PRODUCTION_WRITES === 'true';
  return cfg;
}

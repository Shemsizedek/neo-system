import { sanitizeSocialSignal } from './social-shield.mjs';

export const SOCIAL_PLATFORMS = Object.freeze(['tiktok','instagram','facebook','threads','youtube','x']);

const PLATFORM_CAPABILITIES = Object.freeze({
  tiktok: Object.freeze(['PROFILE_CHANGE','CONTENT_INTEGRITY_CHANGE','ABUSE_SIGNAL']),
  instagram: Object.freeze(['PROFILE_CHANGE','CONTENT_INTEGRITY_CHANGE','IMPERSONATION_SIGNAL','ABUSE_SIGNAL']),
  facebook: Object.freeze(['PROFILE_CHANGE','ADMIN_ROLE_CHANGE','CONTENT_INTEGRITY_CHANGE','IMPERSONATION_SIGNAL','ABUSE_SIGNAL']),
  threads: Object.freeze(['PROFILE_CHANGE','CONTENT_INTEGRITY_CHANGE','IMPERSONATION_SIGNAL','ABUSE_SIGNAL']),
  youtube: Object.freeze(['PROFILE_CHANGE','ADMIN_ROLE_CHANGE','CONTENT_INTEGRITY_CHANGE','IMPERSONATION_SIGNAL','ABUSE_SIGNAL']),
  x: Object.freeze(['PROFILE_CHANGE','CONTENT_INTEGRITY_CHANGE','IMPERSONATION_SIGNAL','ABUSE_SIGNAL'])
});

export function getPlatformCapabilities(platform) {
  const key = normalizePlatform(platform);
  return Object.freeze({
    platform: key,
    supportedSignals: PLATFORM_CAPABILITIES[key] ?? [],
    sourcePolicy: 'OFFICIAL_API_OR_USER_AUTHORIZED_EXPORT_ONLY',
    credentialsAccepted: false,
    sessionTokensAccepted: false,
    accessControlBypassAllowed: false
  });
}

export function normalizePlatformEvent(input = {}) {
  const platform = normalizePlatform(input.platform);
  if (!SOCIAL_PLATFORMS.includes(platform)) {
    throw new Error('unsupported_social_platform');
  }
  if (!['OFFICIAL_API','USER_AUTHORIZED_EXPORT'].includes(input.sourceType)) {
    throw new Error('unsupported_source_type');
  }
  if (input.password || input.privateKey || input.seedPhrase || input.sessionToken || input.recoveryCode) {
    throw new Error('secret_material_rejected');
  }
  const supported = PLATFORM_CAPABILITIES[platform];
  if (!supported.includes(input.signalType)) {
    return Object.freeze({
      accepted: false,
      reason: 'signal_not_available_from_declared_platform_adapter',
      platform,
      signalType: input.signalType,
      telemetryLimitation: true
    });
  }
  const event = sanitizeSocialSignal({
    platform,
    accountRef: input.accountRef,
    signalType: input.signalType,
    observedAt: input.observedAt,
    corroborated: input.corroborated,
    evidence: buildEvidence(input)
  });
  return Object.freeze({
    accepted: true,
    sourceType: input.sourceType,
    adapterPolicy: 'READ_ONLY_NORMALIZATION',
    mutatesPlatform: false,
    event
  });
}

function buildEvidence(input) {
  const sourceEventId = String(input.sourceEventId ?? 'unavailable').slice(0,160);
  const summary = String(input.summary ?? '').replaceAll('\u0000',' ').slice(0,4000);
  return `source=${input.sourceType}; sourceEventId=${sourceEventId}; summary=${summary}`;
}

function normalizePlatform(platform) {
  return String(platform ?? '').trim().toLowerCase();
}

// Non-secret metadata observed on the official CES login on 2026-10-29.
// This verifies a member session; admin collection needs a separate reviewed route.
export const NMNI_READ_LOGIN_PROFILE = Object.freeze({
  loginPath: '/home/user-login/',
  submitPath: '/rlogin.asp',
  usernameField: 'uid',
  passwordField: 'passwd',
  extraFields: Object.freeze({ action: 'login' }),
  successLocationPattern: '^/memac\\.asp(?:\\?.*)?$',
  authenticatedPath: '/memac.asp',
  authenticatedText: 'Noocratic Open Market Nibiru Index',
});

export function nmniReadiness(env = process.env) {
  const requiredSecrets = ['NEO_CES_NMNI_USERNAME', 'NEO_CES_NMNI_PASSWORD'];
  const missingSecrets = requiredSecrets.filter((key) => !env[key]);
  return {
    exchangeId: 'NMNI',
    mode: 'DRY_RUN',
    credentialsConfigured: missingSecrets.length === 0,
    missingSecrets,
    authenticationVerified: false,
    adminAccessVerified: false,
    liveExecutionEnabled: false,
    loginProfile: NMNI_READ_LOGIN_PROFILE,
  };
}

export function createNmniReadCredentialProvider(env = process.env) {
  return async (exchange) => {
    if (exchange?.exchangeId !== 'NMNI') throw new Error('NMNI login profile cannot authenticate another exchange');
    if (!nmniReadiness(env).credentialsConfigured) throw new Error('NMNI server-side CES credentials are not configured');
    return { ...NMNI_READ_LOGIN_PROFILE, username: env.NEO_CES_NMNI_USERNAME, password: env.NEO_CES_NMNI_PASSWORD };
  };
}

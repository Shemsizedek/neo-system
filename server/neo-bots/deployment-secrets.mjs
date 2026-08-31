const PREFIX='NEO_CES_';

function key(exchangeId,suffix){
  const exchange=String(exchangeId||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'_');
  if(!exchange)throw new Error('exchangeId is required');
  return `${PREFIX}${exchange}_${suffix}`;
}

export function createEnvCesCredentialProvider(env=process.env){
  return async function credentialProvider(exchange){
    const exchangeId=exchange?.exchangeId;
    const username=env[key(exchangeId,'USERNAME')];
    const password=env[key(exchangeId,'PASSWORD')];
    const loginPath=env[key(exchangeId,'LOGIN_PATH')];
    const successLocationPattern=env[key(exchangeId,'SUCCESS_LOCATION_PATTERN')];
    if(!username||!password)throw new Error(`CES deployment credentials are not configured for ${exchangeId}`);
    if(!loginPath)throw new Error(`CES trusted legacy login path is not configured for ${exchangeId}`);
    if(!successLocationPattern)throw new Error(`CES authenticated-session success marker is not configured for ${exchangeId}`);
    return {
      username,
      password,
      loginPath,
      submitPath:env[key(exchangeId,'SUBMIT_PATH')]||loginPath,
      usernameField:env[key(exchangeId,'USERNAME_FIELD')]||'username',
      passwordField:env[key(exchangeId,'PASSWORD_FIELD')]||'password',
      csrfField:env[key(exchangeId,'CSRF_FIELD')]||undefined,
      successLocationPattern,
    };
  };
}

export function cesSecretRequirements(exchangeId){
  return Object.freeze({
    required:[key(exchangeId,'USERNAME'),key(exchangeId,'PASSWORD'),key(exchangeId,'LOGIN_PATH'),key(exchangeId,'SUCCESS_LOCATION_PATTERN')],
    optional:[key(exchangeId,'SUBMIT_PATH'),key(exchangeId,'USERNAME_FIELD'),key(exchangeId,'PASSWORD_FIELD'),key(exchangeId,'CSRF_FIELD')],
  });
}

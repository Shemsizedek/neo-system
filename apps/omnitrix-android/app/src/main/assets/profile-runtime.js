(() => {
  'use strict';

  const STORAGE_KEY = 'neo.omnitrix.profiles.v1';
  const ACTIVE_KEY = 'neo.omnitrix.activeProfile.v1';

  const FOUNDER = Object.freeze({
    schema: 'neo.omnitrix.profile/v2',
    profileId: 'NEO-0001',
    handle: 'NEO',
    displayName: 'NEO',
    profileClass: 'founder',
    status: 'active',
    theme: 'NEO Matrix',
    currencyDisplay: '∞',
    avatarText: 'NEO',
    wallet: {
      publicAddress: '',
      cesAccountNumber: ''
    },
    permissions: {
      systemAdmin: true,
      manageProfiles: true,
      manageApps: true,
      manageWalletBindings: true,
      approveTransactions: true,
      signTransactions: false
    },
    security: {
      localOnly: true,
      secretStorageAllowed: false,
      privateKeyStorageAllowed: false,
      recoveryPhraseStorageAllowed: false
    }
  });

  const clone = obj => JSON.parse(JSON.stringify(obj));

  function sanitize(profile) {
    const p = clone(profile || {});
    delete p.privateKey;
    delete p.seed;
    delete p.seedPhrase;
    delete p.mnemonic;
    delete p.password;
    delete p.passphrase;
    delete p.secret;
    if (p.wallet) {
      delete p.wallet.privateKey;
      delete p.wallet.seed;
      delete p.wallet.mnemonic;
      delete p.wallet.secret;
    }
    return p;
  }

  function loadProfiles() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const list = Array.isArray(raw) ? raw.map(sanitize) : [];
      if (!list.some(p => p.profileId === FOUNDER.profileId)) list.unshift(clone(FOUNDER));
      return list;
    } catch (_) {
      return [clone(FOUNDER)];
    }
  }

  function saveProfiles(profiles) {
    const cleaned = (profiles || []).map(sanitize);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    return cleaned;
  }

  function getActiveProfile() {
    const profiles = loadProfiles();
    const activeId = localStorage.getItem(ACTIVE_KEY) || FOUNDER.profileId;
    return profiles.find(p => p.profileId === activeId) || profiles[0];
  }

  function setActiveProfile(profileId) {
    const p = loadProfiles().find(x => x.profileId === profileId);
    if (!p) throw new Error('Profile not found');
    localStorage.setItem(ACTIVE_KEY, p.profileId);
    return p;
  }

  function updateProfile(profileId, patch) {
    const profiles = loadProfiles();
    const i = profiles.findIndex(p => p.profileId === profileId);
    if (i < 0) throw new Error('Profile not found');
    const current = profiles[i];
    const safePatch = sanitize(patch || {});

    // Founder authority cannot be silently downgraded or transferred by UI state.
    if (current.profileId === FOUNDER.profileId) {
      safePatch.profileId = FOUNDER.profileId;
      safePatch.profileClass = 'founder';
      safePatch.permissions = { ...current.permissions, ...(safePatch.permissions || {}), systemAdmin: true, manageProfiles: true };
    } else {
      safePatch.profileClass = current.profileClass || 'member';
      if (safePatch.permissions) {
        safePatch.permissions.systemAdmin = false;
        safePatch.permissions.manageProfiles = false;
      }
    }

    profiles[i] = sanitize({ ...current, ...safePatch, wallet: { ...(current.wallet || {}), ...(safePatch.wallet || {}) } });
    saveProfiles(profiles);
    return profiles[i];
  }

  function createProfile(input) {
    const active = getActiveProfile();
    if (!active.permissions?.manageProfiles) throw new Error('Active profile cannot create profiles');
    const profiles = loadProfiles();
    const max = profiles.reduce((m, p) => Math.max(m, Number(String(p.profileId || '').replace(/\D/g, '')) || 0), 1);
    const n = String(max + 1).padStart(4, '0');
    const p = sanitize({
      schema: 'neo.omnitrix.profile/v2',
      profileId: `NEO-${n}`,
      handle: input?.handle || `USER${n}`,
      displayName: input?.displayName || input?.handle || `NEO User ${n}`,
      profileClass: 'member',
      status: 'active',
      theme: 'NEO Matrix',
      currencyDisplay: '∞',
      avatarText: (input?.displayName || input?.handle || 'NEO').slice(0, 3).toUpperCase(),
      wallet: { publicAddress: '', cesAccountNumber: '' },
      permissions: {
        systemAdmin: false,
        manageProfiles: false,
        manageApps: false,
        manageWalletBindings: true,
        approveTransactions: true,
        signTransactions: false
      },
      security: {
        localOnly: true,
        secretStorageAllowed: false,
        privateKeyStorageAllowed: false,
        recoveryPhraseStorageAllowed: false
      }
    });
    profiles.push(p);
    saveProfiles(profiles);
    return p;
  }

  saveProfiles(loadProfiles());
  if (!localStorage.getItem(ACTIVE_KEY)) localStorage.setItem(ACTIVE_KEY, FOUNDER.profileId);

  window.NEOProfile = {
    founder: clone(FOUNDER),
    list: loadProfiles,
    active: getActiveProfile,
    activate: setActiveProfile,
    update: updateProfile,
    create: createProfile
  };
})();

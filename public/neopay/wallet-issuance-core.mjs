// Dependency-injected BIP39 issuance core. Private material never enters storage or a network request.
export function makeWalletIssuer({ generateMnemonic, validateMnemonic, mnemonicToSeed, wordlist, attachSeed, clearSigner, getAddress, requireSecureContext }) {
  if (![generateMnemonic, validateMnemonic, mnemonicToSeed, attachSeed, clearSigner, getAddress, requireSecureContext].every(x => typeof x === 'function')) {
    throw new TypeError('Wallet issuer crypto dependencies are incomplete.');
  }
  const normalize = phrase => String(phrase ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  async function attachPhrase(phrase) {
    clearSigner();
    const mnemonic = normalize(phrase);
    if (![12, 24].includes(mnemonic.split(' ').length) || !validateMnemonic(mnemonic, wordlist)) {
      throw new Error('Enter a valid 12- or 24-word BIP39 recovery phrase. Original Counterwallet phrases use the separate legacy recovery option.');
    }
    let seed;
    try {
      seed = await mnemonicToSeed(mnemonic, '');
      if (!(seed instanceof Uint8Array) || seed.length < 32) throw new Error('Wallet seed derivation failed.');
      const derived = attachSeed(seed);
      if (!derived?.address || !derived?.path || getAddress() !== derived.address) throw new Error('Wallet address derivation failed.');
      return { address: derived.address, path: derived.path, mode: 'bip39', addresses: [{address: derived.address, path: derived.path, index: 0}] };
    } catch (error) {
      clearSigner();
      throw error;
    } finally {
      seed?.fill(0);
    }
  }
  return {
    async create() {
      requireSecureContext();
      // 256 bits of browser CSPRNG entropy, encoded as a BIP39 24-word mnemonic.
      const mnemonic = generateMnemonic(wordlist, 256);
      const wallet = await attachPhrase(mnemonic);
      if (mnemonic.split(' ').length !== 24) { clearSigner(); throw new Error('Issued phrase must contain 24 recovery words.'); }
      return { ...wallet, mnemonic };
    },
    async restore(phrase) { requireSecureContext(); return attachPhrase(phrase); },
    clear: clearSigner,
    getAddress,
  };
}

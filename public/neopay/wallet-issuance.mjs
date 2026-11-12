import { generateMnemonic, validateMnemonic, mnemonicToSeed } from 'https://esm.sh/@scure/bip39@2.4.0';
import { wordlist } from 'https://esm.sh/@scure/bip39@2.4.0/wordlists/english.js';
import { makeWalletIssuer } from './wallet-issuance-core.mjs';
import './derived-wallet.mjs';

export const walletIssuer = makeWalletIssuer({
  generateMnemonic, validateMnemonic, mnemonicToSeed, wordlist,
  attachSeed: seed => window.NEODerivedWallet.attachSeed(seed),
  clearSigner: () => window.NEODerivedWallet.clear(),
  getAddress: () => window.NEODerivedWallet.getAddress(),
  requireSecureContext() {
    if (!window.isSecureContext || typeof globalThis.crypto?.getRandomValues !== 'function') {
      throw new Error('Wallet creation and BIP39 recovery require a secure HTTPS browser context.');
    }
  },
});

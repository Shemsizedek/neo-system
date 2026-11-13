import bitcoinMessage from 'bitcoinjs-message';
import bs58check from 'bs58check';

// Legacy Bitcoin Signed Message / P2PKH only. No signing or private keys.
const versions = Object.freeze({ 'bitcoin-mainnet': 0, 'bitcoin-testnet': 111, 'bitcoin-regtest': 111 });
export function verifyBitcoinOwnership({ address, network, message, signature } = {}) {
  try {
    if (!Object.hasOwn(versions, network) || typeof address !== 'string' || address.length > 64 ||
        typeof message !== 'string' || !message.length || Buffer.byteLength(message) > 4096 ||
        typeof signature !== 'string' || signature.length !== 88) return false;
    const payload = bs58check.decode(address);
    if (payload.length !== 21 || payload[0] !== versions[network]) return false;
    const compact = Buffer.from(signature, 'base64');
    if (compact.length !== 65 || compact.toString('base64') !== signature || compact[0] < 27 || compact[0] > 34) return false;
    return bitcoinMessage.verify(message, address, compact) === true;
  } catch { return false; }
}

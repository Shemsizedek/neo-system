// ERC-8021 schema 0 attribution for Base; pure, opt-in, and never submits transactions.
// Reference: https://eip.tools/eip/8021
export const ERC8021_MARKER = '8021'.repeat(8);

export function baseBuilderCodeSuffix(code) {
  // Conservative Base registry code format. Registration/ownership must be verified separately.
  if (typeof code !== 'string' || !/^[a-z0-9_]{1,32}$/.test(code)) {
    throw new TypeError('Builder Code must be 1-32 lowercase ASCII letters, digits, or underscores');
  }
  const bytes = Buffer.from(code, 'ascii');
  return '0x' + bytes.length.toString(16).padStart(2, '0') + bytes.toString('hex')
    + '00' + ERC8021_MARKER;
}

export function appendBaseBuilderAttribution(calldata, {
  code, chainId, enabled = false,
} = {}) {
  // Existing apps cannot begin attributing or broadcasting simply by importing this file.
  if (!enabled) return calldata;
  if (chainId !== 8453 && chainId !== 84532) {
    throw new RangeError('Attribution is restricted to Base mainnet (8453) and Base Sepolia (84532)');
  }
  if (typeof calldata !== 'string' || !/^0x(?:[a-fA-F0-9]{2})*$/.test(calldata)) {
    throw new TypeError('Calldata must be an even-length 0x-prefixed hex string');
  }
  if (calldata.toLowerCase().endsWith(ERC8021_MARKER)) {
    throw new Error('Calldata already ends with an ERC-8021 marker');
  }
  return calldata + baseBuilderCodeSuffix(code).slice(2);
}

import crypto from 'node:crypto';
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const isHex64 = value => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
const hold = reason => ({status:'HOLD',reason,signingEnabled:false,mainnetEnabled:false});

/** Read-only Bitcoin Core RPC adapter; caller injects a network-isolated authenticated RPC transport.
 * Never expose RPC credentials or accept arbitrary RPC method names from a portal user.
 */
export async function inspectRegtestDescriptor({rpc,descriptor,expectedAddress}={}) {
  if (typeof rpc !== 'function' || typeof descriptor !== 'string' || descriptor.length>4096 ||
      !descriptor.startsWith('wsh(sortedmulti(') || typeof expectedAddress!=='string' ||
      !/^bcrt1[ac-hj-np-z02-9]{8,90}$/.test(expectedAddress)) return hold('INVALID_INPUT');
  try {
    const info = await rpc('getblockchaininfo',[]);
    if (info?.chain!=='regtest' || !Number.isSafeInteger(info.blocks) || !isHex64(info.bestblockhash)) return hold('REGTEST_CHAIN_UNVERIFIED');
    const parsed = await rpc('getdescriptorinfo',[descriptor]);
    if (parsed?.isrange!==false || parsed?.issolvable!==true || !parsed?.hasprivatekeys===false) {
      // Check private keys explicitly below; malformed RPC payloads fail closed.
    }
    if (!parsed || parsed.isrange!==false || parsed.issolvable!==true ||
        parsed.hasprivatekeys!==false || typeof parsed.descriptor!=='string' ||
        !parsed.descriptor.includes('#')) return hold('DESCRIPTOR_NOT_VALIDATED_BY_CORE');
    const derived=await rpc('deriveaddresses',[parsed.descriptor]);
    if (!Array.isArray(derived)||derived.length!==1||derived[0]!==expectedAddress) return hold('ADDRESS_MISMATCH');
    return {status:'CORE_REGTEST_EVIDENCE_RECORDED',blockHeight:info.blocks,bestBlockHash:info.bestblockhash,
      address:expectedAddress,descriptorDigest:hash(parsed.descriptor),rpcTransportAuthenticated:'CALLER_MUST_ATTEST',
      controlVerified:false,signingEnabled:false,mainnetEnabled:false};
  } catch { return hold('BITCOIN_CORE_UNAVAILABLE'); }
}

/** Sanitized report for a separately authenticated read-only professional portal.
 * Status is never called an audit/certification without an independently signed report.
 */
export function prepareProfessionalEvidenceView({role,caseId,core,asset,market,accounting,attestations}={}) {
  if (!['lawyer','auditor','accountant','underwriter','broker','court-reviewer'].includes(role) ||
      typeof caseId!=='string'||!/^[-A-Za-z0-9_]{6,80}$/.test(caseId)) return hold('ROLE_OR_CASE_INVALID');
  if (core?.status!=='CORE_REGTEST_EVIDENCE_RECORDED'||asset?.status!=='CONSISTENT_REPORTED_SNAPSHOTS')
      return hold('INDEPENDENT_BLOCKCHAIN_EVIDENCE_INCOMPLETE');
  const readiness = ['market','accounting','attestations'].filter(k => {
    const record={market,accounting,attestations}[k];
    return !record || record.verified!==true || !record.evidenceId;
  });
  return {status:'REVIEW_ONLY',caseId,role,network:'regtest',blockHeight:core.blockHeight,
    blockchainEvidenceDigest:hash({core,asset}),marketEvidenceId:market?.evidenceId??null,
    accountingEvidenceId:accounting?.evidenceId??null,
    independentProfessionalEvidenceIds:Array.isArray(attestations?.evidenceIds)?attestations.evidenceIds:[],
    pendingEvidence:readiness,professionalApproval:false,collateralApproved:false,
    signingEnabled:false,mainnetEnabled:false};
}

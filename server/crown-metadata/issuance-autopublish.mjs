// NCC-012: fail-closed metadata issuance publication contract.
// This module ONLY prepares external read-only JSON. It cannot sign, mint, change descriptions or broadcast.
const PREFIX='https://crown.holytemples.org/assets/';
const ASSET=/^[A-Z][A-Z0-9]{0,23}$/;
const HASH=/^[a-f0-9]{64}$/i;
const TEXT_MAX=2048;
const CODEPOINTS=/[\u0000-\u001f\u007f]/;

export function crownIssuanceDescription(asset){
  if(typeof asset!=='string'||!ASSET.test(asset))throw new Error('invalid_canonical_asset');
  const url=PREFIX+asset+'/tokenscan.json';
  if(url.length>255)throw new Error('description_too_long');
  return url;
}
export function prepareCrownIssuance({asset,ownerAddress,description,website}={}){
  const metadataUrl=crownIssuanceDescription(asset);
  if(typeof ownerAddress!=='string'||ownerAddress.length<26||ownerAddress.length>90||!(/^[a-zA-Z0-9]+$/).test(ownerAddress))throw new Error('invalid_public_owner_address');
  if(typeof description!=='string'||!description.trim()||description.length>TEXT_MAX||CODEPOINTS.test(description))throw new Error('invalid_description');
  if(website!==undefined&&(!/^https:\/\/[a-z0-9.-]+(?:\/[^\s]*)?$/i.test(website)||website.length>100))throw new Error('invalid_website');
  return {schema:'neo.crown.issuance-metadata-plan.v1',asset,owner_address:ownerAddress,asset_description_for_signer:metadataUrl,requires_user_signature:true,signing_performed:false,broadcast_performed:false,metadata:{asset,description:description.trim(),...(website?{website}: {})},publication_status:'AWAITING_CONFIRMED_ISSUANCE',release_approval:false};
}
export function verifyIssuanceForMetadata(plan,evidence,{expectedAsset=plan?.asset}={}){
  if(!plan||plan.schema!=='neo.crown.issuance-metadata-plan.v1')throw new Error('invalid_plan');
  const expectedUrl=crownIssuanceDescription(expectedAsset);
  if(plan.asset!==expectedAsset||plan.asset_description_for_signer!==expectedUrl||plan.metadata?.asset!==expectedAsset)throw new Error('issuance_asset_mismatch');
  if(!evidence||evidence.asset!==expectedAsset||evidence.status!=='confirmed'||evidence.network!=='bitcoin-mainnet'||evidence.protocol!=='counterparty')throw new Error('unconfirmed_or_wrong_network');
  if(evidence.issuer!==plan.owner_address)throw new Error('issuer_address_mismatch');
  if(evidence.description!==expectedUrl)throw new Error('onchain_description_mismatch');
  if(!HASH.test(evidence.tx_hash)||!Number.isSafeInteger(evidence.block_index)||evidence.block_index<1)throw new Error('missing_chain_confirmation');
  if(evidence.verified_from_counterparty_api!==true)throw new Error('counterparty_evidence_not_verified');
  // Match the externally reported asset current description, not only the issuance-intent callback.
  if(evidence.current_asset_description!==expectedUrl)throw new Error('current_description_mismatch');
  return {schema:'neo.crown.enhanced-metadata-publication.v1',asset:plan.asset,file_path:`apps/neoscan/web/cardmaster/assets/${plan.asset}/tokenscan.json`,metadata:plan.metadata,receipt:{tx_hash:evidence.tx_hash.toLowerCase(),block_index:evidence.block_index,issuer:evidence.issuer,description:evidence.description,chain_source:'counterparty_core_v2',checked_at:evidence.checked_at||null},publication_status:'VERIFIED_READY_FOR_DEPLOY',onchain_broadcast:false,issuer_control_not_verified_beyond_tx:true};
}
export function validateLegacyEnhancedJSON(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||!ASSET.test(value.asset))throw new Error('invalid_asset_metadata');
  if(Object.keys(value).some(k=>!['asset','description','website','image','pgpsig'].includes(k)))throw new Error('unsupported_enhanced_field');
  if(value.description!==undefined&&(typeof value.description!=='string'||value.description.length>2048))throw new Error('invalid_enhanced_description');
  for(const k of ['website','image','pgpsig'])if(value[k]!==undefined&&(
      typeof value[k]!=='string'||value[k].length>100||!/^https:\/\/[^\s]+$/.test(value[k])
    ))throw new Error('invalid_enhanced_url');
  if(value.image!==undefined&&!value.image.endsWith('.png'))throw new Error('invalid_png_icon_url');
  return value;
}

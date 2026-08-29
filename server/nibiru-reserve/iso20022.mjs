export const NIBIRU_ISO_PROFILE=Object.freeze({
  messageDefinition:'pain.001.001.13',name:'CustomerCreditTransferInitiationV13',
  namespace:'urn:iso:std:iso:20022:tech:xsd:pain.001.001.13',profile:'NIBIRU_CANONICAL_ORIGIN_V1'
});

const xml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');

export function renderPain001(envelope){
  if(envelope.messageDefinition!==NIBIRU_ISO_PROFILE.messageDefinition)throw new Error(`messageDefinition must be ${NIBIRU_ISO_PROFILE.messageDefinition}`);
  const p=envelope.payment,parties=envelope.parties;
  if(!p?.amount?.currency||!Number.isFinite(Number(p.amount.value)))throw new Error('valid payment amount is required');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Document xmlns="${NIBIRU_ISO_PROFILE.namespace}"><CstmrCdtTrfInitn><GrpHdr><MsgId>${xml(envelope.messageId)}</MsgId><CreDtTm>${xml(envelope.creationDateTime)}</CreDtTm><NbOfTxs>1</NbOfTxs><CtrlSum>${xml(p.amount.value)}</CtrlSum><InitgPty><Nm>${xml(parties.debtor.name)}</Nm></InitgPty></GrpHdr><PmtInf><PmtInfId>${xml(envelope.messageId)}-PMT</PmtInfId><PmtMtd>TRF</PmtMtd><NbOfTxs>1</NbOfTxs><CtrlSum>${xml(p.amount.value)}</CtrlSum><ReqdExctnDt><Dt>${xml(envelope.creationDateTime.slice(0,10))}</Dt></ReqdExctnDt><Dbtr><Nm>${xml(parties.debtor.name)}</Nm></Dbtr><DbtrAcct><Id><Othr><Id>${xml(parties.debtor.account)}</Id></Othr></Id></DbtrAcct><CdtTrfTxInf><PmtId><EndToEndId>${xml(p.endToEndId)}</EndToEndId></PmtId><Amt><InstdAmt Ccy="${xml(p.amount.currency)}">${xml(p.amount.value)}</InstdAmt></Amt><Cdtr><Nm>${xml(parties.creditor.name)}</Nm></Cdtr><CdtrAcct><Id><Othr><Id>${xml(parties.creditor.account)}</Id></Othr></Id></CdtrAcct><RmtInf><Ustrd>${xml(p.remittanceInformation||p.purpose)}</Ustrd></RmtInf></CdtTrfTxInf></PmtInf></CstmrCdtTrfInitn></Document>`;
}

export function validatePain001Structure(document){
  const errors=[];
  for(const marker of ['<Document','<CstmrCdtTrfInitn>','<GrpHdr>','<PmtInf>','<CdtTrfTxInf>',NIBIRU_ISO_PROFILE.namespace])if(!document.includes(marker))errors.push(`missing ${marker}`);
  return{valid:errors.length===0,validationLevel:'STRUCTURE_ONLY',officialXsdValidated:false,railProfileValidated:false,errors};
}

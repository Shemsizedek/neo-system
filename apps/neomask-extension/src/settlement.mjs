// Pure authoritative checks; persistence must uniquely claim txid:vout in a DB.
export function assessBitcoinPayment(invoice,transaction,chain) {
 if(invoice.network!=='mainnet'||!['classic','cp20'].includes(invoice.ledger))throw new Error('Invalid invoice routing');
 if(!Number.isSafeInteger(invoice.createdHeight)||!Number.isSafeInteger(invoice.expiresAt)||!Number.isSafeInteger(invoice.confirmations)||invoice.confirmations<1)throw new Error('Invalid invoice policy');
 if(!/^[0-9a-f]{64}$/i.test(transaction.txid||''))throw new Error('Invalid transaction ID');
 if(!/^[1-9][0-9]*$/.test(invoice.sats))throw new Error('Invalid invoice amount');
 const expected=BigInt(invoice.sats);
 const matches=(transaction.vout||[]).map((output,vout)=>({output,vout})).filter(({output})=>output.scriptpubkey_address===invoice.address&&Number.isSafeInteger(output.value)&&BigInt(output.value)===expected);
 if(matches.length!==1)return {state:'NO_MATCH'};
 const match=matches[0],claim=transaction.txid+':'+match.vout;
 if(chain.claimedBy && chain.claimedBy!==invoice.id)return {state:'REPLAY_REJECTED'};
 const status=transaction.status;
 if(!status?.confirmed)return {state:'DETECTED',claim};
 if(!Number.isSafeInteger(status.block_height)||!Number.isSafeInteger(status.block_time)||!Number.isSafeInteger(chain.height)||status.block_height>chain.height)throw new Error('Invalid chain observation');
 if(status.block_hash!==chain.canonicalBlockHash)return {state:'REORG_HOLD',claim};
 if(status.block_height<invoice.createdHeight)return {state:'PREEXISTING_PAYMENT_REJECTED',claim};
 if(status.block_time*1000>invoice.expiresAt)return {state:'LATE_PAYMENT_REVIEW',claim};
 const confirmations=chain.height-status.block_height+1;
 return {state:confirmations>=invoice.confirmations?'SETTLED':'DETECTED',confirmations,claim,ledger:invoice.ledger};
}


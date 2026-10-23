#!/usr/bin/env bash
set -u

printf '=== NIBIRU POOL CORE / GATE 4 VALIDATION ===\n'
printf '\n[system]\n'
uname -a
printf 'CPUs: '; nproc
free -h || true
df -h . || true

printf '\n[bitcoin binaries]\n'
command -v bitcoind || true
command -v bitcoin-cli || true
bitcoind --version 2>/dev/null | head -n 1 || true
bitcoin-cli --version 2>/dev/null | head -n 1 || true

printf '\n[bitcoin RPC]\n'
if bitcoin-cli getblockchaininfo >/tmp/nibiru-chain.json 2>/tmp/nibiru-chain.err; then
  jq '{chain,blocks,headers,verificationprogress,initialblockdownload}' /tmp/nibiru-chain.json
  bitcoin-cli getnetworkinfo | jq '{version,subversion,connections,networkactive}'
  bitcoin-cli getmininginfo | jq '{blocks,difficulty,networkhashps,pooledtx,chain}'
  printf '\n[getblocktemplate]\n'
  if bitcoin-cli getblocktemplate '{"rules":["segwit"]}' >/tmp/nibiru-template.json 2>/tmp/nibiru-template.err; then
    jq '{height,version,previousblockhash,transactions:(.transactions|length),coinbasevalue,target,mintime}' /tmp/nibiru-template.json
    printf 'STATUS: BITCOIN_TEMPLATE_READY\n'
  else
    cat /tmp/nibiru-template.err
    printf 'STATUS: BITCOIN_TEMPLATE_NOT_READY\n'
  fi
else
  cat /tmp/nibiru-chain.err
  printf 'STATUS: BITCOIN_RPC_NOT_READY\n'
fi

printf '\n[counterparty / CES processes]\n'
ps aux | grep -Ei 'counterparty|addrindex|community|exchange|ces' | grep -v grep || true

printf '\n[listening ports]\n'
ss -lntup 2>/dev/null || sudo ss -lntup 2>/dev/null || true

printf '\n=== END VALIDATION ===\n'

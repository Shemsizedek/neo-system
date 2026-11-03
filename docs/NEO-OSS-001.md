# NEO-OSS-001 — Open-source project alignment
Date: 2026-11-03
Status: Gate 001 implemented for review; no production activation.

## Discovery and placement
All 15 screenshot repositories were resolved using GitHub on the date above.
Repository identity and GitHub license metadata were checked, not source-audited.
The screenshot's star counts and ranking are not selection criteria.
Machine-readable inventory: `config/neo-open-source-projects.json`.

| Project | Canonical repository | NEO alignment | Gate 001 disposition |
| --- | --- | --- | --- |
| agent-zero | [agent0ai/agent-zero](https://github.com/agent0ai/agent-zero) | NEOsync / NEO Bots | sandbox-candidate |
| heretic | [p-e-w/heretic](https://github.com/p-e-w/heretic) | NEO Oracle research | deferred |
| browser-use | [browser-use/browser-use](https://github.com/browser-use/browser-use) | Omnitrix / Noogle | sandbox-candidate |
| nuclei | [projectdiscovery/nuclei](https://github.com/projectdiscovery/nuclei) | NEO Guardian / NEO-GAS Cyber | lab-only |
| hashcat | [hashcat/hashcat](https://github.com/hashcat/hashcat) | NEO Guardian recovery lab | lab-only |
| gophish | [gophish/gophish](https://github.com/gophish/gophish) | GISS security awareness | lab-only |
| trufflehog | [trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog) | Repository security / NEO Guardian | planned |
| crawl4ai | [unclecode/crawl4ai](https://github.com/unclecode/crawl4ai) | NEO Crawler / Noogle | planned |
| mitmproxy | [mitmproxy/mitmproxy](https://github.com/mitmproxy/mitmproxy) | NEO integration testing | lab-only |
| ghidra | [NationalSecurityAgency/ghidra](https://github.com/NationalSecurityAgency/ghidra) | NEO Guardian binary analysis | lab-only |
| fabric | [danielmiessler/Fabric](https://github.com/danielmiessler/Fabric) | NEO Algo / NEO Press | planned |
| ragflow | [infiniflow/ragflow](https://github.com/infiniflow/ragflow) | NEO Oracle / World Library | planned |
| ollama | [ollama/ollama](https://github.com/ollama/ollama) | NEO Router / NEO Oracle AI | adapter-implemented |
| langchain | [langchain-ai/langchain](https://github.com/langchain-ai/langchain) | NEO Bots / Oracle orchestration | deferred |
| playwright | [microsoft/playwright](https://github.com/microsoft/playwright) | NEOpass / NEO UI quality | planned |

## Implemented integration
NEO Router now supports an opt-in Ollama provider using native `POST /api/chat`.
It sends NEO system instructions, sets `stream: false`, bounds output tokens,
rejects redirects, validates completed responses and applies a timeout through
response-body consumption. Provider output excludes raw upstream response data.

Configuration must be server-side, controlled by the operator:
```dotenv
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=your-installed-and-reviewed-model
```
No default model is downloaded. No upstream package is installed or vendored.
Use a loopback or isolated private service; do not expose Ollama directly to the
Internet. The origin is trusted deployment configuration, never user input.
Remote TLS/authenticated gateway provisioning is a later deployment task.

Submit Router missions with `capability: 'local-inference'`. This route contains
only Ollama: local service failures cannot fall through to cloud providers.
Existing cloud routes are unchanged. This gate does not complete the separate
Cloudflare migration. Existing Router action policy still applies.

## Remaining integrations
- Crawl4AI: next adapter candidate for NEO Crawler/Noogle. Require source scope,
  URL/time/content hash, bounded extraction, SSRF controls and provenance.
- Playwright: add scoped NEOpass/Omnitrix UI tests with synthetic accounts.
- TruffleHog: isolated repository scanning, credential verification disabled,
  redacted findings and restricted artifact retention.
- RAGFlow: separate private retrieval service; retain document ACLs, deletion
  propagation and citations. Do not place confidential records into public indexes.
- Fabric: import only reviewed, versioned prompt patterns, with attribution.
- Agent Zero and Browser Use: isolated workers with explicit tool/target scope;
  do not inherit production browser sessions, wallet keys or broad credentials.
- LangChain: assess gaps against the existing Router and agent SDK before adding
  another orchestration dependency.
- Heretic: deferred; no current operational requirement for model modification.
- Nuclei, hashcat, Gophish, mitmproxy and Ghidra: isolated authorized security lab
  candidates. No scan, cracking job, email campaign, interception, CA installation
  or binary execution is started by this gate. Gophish's observed last push was
  2024-09-23; maintenance and dependencies need review before use.

## License and supply-chain boundary
License identifiers in the inventory are GitHub metadata, not a legal opinion.
NOASSERTION/missing identifiers require inspection of the actual license.
Agent Zero, Gophish and hashcat need that follow-up. Heretic and TruffleHog report
AGPL-3.0; review obligations for the chosen deployment/distribution before adoption.
Runtime/model licenses are separate. Before enabling any additional component,
record a reviewed immutable version or image digest, dependency/security findings,
resource requirements, rollback procedure and license/notice treatment.
None of the 15 projects is automatically enabled by the inventory.

## Validation
25 local Node tests passed: existing providers (7), existing Router (13), new
Ollama integration contracts (5). Network requests were mocked. Tests cover
configuration, native request shape, errors, body timeout, no cloud fallback and
existing consequential-action policy. No live Ollama endpoint or model was tested.
The added GitHub workflow repeats the provider/Router/Ollama tests without secrets.
Full application build, live inference, remaining adapters, runtime sizing and
production deployment remain outside this first gate.

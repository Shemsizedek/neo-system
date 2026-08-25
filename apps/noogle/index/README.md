# Noogle Index v1

Noogle Index v1 is the first native indexing layer for Noogle. It separates retrieval, provenance, ontology, ranking, and public presentation so Noogle can mature beyond federated search without treating interpretation as verified fact.

## Pipeline
1. Discovery — ingest allowlisted public HTTP(S) and submitted community sources.
2. Normalization — canonical URL, title, language, timestamps, content hash, source identity.
3. Provenance — retain source URL, retrieval time, source class, authorship/publisher metadata when available, and content hash.
4. Ontology — attach community terminology and Indigenous/community context as attributed metadata; never overwrite underlying source text.
5. Factology — classify evidence state (primary, scholarly, community-attributed, reference, archival, unverified) rather than declaring worldview-specific interpretations universally factual.
6. Ranking — deterministic scoring from relevance, provenance quality, community authority for community-specific naming/context, recency where relevant, and source diversity.
7. Serving — return ranked documents plus provenance and ranking explanations to Omnitrix.

## Indigenous Ontology Protocol
For a people, nation, community, language, place, practice, or historical narrative tied to an Indigenous community, Noogle may prioritize that community's own terminology and self-description in the presentation layer. The record identifies who supplied or published the terminology and preserves alternative names for discovery. Community authority is contextual authority, not a license to rewrite source evidence.

## Safety boundaries
- No credential harvesting or authentication bypass.
- No robots/access-control bypass.
- No private/deep-web crawling merely because content is technically reachable.
- No wallet secrets, signing keys, miner credentials, or API secrets in GitHub Pages.
- Transaction signing/broadcast and miner control require authenticated audited adapters.
- Search results expose provenance and ranking reasons.

The initial GitHub Pages deployment uses a generated static index snapshot. The schema is designed to move to a persistent search service later without changing the Omnitrix result contract.

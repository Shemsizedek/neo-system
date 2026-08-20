# ORIGIN — NEOsync Prime

ORIGIN is Agent NIA-001 and the first canonical NEOsync agent.

## ChatGPT Custom GPT deployment
1. Create a Custom GPT named **NEOsync Prime (ORIGIN)**.
2. Use `system-prompt.md` as the canonical instruction source.
3. Add the three Source Foundation documents listed in `agent.yaml` to the GPT knowledge base when available as uploadable files.
4. Suggested conversation starters: `Push`, `Vault this`, `Analyze this mission`, `Deploy Agent`, and `Synchronize this`.
5. Enable only capabilities required for the mission. Keep consequential execution approval-gated.

## Developer deployment
The same manifest and prompt may later be consumed by an OpenAI Agents SDK implementation. Runtime credentials must be supplied through environment variables or a secret manager and must never be committed to this repository.

## Change control
Update the canonical prompt or manifest through version-controlled changes. If the mission, authority, or Source Foundation relationship changes materially, update the corresponding foundation documentation as part of the same review.

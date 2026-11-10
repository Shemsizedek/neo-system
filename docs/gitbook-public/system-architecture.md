# System architecture

The NEO System uses modular components coordinated through a canonical GitHub repository, with documentation and implementation boundaries recorded separately.

## Conceptual layers

1. **Presentation:** public web pages and application interfaces.
2. **Application services:** administrative tools, NEO Algo, educational and commerce prototypes.
3. **Adapters:** explicitly authorized integrations with external networks or service providers.
4. **Evidence and records:** versioned documents, provenance metadata, and audit records appropriate to each workflow.
5. **Identity and security:** access controls, human authorization, test gates, and non-custodial boundaries when applicable.

These layers describe **architecture and intent**, not verified live connectivity.

## Representative components

- **NEOsync:** project coordination, records and administrative workflows.
- **NEO Algo:** a provenance-first reasoning and knowledge framework.
- **Noogle / Omnitrix:** research, knowledge discovery and browser prototypes.
- **NEO Teller / NEOpay / NEO Counter:** Bitcoin/Counterparty and merchant-related prototypes and interfaces.
- **GISD / GISS:** educational and curriculum systems.
- **World Temple and institutional workflows:** documentation, records and authorized administrative interfaces.

The module names above are based on the source repository. Verify each project's current build state and integration tests separately before describing it as production-ready.

## Boundaries

For original architecture and legal/safety boundaries, see [docs/ARCHITECTURE.md](https://github.com/Shemsizedek/neo-system/blob/main/docs/ARCHITECTURE.md). The software does not confer governmental, financial, law-enforcement, military, judicial or other external authority.

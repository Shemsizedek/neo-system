# NEO Chips hosting and compute policy

**Explicit operator instruction: NO VERCEL.**

Preferred development and delivery:
1. ChatGPT-led source authoring and engineering review.
2. GitHub Codespaces for repeatable cloud development.
3. React/Vite local web studio; build static assets with `npm run build`.
4. GitHub Actions for Python/React tests.
5. An operator-approved cloud target or ChatGPT Sites when separately supported and connected.

Commands from repository root:
```bash
python -m unittest discover -s hardware/neo-chips -p 'test_nchip004.py' -v
cd hardware/neo-chips/studio
npm install --no-audit --no-fund
npm run dev -- --host 0.0.0.0
```

No public deployment is authorized. The Vercel GitHub status currently appears as an **external integration check**; this repository file cannot revoke a Vercel GitHub App installation or delete a Vercel project. A repository administrator must disconnect Vercel from the Vercel project or GitHub integration settings. Do not equate the external Vercel status with NEO Chips test results.

Do not add Vercel config, SDK, webhook, deployment or required status check. GitHub Codespaces port should remain private until approved.

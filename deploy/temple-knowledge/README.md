# NEO knowledge recovery source

This directory mirrors the source used for the public Noogle, Omnitrix, Oracle, Algo and Books Sites deployment. The runtime has no backend credentials or private account records.

Project: appgprj_6ad3c15dd8b88191a09ca2017bd81b20
Public deployment: https://temple-knowledge.shemsizedek.chatgpt.site
Pushed Sites source commit: 38a4b75de4fcf9487dce15944bcdd1404f179081

From the repository root, first generate public schema metadata:

```sh
node scripts/build-pages-platform-api.mjs
cd deploy/temple-knowledge
node scripts/capture-source.mjs ../..
npm run build
npm test
```

The capture step selects existing public source files and the four explicitly public catalog records. It produces worker/public-content.json; this generated file is tracked in the deployed Sites source repository. The build embeds that content in a standalone Worker ESM artifact under dist/server/index.js. No external crawling is needed.

Use the existing Sites project and its short-lived repository credential to synchronize the complete source, including public-content.json, then package .openai/hosting.json and dist/server from the same pushed commit. Save and publish using that exact commit. Keep the current public audience. Do not create a second site for this project or change healthy DNS records.

HTTP/asset checks and Node VM tests do not establish real browser interaction, external-provider uptime, account recovery, AI inference, financial settlement or access to original library documents.

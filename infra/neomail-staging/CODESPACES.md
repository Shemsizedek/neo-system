# NEO Mail Codespaces Lab

GitHub Codespaces is approved as the **development and integration lab** for NEO Mail, not as the authoritative public mail exchanger.

## Why Codespaces is useful
- reproducible Linux development environment;
- Docker/Stalwart testing;
- SentinelX temporary host enrollment;
- configuration validation;
- JMAP/IMAP/WebUI development;
- Global e-Post hashing/evidence tooling;
- Git-native source control;
- zero/low-cost development within GitHub's included quota.

## Why Codespaces is not Node A
GitHub Codespaces has lifecycle and networking characteristics that conflict with a production mail exchanger:
- Codespaces stop after inactivity;
- each Codespace has a maximum lifetime and must restart;
- IP addresses are dynamically assigned rather than stable;
- forwarded ports are development endpoints and public visibility can reset after restart;
- the service is designed for development, not always-on MX hosting.

Therefore do **not** point production or staging MX records to a Codespace.

## SentinelX in Codespaces
SentinelX can be installed inside a running Codespace so ChatGPT can inspect files, run tests, and manage the lab. Treat that host identity as ephemeral.

Do not reuse the permanent Node A private identity on a Codespace.

## Start the lab
```bash
docker compose -f infra/neomail-staging/docker-compose.codespaces.yml up -d
```

## Secrets
Use Codespaces secrets or runtime environment variables for any test credentials. Never commit:
- SentinelX enrollment codes;
- Resend API/SMTP credentials;
- DKIM private keys;
- mailbox passwords;
- production TLS private keys.

## Promotion path
1. Build/test in Codespaces.
2. Commit portable configuration.
3. Enroll a qualifying always-on NEO-controlled Linux host.
4. Deploy the same Stalwart configuration there.
5. Verify inbound TCP/25 and stable public addressing.
6. Bind `mailtest.holytemples.org` only to the qualifying permanent node.

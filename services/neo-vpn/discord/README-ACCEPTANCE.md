# Discord acceptance shortcut

After the Discord gateway bot is installed and running on the Linux host:

```bash
npm run acceptance
```

Exit code `0` means the Discord gateway, guild attestation, command registration, and configured guild lock are accepted. This does not enable WireGuard execution. See `../docs/DISCORD-LIVE-ACCEPTANCE.md` for the full gate.

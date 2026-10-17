# NSEC-116 — Local terminal connection: Chromebook ↔ Android

**Supported now:** SSH to the Termux environment on your Android phone from the Chromebook Linux terminal over a trusted private LAN. **Not supported:** remote shell access through connect.holytemples.org, browser-pairing privileges, enrollment or access to privileged Android OS functions.

## Phone (Termux)
Install Termux from F-Droid (https://f-droid.org/packages/com.termux/). On your trusted Wi-Fi network:

```sh
pkg update && pkg upgrade
pkg install openssh
whoami
passwd
sshd
ssh-keygen -lf ~/.ssh/ssh_host_ed25519_key.pub
```

Termux OpenSSH defaults to TCP 8022. Save the username from `whoami`. Find the IP address in Android Wi-Fi network details. Keep the phone awake during the initial connection.

## Chromebook
Turn on ChromeOS Linux development environment (Settings → About ChromeOS → Developers → Linux development environment). In the Linux terminal:

```sh
ssh -p 8022 TERMUX_USER@PHONE_LAN_IP
```

Before accepting the first SSH host key, compare the fingerprint displayed by SSH with the `ssh-keygen -lf` result on the phone. Enter the Termux password. Run `whoami` and `pwd` to confirm you are operating within the phone's Termux shell. Use `exit` to disconnect.

If `Connection timed out` occurs, confirm both devices are on the same trusted Wi-Fi and the network does not isolate clients. If `Connection refused`, rerun `sshd` on the phone. If login fails, confirm the Termux username and password; do not disable host-key checking.

## Reduce exposure
For ongoing use, establish an ed25519 SSH key on the Chromebook and append only its **public** key to `~/.ssh/authorized_keys` in Termux. Keep private keys on the Chromebook. After validating key login, consider disabling password authentication in the Termux SSH server configuration. Stop the phone SSH server when not needed: `pkill sshd`.

Never port-forward TCP 8022 on a public router, paste credentials into Noogle Connect pairing, or store phone SSH passwords in a web page. If remote access beyond the local LAN becomes necessary, use a separately reviewed private VPN and device authorization architecture.

## Security boundary
Noogle Connect's public `/connect/terminal` remains HTTP 403. Browser pings are unauthenticated demos and cannot authorize SSH or device operations. This guide does not alter that boundary.

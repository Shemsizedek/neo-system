# NEO Voice local prototype — VOICE-004

This is an operator-local conversation prototype, not a telephone dialer or a production call center. It reuses NEO Router's communication envelope. Nothing is published, recorded or stored by this prototype.

## What works in the implementation
- Three role prompts: sales, donation and operations.
- Text turns sent to a locally installed Ollama model.
- WAV transcription through local whisper.cpp; users review transcription before sending.
- Spoken replies only if the browser exposes an on-device speech voice. No cloud browser speech recognition.
- Literal loopback upstream addresses, no redirects, request limits, one active turn and no paid API fallback.
- Local HTML and JavaScript without a CDN.

## Run on an owned computer
Prerequisites: Node 24, installed Ollama with a locally downloaded model, optional whisper.cpp built with whisper-server and a locally downloaded speech model. No binaries or models are bundled. Check each model's license before deployment.

Disable Ollama cloud features with OLLAMA_NO_CLOUD=1 in its service environment, and use an installed local model. For strict offline operation, deny external network egress for the model processes. Loopback addressing alone cannot prevent a separately configured local daemon from contacting a cloud service.

Start whisper-server bound to 127.0.0.1 on port 8080 using its documented model option. Keep that service private and unprivileged. Upload short PCM WAV recordings under 2 MB.

From the repository root:

    NEO_VOICE_MODEL=<installed-local-model-name> node server/neo-router/voice-local.mjs

Open http://127.0.0.1:8794 on the same computer. This is not reachable on the user's Android phone from a different server. The localhost page permits typed conversation and short WAV uploads. A device voice may be unavailable; text remains usable.

    node --test server/neo-router/voice-local.test.mjs

The readiness endpoint checks Ollama model presence; it does not certify transcription, speaker output or phone connectivity. HTTP tests use fake local model responses. Actual model quality, audio compatibility and latency need device testing.

## Free service alternative, checked November 8, 2026
LiveKit Build advertises $0/month, no credit card, 1 US local number, 50 US inbound minutes, 1,000 agent-session minutes, 5,000 WebRTC participant minutes and $2.50 inference credits (roughly 50 minutes depending on models). These are separate allowances, not 1,000 minutes of free end-to-end AI phone calls. Build allowance exhaustion stops new requests instead of billing overages. Third-party SIP allowances exclude the carrier's separate charges.

Sources:
- https://livekit.com/pricing
- https://docs.livekit.io/deploy/admin/quotas-and-limits/
- https://docs.livekit.io/transport/self-hosting/
- https://docs.livekit.io/telephony/start/sip-trunk-setup/

No LiveKit account, number or project was created in this gate. Account eligibility and current allowance must be checked before activation. No free unlimited global PSTN service was established.

Jami is a separate free/libre peer-to-peer option for internet calls and conferencing between compatible participants: https://jami.net/ . It is not wired into this prototype and is not an autonomous phone agent out of the box.

## Own-stack next step
Use self-hosted LiveKit for WebRTC rooms on an owned always-on node; attach local speech/model workers and an authenticated NEO Router adapter. Asterisk is another free/open-source PBX option. Ordinary phone numbers still require a carrier or an existing permitted phone service.

Software can have no subscription charge; hardware, electricity, internet, model hosting and phone carriers are not guaranteed free. Do not present this loopback prototype as decentralized networking. Its local inference path avoids a mandatory hosted AI provider; remote media, authenticated dispatch, scheduling and agent handoffs remain unimplemented.

Repository policy requires feature branch plus PR; maintainer review and merge precede production deployment. No production rollout in this gate.

Technical references:
- https://docs.ollama.com/api/chat
- https://github.com/ggml-org/whisper.cpp/blob/master/examples/server/README.md
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService

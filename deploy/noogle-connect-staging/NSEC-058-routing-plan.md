# NSEC-058 — Noogle Connect HTTPS routing plan
Verified via Google Cloud preflight run 38624197392 on 2026-10-14.

* HTTPS load balancer address: 8.232.127.249.
* URL map neo-edge-url-map has six host entries but does not route connect.holytemples.org.
* Certificate Manager map exists with entry *.holytemples.org and one referenced certificate. Certificate ACTIVE status and actual TLS handshake still require verification.
* Cloud Run noogle-connect-staging revision noogle-connect-staging-00002-7k2 is ready; ingress annotation is all, while authorized service invocation is enforced by IAM.

## Security blockers before routing
1. Inspect certificate state, serving status, and actual TLS hostname validation without modifying the existing certificate map.
2. Decide the intended user-access model for connect.holytemples.org. This is a future NEO Pass web portal, not an unauthenticated public invocation endpoint.
3. Do not bypass Cloud Run invoker IAM via a load-balancer backend without a separately certified auth control. A public edge route alone is not proof of identity.
4. Prepare dedicated serverless NEG/backend and explicit host matcher only after documenting access enforcement. Avoid changing default or neighboring service routes.
5. Create WordPress.com DNS A record only after private access and route verification; never touch existing Guardian/Crown records.
6. Keep device enrollment, passkey signing, document voting and remote command execution disabled.

No DNS, IAM, certificate, load-balancer, Cloud Run or APK changes authorized by this plan.

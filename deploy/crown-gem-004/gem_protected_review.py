"""GEM-102 unmounted protected read-only review endpoint adapter.

Approval cookies must be minted only following real Google credential verification.
No public route registration, GitHub write, or deployment in this module.
"""
import html,json
from gem_identity_session import cookie_subject,issue
from gemini_google_auth import verify_google_credential
from gem_approval_dashboard import render_review

def mint_approval_cookie(google_id_token,secret):
    subject=verify_google_credential(google_id_token)
    value=issue(subject,secret)
    return "neo_gem_approval="+value+"; Path=/gemini; HttpOnly; Secure; SameSite=Strict; Max-Age=900"

def review_response(cookie_header,secret,proposal):
    subject=cookie_subject(cookie_header,secret)
    if subject is None:
        return 401,{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"},"Google reauthentication required"
    try:page=render_review(proposal)
    except (ValueError,TypeError,KeyError):
        return 400,{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"},"Invalid review proposal"
    return 200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store",
                "Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'","X-Content-Type-Options":"nosniff"},page

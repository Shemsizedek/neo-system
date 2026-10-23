"""GEM-100: presentation-only review dashboard contract. No approval execution route."""
import html,re
def render_review(proposal):
    required=("repository","base","head","commit","manifest_digest","title")
    if not isinstance(proposal,dict) or any(not isinstance(proposal.get(k),str) for k in required):
        raise ValueError("incomplete review")
    if proposal["repository"]!="Shemsizedek/neo-system":
        raise ValueError("repository scope")
    if not re.fullmatch(r"[a-f0-9]{40}",proposal["commit"]) or not re.fullmatch(r"[a-f0-9]{64}",proposal["manifest_digest"]):
        raise ValueError("invalid identifiers")
    rows="".join("<dt>"+html.escape(k.replace("_"," ").title())+"</dt><dd>"+html.escape(proposal[k])+"</dd>" for k in required)
    return ('<section aria-label="GitHub development review"><h2>NEO Gemini · Review proposed changes</h2>'
            '<p>Read-only preview. Approval and draft PR creation are unavailable until '
            'the authenticated approval service and durable storage are live.</p>'
            '<dl>'+rows+'</dl><p>Status: Awaiting secure approval integration.</p></section>')

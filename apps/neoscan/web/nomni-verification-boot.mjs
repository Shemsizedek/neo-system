import {createNomniVerificationPanel} from './nomni-verification-panel.mjs';
// Safe default: no network request or unverified Crown claims.
// Future signed server snapshots must be checked before passing into the panel.
const target=document.getElementById('nomniVerification');
if(target)target.replaceChildren(createNomniVerificationPanel(document));

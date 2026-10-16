// CSC-GISS-008: presentational HTML fragment for the existing authenticated portal.
// Caller MUST obtain the scoped view via createSuperintendentDashboardView.
// Never call this renderer with raw cross-institution data.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function renderGisdAdminDashboard(view, { designation = 'NEO Cipher Admin Dashboard' } = {}) {
  if (!view?.allowed || !view.institutionId) return '<section role="alert">Access denied</section>';
  const institution = escapeHtml(view.institutionName || view.institutionId);
  const position = escapeHtml(view.superintendent?.districtDesignation || view.superintendent?.label || 'Superintendent');
  const roles = (view.registry?.positions || []).map(row => '<li><strong>Position '+escapeHtml(row.position)+'</strong>: '+escapeHtml(row.label)+'</li>').join('');
  const reports = (view.reports || []).map(row => '<li><strong>'+escapeHtml(row.title)+'</strong> — '+escapeHtml(row.status)+'</li>').join('');
  return '<section class="neo-cipher-admin" aria-label="'+escapeHtml(designation)+'">'+
    '<header><p>Global Interdependent School District</p><h1>'+escapeHtml(designation)+'</h1>'+
    '<p>Institution: '+institution+'</p></header>'+
    '<nav aria-label="Dashboard sections"><a href="#gisd-governance">Governance</a> <a href="#gisd-reporting">Reporting</a></nav>'+
    '<section id="gisd-governance"><h2>'+position+'</h2><p>Organizational reference; appointment and authority require separate verification.</p><ol>'+roles+'</ol></section>'+
    '<section id="gisd-reporting"><h2>Institution reporting</h2>'+(reports?'<ul>'+reports+'</ul>':'<p>No authorized institution reports available.</p>')+'</section>'+
    '</section>';
}

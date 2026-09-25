export const WORLD_LEADERS_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#111111">
<meta name="description" content="The World Leaders Forum — World HQ. International cooperation, public diplomacy, global peace, and equal rights.">
<title>World Leaders Forum — World HQ</title>
<style>
:root{--bg:#f7f5ef;--ink:#171717;--muted:#6f6a61;--gold:#c2a990;--dark:#111;--card:#fff;--line:#ded8ce}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6}
a{color:inherit}.wrap{width:min(1100px,calc(100% - 32px));margin:auto}.hero{background:linear-gradient(135deg,#111,#24211d);color:#fff;padding:88px 0 76px;text-align:center}
.kicker{font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;color:#d7c29f;font-weight:800}.hero h1{font-family:Georgia,serif;font-size:clamp(2.6rem,7vw,5.2rem);line-height:1.02;margin:.35rem 0 .75rem}.hero p{max-width:760px;margin:0 auto 24px;color:#ddd6ca;font-size:1.06rem}
.actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}.btn{display:inline-block;text-decoration:none;padding:11px 18px;border-radius:999px;background:var(--gold);color:#16120d;font-weight:800;font-size:.92rem}.btn.alt{background:transparent;color:#fff;border:1px solid #777}
main{padding:56px 0 72px}.intro{text-align:center;max-width:820px;margin:0 auto 48px}.intro h2,.section h2{font-family:Georgia,serif;font-size:clamp(2rem,4vw,3.1rem);line-height:1.1;margin:0 0 14px}.intro p{color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:28px}.card{background:var(--card);border:1px solid var(--line);padding:28px;border-radius:18px}.card h3{font-family:Georgia,serif;font-size:1.5rem;margin:0 0 8px}.card p{margin:.35rem 0;color:#3f3a34}.leader-list{display:grid;gap:12px;margin-top:18px}.leader{padding:14px 0;border-bottom:1px solid var(--line)}.leader:last-child{border-bottom:0}.leader strong{display:block}.contact{background:#111;color:#fff;margin-top:48px;padding:42px;border-radius:22px}.contact h2{font-family:Georgia,serif;margin-top:0}.contact p{color:#d2cdc4}.footer{padding:28px 0 44px;text-align:center;color:var(--muted);font-size:.9rem}
@media(max-width:760px){.hero{padding:64px 0 56px}.grid{grid-template-columns:1fr}.card,.contact{padding:22px}.wrap{width:min(100% - 24px,1100px)}}
</style>
</head>
<body>
<header class="hero">
  <div class="wrap">
    <div class="kicker">THE WORLD LEADERS FORUM • WORLD HQ</div>
    <h1>Official Forum for World Leaders</h1>
    <p>A public forum supporting international cooperation, constructive dialogue, global peace, equal rights, and service to humanity.</p>
    <div class="actions">
      <a class="btn" href="https://world-temple.mn.co/" rel="noopener">Forum Login</a>
      <a class="btn alt" href="https://world-temple.mn.co/" rel="noopener">Register</a>
    </div>
  </div>
</header>
<main>
  <div class="wrap">
    <section class="intro">
      <h2>Open Intergovernmental Forum</h2>
      <p>The World Leaders Forum brings leaders, institutions, and citizens together around cooperation, diplomacy, peacebuilding, equal rights, and initiatives intended to improve conditions across the Global Village.</p>
    </section>

    <section class="grid" aria-label="World Leaders Forum">
      <article class="card">
        <h3>Global Peace Mission</h3>
        <p>TWLF encourages dialogue and cooperation among nations, institutions, and communities while advancing a shared commitment to peace and equal rights for humanity.</p>
        <p><a href="https://world-temple.mn.co/" rel="noopener"><strong>Join the World Forum →</strong></a></p>
      </article>
      <article class="card">
        <h3>World Leaders Network</h3>
        <p>Leadership participation is organized by nation and region, creating a network for representation, communication, diplomacy, and public-service initiatives.</p>
        <p><a href="https://www.patreon.com/" rel="noopener"><strong>World Leader Registration →</strong></a></p>
      </article>
    </section>

    <section class="card" style="margin-top:20px">
      <h3>World Leadership</h3>
      <div class="leader-list">
        <div class="leader"><strong>Founder / World Chairperson</strong><span>Dr. Ch Shahid Iqbal</span></div>
        <div class="leader"><strong>World Leader for United States</strong><span>Hon. Larry Shelton (H.E. Dr. Lawiy Zodok Shamu-El)</span></div>
        <div class="leader"><strong>World Leader for Africa</strong><span>H.E. Sir Wildanie Cupidon</span></div>
      </div>
    </section>

    <section class="contact">
      <h2>World Headquarters</h2>
      <p>The World Leaders Forum — World HQ</p>
      <p>Amarepura, Rawalpindi #62/54, Pakistan</p>
      <p><a href="mailto:theworldleadersforum1@gmail.com">theworldleadersforum1@gmail.com</a><br><a href="tel:+923225047498">+92 322 5047498</a></p>
      <div class="actions" style="justify-content:flex-start">
        <a class="btn" href="https://holytemples.org/holy-palace/">Holy Palace</a>
        <a class="btn alt" href="https://twlfworldhq.wordpress.com/" rel="noopener">Original TWLF Site</a>
      </div>
    </section>
  </div>
</main>
<footer class="footer"><div class="wrap">The World Leaders Forum — World HQ • All Rights Reserved</div></footer>
</body>
</html>`;

export function renderWorldLeaders(res){
  res.writeHead(200,{
    'content-type':'text/html; charset=utf-8',
    'cache-control':'public, max-age=300, stale-while-revalidate=3600',
    'x-content-type-options':'nosniff',
    'referrer-policy':'strict-origin-when-cross-origin',
    'x-neo-surface':'world-leaders-forum-static-mirror'
  });
  res.end(WORLD_LEADERS_PAGE);
}

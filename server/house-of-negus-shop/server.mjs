import http from "node:http";

const PORT = Number(process.env.PORT || 8080);
const SHOP_HOST = "https://Shemsizedek.myspreadshop.com";
const VERIFY = "YOlhCWqfC2W9h4eyCBZl36jDYopfDggLnUftnbYSLYA";

function page() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="google-site-verification" content="${VERIFY}">
  <meta name="description" content="House of Negus official merchandise shop.">
  <title>House of Negus Shop</title>
  <style>
    :root{color-scheme:dark}
    *{box-sizing:border-box}
    html,body{margin:0;min-height:100%;background:#080808;color:#fff;font-family:Arial,Helvetica,sans-serif}
    header{position:sticky;top:0;z-index:10;background:#0b0b0b;border-bottom:1px solid #242424;padding:14px 20px;display:flex;align-items:center;justify-content:space-between}
    header a{color:#fff;text-decoration:none;font-weight:700}
    .brand{font-size:1.05rem;letter-spacing:.03em}
    main{min-height:85vh}
    #myShop{min-height:75vh}
    .loading{padding:48px 20px;text-align:center;color:#bbb}
    footer{padding:24px 20px;text-align:center;color:#999;border-top:1px solid #242424;font-size:.9rem}
  </style>
</head>
<body>
<header><a class="brand" href="/">HOUSE OF NEGUS</a><a href="https://holytemples.org">HolyTemples.org</a></header>
<main>
  <div id="myShop"><div class="loading">Loading shop…</div></div>
</main>
<footer>Official House of Negus storefront</footer>
<script>
  var spread_shop_config = {
    shopName: 'Shemsizedek',
    locale: 'us_US',
    prefix: '${SHOP_HOST}',
    baseId: 'myShop',
    usePushState: true,
    pushStateBaseUrl: '/',
    updateMetadata: true
  };
</script>
<script type="text/javascript" src="${SHOP_HOST}/shopfiles/shopclient/shopclient.nocache.js"></script>
</body>
</html>`;
}

const server=http.createServer((req,res)=>{
  if(req.url==="/health"){
    res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});
    return res.end(JSON.stringify({ok:true,service:"house-of-negus-shop"}));
  }
  res.writeHead(200,{
    "content-type":"text/html; charset=utf-8",
    "cache-control":"public, max-age=300",
    "x-content-type-options":"nosniff",
    "referrer-policy":"strict-origin-when-cross-origin"
  });
  res.end(page());
});
server.listen(PORT,"0.0.0.0",()=>console.log(`House of Negus shop listening on ${PORT}`));

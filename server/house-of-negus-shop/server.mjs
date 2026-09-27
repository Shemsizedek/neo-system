import http from "node:http";

const PORT = Number(process.env.PORT || 8080);
const SHOP_HOST = "https://Shemsizedek.myspreadshop.com";
const VERIFY = "YOlhCWqfC2W9h4eyCBZl36jDYopfDggLnUftnbYSLYA";

const pages = {
  "/shipping": {
    title: "Shipping",
    body: `
      <h1>Shipping</h1>
      <p>House of Negus merchandise is produced and fulfilled through Spreadshop. Delivery estimates depend on the products ordered, production method, destination, and shipping option selected at checkout.</p>
      <p>The checkout flow displays the available shipping methods, estimated delivery times, and shipping charges before payment is completed.</p>
      <p>For detailed delivery information, visit <a href="https://www.spreadshop.com/helpcenter/checkouts-in-your-shop/shipping-times-and-costs/">Spreadshop Shipping Times and Costs</a>.</p>
    `
  },
  "/returns": {
    title: "Returns & Refunds",
    body: `
      <h1>Returns & Refunds</h1>
      <p>Orders placed through this storefront are fulfilled through Spreadshop. Return, exchange, refund, and order-support requests are handled through Spreadshop customer service.</p>
      <p>If you need help with an order, contact Spreadshop support at <a href="mailto:help@spreadshop.com">help@spreadshop.com</a> or <a href="tel:+18003810815">1-800-381-0815</a>.</p>
      <p>You can also use the official <a href="https://www.spreadshop.com/contact/">Spreadshop contact form</a>.</p>
    `
  },
  "/contact": {
    title: "Contact",
    body: `
      <h1>Contact</h1>
      <h2>Order and fulfillment support</h2>
      <p>Spreadshop handles production, delivery, and customer service for orders placed through this storefront.</p>
      <p>Email: <a href="mailto:help@spreadshop.com">help@spreadshop.com</a><br>
      Phone: <a href="tel:+18003810815">1-800-381-0815</a><br>
      Hours: Monday–Friday, 9:00 AM–6:00 PM Eastern Time.</p>
      <h2>Fulfillment provider</h2>
      <p>Spreadshirt, Inc.<br>
      400 Penn Center Boulevard, Suite 305<br>
      Pittsburgh, PA 15235<br>
      United States</p>
      <p>For House of Negus / World Temple matters unrelated to an order, visit <a href="https://holytemples.org">HolyTemples.org</a>.</p>
    `
  },
  "/privacy": {
    title: "Privacy",
    body: `
      <h1>Privacy</h1>
      <p>This storefront embeds the Spreadshop shopping experience. When you browse products, add items to your cart, or complete checkout, Spreadshop may process information needed to operate the shop, fulfill orders, process payments, and provide customer service.</p>
      <p>For information about Spreadshop's legal and privacy framework, review <a href="https://www.spreadshop.com/legal-information/">Spreadshop Legal Information</a>.</p>
    `
  },
  "/terms": {
    title: "Terms",
    body: `
      <h1>Terms</h1>
      <p>Products displayed here are sold through the embedded Spreadshop platform. For North America, Spreadshop identifies Spreadshirt, Inc. as the contractual partner responsible for operation of the Spreadshop service.</p>
      <p>Product availability, pricing, shipping options, taxes, checkout, payment processing, fulfillment, and customer-service terms shown during checkout are controlled by the Spreadshop platform.</p>
      <p>Review <a href="https://www.spreadshop.com/legal-information/">Spreadshop Legal Information</a> before placing an order.</p>
    `
  }
};

function shell(title, body, includeShop=false) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="google-site-verification" content="${VERIFY}">
  <meta name="description" content="House of Negus official merchandise shop.">
  <title>${title} | House of Negus</title>
  <style>
    :root{color-scheme:dark}
    *{box-sizing:border-box}
    html,body{margin:0;min-height:100%;background:#080808;color:#fff;font-family:Arial,Helvetica,sans-serif}
    a{color:#fff}
    header{position:sticky;top:0;z-index:10;background:#0b0b0b;border-bottom:1px solid #242424;padding:14px 20px;display:flex;gap:18px;align-items:center;justify-content:space-between;flex-wrap:wrap}
    header nav{display:flex;gap:14px;flex-wrap:wrap}
    header a{text-decoration:none;font-weight:700}
    .brand{font-size:1.05rem;letter-spacing:.03em}
    main{min-height:78vh}
    #myShop{min-height:75vh}
    .loading{padding:48px 20px;text-align:center;color:#bbb}
    .content{max-width:860px;margin:0 auto;padding:48px 20px 64px;line-height:1.65}
    .content h1{font-size:2rem;margin:0 0 18px}
    .content h2{margin-top:30px}
    footer{padding:26px 20px;text-align:center;color:#aaa;border-top:1px solid #242424;font-size:.9rem}
    footer nav{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:12px}
    footer a{color:#ddd}
  </style>
</head>
<body>
<header>
  <a class="brand" href="/">HOUSE OF NEGUS</a>
  <nav>
    <a href="/shipping">Shipping</a>
    <a href="/returns">Returns</a>
    <a href="/contact">Contact</a>
    <a href="https://holytemples.org">HolyTemples.org</a>
  </nav>
</header>
<main>${body}</main>
<footer>
  <nav>
    <a href="/shipping">Shipping</a>
    <a href="/returns">Returns & Refunds</a>
    <a href="/contact">Contact</a>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
  </nav>
  <div>Official House of Negus storefront · Fulfillment and order support provided through Spreadshop</div>
</footer>
${includeShop ? `
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
<script type="text/javascript" src="${SHOP_HOST}/shopfiles/shopclient/shopclient.nocache.js"></script>` : ""}
</body>
</html>`;
}

function shopPage() {
  return shell("Shop", '<div id="myShop"><div class="loading">Loading shop…</div></div>', true);
}

const server=http.createServer((req,res)=>{
  const path=(req.url || "/").split("?")[0];
  if(path==="/health"){
    res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});
    return res.end(JSON.stringify({ok:true,service:"house-of-negus-shop"}));
  }

  const policy=pages[path];
  const html=policy ? shell(policy.title, `<section class="content">${policy.body}</section>`) : shopPage();

  res.writeHead(200,{
    "content-type":"text/html; charset=utf-8",
    "cache-control":"public, max-age=300",
    "x-content-type-options":"nosniff",
    "referrer-policy":"strict-origin-when-cross-origin"
  });
  res.end(html);
});
server.listen(PORT,"0.0.0.0",()=>console.log(`House of Negus shop listening on ${PORT}`));

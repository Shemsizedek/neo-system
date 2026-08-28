export default function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'method not allowed'});
  const required=['NEOSCAN_PUBLIC_ORIGINS'];
  const missing=required.filter(k=>!String(process.env[k]||process.env.NEOSCAN_PUBLIC_ORIGIN||'').trim());
  const cesConfigured=Boolean(process.env.NEOSCAN_CES_ENDPOINT&&process.env.NEOSCAN_CES_ACCOUNT&&process.env.NEOSCAN_CES_TOKEN);
  res.setHeader('cache-control','no-store');
  res.setHeader('x-content-type-options','nosniff');
  if(missing.length)return res.status(503).json({ok:false,ready:false,missing,cesConfigured:false});
  return res.status(200).json({ok:true,ready:true,cesConfigured});
}

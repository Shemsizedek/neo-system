import type express from 'express';
import type { PropertyRepository } from './repository.js';
import { createSellerStore } from './seller-store.js';
import { requireSeller, type SellerPrincipal } from './seller-auth.js';

type SellerRequest = express.Request & { neoRealtyPrincipal?: SellerPrincipal };
const routeParam=(v:string|string[]|undefined)=>Array.isArray(v)?(v[0]??''):(v??'');

export function registerSellerRoutes(app:express.Express, repository:PropertyRepository){
  const store=createSellerStore();

  app.post('/seller/properties/:id/claim', requireSeller, async(req:SellerRequest,res)=>{
    try{
      const id=routeParam(req.params.id); const principal=req.neoRealtyPrincipal!; const property=await repository.get(id);
      if(!property)return res.status(404).json({error:'not_found'});
      await store.assign(id,principal.id,principal.role);
      res.status(201).json({data:{propertyId:id,principalId:principal.id,role:principal.role},disclaimer:'Digital listing ownership is an account-control relationship only and is not proof of deed/title ownership.'});
    }catch(e){res.status(500).json({error:e instanceof Error?e.message:'seller_store_error'});}
  });

  app.post('/seller/properties/:id/media', requireSeller, async(req:SellerRequest,res)=>{
    try{
      const id=routeParam(req.params.id); const principal=req.neoRealtyPrincipal!;
      if(!await store.owns(id,principal.id))return res.status(403).json({error:'listing_not_owned'});
      const kind=String(req.body?.kind??''); const reference=String(req.body?.reference??'').trim(); const visibility=String(req.body?.visibility??'public');
      if(!['image','document'].includes(kind)||!reference||!['public','private','authority_only'].includes(visibility))return res.status(400).json({error:'invalid_media'});
      const row=await store.addMedia(id,principal.id,{kind:kind as 'image'|'document',reference,contentType:req.body?.contentType?String(req.body.contentType):null,sha256:req.body?.sha256?String(req.body.sha256):null,label:req.body?.label?String(req.body.label):null,sortOrder:Number.isFinite(req.body?.sortOrder)?Number(req.body.sortOrder):0,visibility:visibility as 'public'|'private'|'authority_only'});
      res.status(201).json({data:row});
    }catch(e){res.status(500).json({error:e instanceof Error?e.message:'seller_store_error'});}
  });

  app.get('/seller/properties/:id/media', requireSeller, async(req:SellerRequest,res)=>{
    try{const id=routeParam(req.params.id);const principal=req.neoRealtyPrincipal!;if(!await store.owns(id,principal.id))return res.status(403).json({error:'listing_not_owned'});const rows=await store.listMedia(id,true);res.json({data:rows,count:rows.length});}catch(e){res.status(500).json({error:e instanceof Error?e.message:'seller_store_error'});}
  });

  app.get('/properties/:id/media', async(req,res)=>{
    try{const id=routeParam(req.params.id);const property=await repository.get(id);if(!property||property.status!=='active'||property.authority.claimStatus!=='verified')return res.status(404).json({error:'not_found'});const rows=await store.listMedia(id,false);res.json({data:rows,count:rows.length});}catch(e){res.status(500).json({error:e instanceof Error?e.message:'seller_store_error'});}
  });
}

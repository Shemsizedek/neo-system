// NEO Social — normalized publication receipts v0.1

export function createPublicationReceipt({
  destination,
  accountId,
  platformPostId,
  publishedAt=new Date().toISOString(),
  status="published",
  contentId,
  sourceVersion,
  url=null,
  executionMode="api",
}={}) {
  for (const [field,value] of Object.entries({destination,accountId,status,contentId,sourceVersion})) {
    if(typeof value!=="string"||!value.trim()) throw new Error(`${field}_required`);
  }
  if(status==="published" && (!platformPostId || typeof platformPostId!=="string")) {
    throw new Error("platform_post_id_required_for_published");
  }
  return {
    schema:"neo.social.receipt.v0.1",
    destination:destination.trim(),
    accountId:accountId.trim(),
    platformPostId:platformPostId?.trim?.()||null,
    publishedAt,
    status:status.trim(),
    contentId:contentId.trim(),
    sourceVersion:sourceVersion.trim(),
    url,
    executionMode,
  };
}

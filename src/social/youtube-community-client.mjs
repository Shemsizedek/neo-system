// NEO Social — YouTube Community publication bridge v0.1
//
// YouTube does not expose a documented public Data API endpoint for creating
// Community/Posts-tab posts. This bridge therefore prepares a browser/UI job
// rather than pretending an API publish occurred.

export function buildYouTubeCommunityJob({channelUrl,caption,imageUrl,altText,contentId}={}) {
  for (const [field,value] of Object.entries({channelUrl,caption,imageUrl,altText,contentId})) {
    if(typeof value!=="string"||!value.trim()) throw new Error(`${field}_required`);
  }
  if(!/^https:\/\//i.test(channelUrl)) throw new Error("channel_url_must_be_https");
  if(!/^https:\/\//i.test(imageUrl)) throw new Error("image_url_must_be_https");
  return {
    destination:"youtube_community",
    executionMode:"browser-ui",
    requiresInteractiveSession:true,
    channelUrl,
    caption:caption.trim(),
    imageUrl,
    altText:altText.trim(),
    contentId:contentId.trim(),
    status:"ready-for-ui-publish",
    receiptRequired:true,
  };
}

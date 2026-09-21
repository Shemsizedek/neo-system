// NEO Social TikTok Content Posting API adapter v0.1
const BASE = "https://open.tiktokapis.com";

function requireToken(token = process.env.TIKTOK_ACCESS_TOKEN) {
  if (!token) throw new Error("TIKTOK_ACCESS_TOKEN is not configured");
  return token;
}
async function request(path, {token, body} = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireToken(token)}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || (json.error && json.error.code !== "ok")) {
    const err = new Error(json?.error?.message || `TikTok HTTP ${res.status}`);
    err.status = res.status; err.payload = json; throw err;
  }
  return json;
}
export async function queryCreatorInfo(token) {
  return request("/v2/post/publish/creator_info/query/", {token});
}
export async function publishPhoto({
  token,
  title,
  description,
  photoUrls,
  privacyLevel,
  disableComment = false,
  autoAddMusic = false,
  brandContent = false,
  brandOrganic = true,
  isAigc = false,
}) {
  if (!Array.isArray(photoUrls) || photoUrls.length < 1 || photoUrls.length > 35) {
    throw new Error("photoUrls must contain 1-35 verified public image URLs");
  }
  if (!privacyLevel) throw new Error("privacyLevel must come from creator_info/query");
  return request("/v2/post/publish/content/init/", {
    token,
    body: {
      media_type: "PHOTO",
      post_mode: "DIRECT_POST",
      post_info: {
        title,
        description,
        privacy_level: privacyLevel,
        disable_comment: disableComment,
        auto_add_music: autoAddMusic,
        brand_content_toggle: brandContent,
        brand_organic_toggle: brandOrganic,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_images: photoUrls,
        photo_cover_index: 0,
      },
      is_aigc: isAigc,
    },
  });
}
export async function fetchPublishStatus({token, publishId}) {
  if (!publishId) throw new Error("publishId is required");
  return request("/v2/post/publish/status/fetch/", {
    token,
    body: {publish_id: publishId},
  });
}

import { publishFacebookImage } from "./facebook-image-client.mjs";
import { initializeLinkedInImageUpload, uploadLinkedInImageFromUrl, createLinkedInImagePost } from "./linkedin-image-client.mjs";
import { buildYouTubeCommunityJob } from "./youtube-community-client.mjs";
import { createPublicationReceipt } from "./social-publication-receipt.mjs";

function linkedInInitFields(payload){
  const value=payload?.value ?? payload;
  const uploadUrl=value?.uploadUrl ?? value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl ?? value?.uploadUrlExpiresAt;
  const image=value?.image ?? value?.asset ?? value?.imageUrn;
  return {uploadUrl,imageUrn:image};
}

export async function publishNomniSocialJob(job, credentials, {fetchImpl=fetch}={}) {
  if(!job?.destination) throw new Error("destination_required");

  if(job.destination==="facebook"){
    const result=await publishFacebookImage({
      pageId:credentials.pageId,
      pageAccessToken:credentials.pageAccessToken,
      imageUrl:job.imageUrl,
      caption:job.caption,
      fetchImpl,
    });
    return createPublicationReceipt({
      destination:"facebook",
      accountId:String(credentials.pageId),
      platformPostId:String(result.post_id||result.id),
      contentId:job.contentId,
      sourceVersion:credentials.sourceVersion,
      url:result.permalink_url||null,
    });
  }

  if(job.destination==="linkedin"){
    const initialized=await initializeLinkedInImageUpload({
      ownerUrn:credentials.ownerUrn,
      accessToken:credentials.accessToken,
      fetchImpl,
    });
    const {uploadUrl,imageUrn}=linkedInInitFields(initialized);
    if(!uploadUrl||!imageUrn) throw new Error("linkedin_initialize_missing_upload_fields");
    await uploadLinkedInImageFromUrl({uploadUrl,imageUrl:job.imageUrl,fetchImpl});
    const result=await createLinkedInImagePost({
      authorUrn:credentials.ownerUrn,
      accessToken:credentials.accessToken,
      commentary:job.caption,
      imageUrn,
      altText:job.altText,
      fetchImpl,
    });
    return createPublicationReceipt({
      destination:"linkedin",
      accountId:credentials.ownerUrn,
      platformPostId:String(result.id),
      contentId:job.contentId,
      sourceVersion:credentials.sourceVersion,
    });
  }

  if(job.destination==="youtube_community"){
    return buildYouTubeCommunityJob({
      channelUrl:credentials.channelUrl,
      caption:job.caption,
      imageUrl:job.imageUrl,
      altText:job.altText,
      contentId:job.contentId,
    });
  }

  throw new Error(`unsupported_destination:${job.destination}`);
}

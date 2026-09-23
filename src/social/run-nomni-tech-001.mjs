import fs from "node:fs/promises";
import { buildNomniSocialPayload, buildPlatformJobs } from "./nomni-social-payload.mjs";
import { publishNomniSocialJob } from "./nomni-social-publisher.mjs";

function required(name, value) {
  if (!value || !String(value).trim()) throw new Error(name + "_required");
  return String(value).trim();
}

async function main() {
  const manifestPath = process.argv[2] || "content/nomni/campaigns/NOMNI-TECH-001/manifest.json";
  const imageUrl = required("image_url", process.env.NOMNI_IMAGE_URL);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

  const payload = buildNomniSocialPayload({
    title: manifest.title,
    caption: manifest.caption,
    altText: manifest.media.altText,
    imageUrl,
    sourceDocument: manifest.sourceDocument,
    sourceVersion: manifest.sourceVersion,
    claims: manifest.claims,
    destinations: manifest.destinations,
    contentId: manifest.campaignId
  });

  const jobs = buildPlatformJobs(payload);
  const receipts = [];

  for (const job of jobs) {
    if (job.destination === "facebook") {
      receipts.push(await publishNomniSocialJob(job, {
        pageId: required("FACEBOOK_PAGE_ID", process.env.FACEBOOK_PAGE_ID),
        pageAccessToken: required("FACEBOOK_PAGE_ACCESS_TOKEN", process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
        sourceVersion: manifest.sourceVersion
      }));
    } else if (job.destination === "linkedin") {
      receipts.push(await publishNomniSocialJob(job, {
        ownerUrn: required("LINKEDIN_OWNER_URN", process.env.LINKEDIN_OWNER_URN),
        accessToken: required("LINKEDIN_ACCESS_TOKEN", process.env.LINKEDIN_ACCESS_TOKEN),
        sourceVersion: manifest.sourceVersion
      }));
    } else if (job.destination === "youtube_community") {
      receipts.push(await publishNomniSocialJob(job, {
        channelUrl: required("YOUTUBE_CHANNEL_URL", process.env.YOUTUBE_CHANNEL_URL),
        sourceVersion: manifest.sourceVersion
      }));
    }
  }

  const result = { campaignId: manifest.campaignId, imageUrl, receipts, worldBulletin: false };
  await fs.mkdir("artifacts/social", { recursive: true });
  await fs.writeFile("artifacts/social/NOMNI-TECH-001-publication.json", JSON.stringify(result, null, 2));
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});

const freeze = Object.freeze;

// Verified live-production inventory batch sourced from the authorized Temple Drive.
// Source metadata remains authoritative; this module exposes normalized catalog records.
const rows = [
  ["1uQxHAf3Tt8bRLPKV4phdrYpXb4hTNs4l","Book Of Pictures Part 1","2025-08-19T20:46:57.176Z","The Holy Tabernacle Ministries Series"],
  ["191gJpTthZvJH91YvqtHHzG95avLWZhHK","The Truth: 666 Mark Of The Beast Visa","2025-08-19T19:27:16.714Z","The Holy Tabernacle Ministries Series"],
  ["1_QrZKbmuyubocwD9STCwyDpT30xb46pM","The Truth: Are You Still Eating Pork","2025-08-19T19:26:52.260Z","The Holy Tabernacle Ministries Series"],
  ["1eMjiLsVaxdGUojc-3Ld2n20-TOWeTZFX","The Truth: In The 60s","2025-08-19T19:26:35.419Z","The Holy Tabernacle Ministries Series"],
  ["1oSv4vk6xrFFzgT97UTP8YUono0qGrE5I","Women Of The Scriptures","2025-01-12T18:39:39.965Z","The Holy Tabernacle Ministries Series"],
  ["1sEsIznfVOnw0tJbpd2649Sd0pFNPEaVu","Sayings Of Dr. Malachi Z. York","2025-01-12T18:12:59.513Z","The Holy Tabernacle Ministries Series"],
  ["1PGevNksGr_74EZirwoKfrD3whescYs4g","The Truth: The Savior","2025-01-12T17:56:50.585Z","The Holy Tabernacle Ministries Series"],
  ["1YTHJuPjeF7IUqeBgJjO5kbR6FmfpH4-3","The Lost Tribe","2025-01-12T17:07:14.751Z","The Holy Tabernacle Ministries Series"],
  ["1Ivj66P_f3vVL8rgOSZb8kt53nC_DlfJI","The Holy Tabernacle Family Guide","2025-01-12T16:46:57.903Z","The Holy Tabernacle Ministries Series"],
  ["1rR9MnDdqfBeyHe-fGdO_9cXuklfPoL_O","Passport Egipt Of The West (Used To Enter Tama Re)","2025-01-12T04:03:43.395Z","The Holy Tabernacle Ministries Series"],
  ["1kiuiBhei0QYB4u_8cLc1Nh7GVLjCHC_L","Our Bondage","2025-01-12T03:58:35.108Z","The Holy Tabernacle Ministries Series"],
  ["1yFjwJZQVTz929k0O57NJuOhziqKtVMEo","In The 60s","2025-01-11T21:28:50.020Z","The Holy Tabernacle Ministries Series"],
  ["1b3eu1r2ReBWefPSdWOVH_Iz-xJ3UyidP","Grandma's Words Of Wisdom Conveyed","2025-01-11T21:27:34.866Z","The Holy Tabernacle Ministries Series"],
  ["1maO3h5vtapJWx9f6_ETzri8HS3_beIQM","The Book Of Light","2025-01-11T21:15:31.384Z","The Holy Tabernacle Ministries Series"],
  ["1vyhqVVc7y_ViActsEk6yZdRLPxWn9SKi","Allah Maana",null,"The Masonic Series"],
  ["1z5ml5VKPvG5toN7KKRv_OR52iQb4U5Lb","The Best Kept Secrets Are Abe's Kept Sacred 720 Degrees Mum's The Word Revised",null,"The Masonic Series"],
  ["1RPUrRdSIAkgTgqB0u38koBUX4L4S8qH7","666 Leviathan The Beast As The Anti-Christ Part 2",null,"The Masonic Series"],
  ["10pc-cQR77eIJUBBWX6qgHUuNqXkULJvC","666 Leviathan The Beast As The Anti-Christ Part 1",null,"The Masonic Series"],
  ["1obSEsNMzNNa9sXlMTfAwFclFBSvBCbNH","The Best Kept Sacred Mums Word",null,"The Masonic Series"]
];

export const PRODUCTION_BATCH_3 = freeze(rows.map(([sourceId,title,modifiedAt,collection]) => freeze({
  id: `drive-${sourceId}`,
  title,
  author: "Dr. Malachi Z. York",
  resourceType: "book",
  description: `${collection} — live World Library catalog resource.`,
  coverImage: null,
  source: "google-drive",
  sourceId,
  sourceUrl: `https://drive.google.com/file/d/${sourceId}/view`,
  mediaUrl: `https://drive.google.com/file/d/${sourceId}/view`,
  mimeType: "application/pdf",
  edition: null,
  modifiedAt,
  accessClass: "GISD_EXCLUSIVE",
  degreeMapping: [],
  status: "published",
  collection
})));

const freeze = (value) => Object.freeze(value);

export const WORLD_LIBRARY_SOURCE_ROOT = freeze({
  provider: "google-drive",
  folderId: "1yxwfQSQC5TjSLYaHXcNVOWFWDQ-Io0z9",
  mode: "read-only",
});

export const AUTHORIZED_COLLECTIONS = freeze([
  { id: "1wkAl-OUROzTRwGjfItw2qemCDxcEGrqW", title: "The Untold Story Of Dr. Malachi Z. York" },
  { id: "1YzoD_6xy6xFmczRLu8bGVWuKW7cbcERT", title: "Dr.Malachi Z. York Music" },
  { id: "1wLBd3MvTjWVhEkvDlLMR-Oa0T9JhSE_R", title: "Raise Your Frequency" },
  { id: "1XfGA4kD5ITFYkX66uckAVxvBQMLkIBDX", title: "Dr. Malachi Z. York Audio Tapes" },
  { id: "17Ra036czXdpCbweSuVt5BBi6mICA6765", title: "The Holy Tablets Audiobook" },
  { id: "1vKO6tlZVySb2MS19NCt581alcLkEY9CX", title: "Vegan Cookbooks" },
  { id: "1tRwr60HsyXa157jorLnJNirgF1ecuk2m", title: "Dr. Malachi Z.York Books" },
].map(freeze));

export const BOOK_COLLECTIONS = freeze([
  ["1VweCCIjKT1mxlIyMdmO_0YXqIT51aNaU", "Hear After Doctrine"],
  ["1KMObzXQ8SCzuiGJCeQX8bWOCLytGC75u", "The Moorish Series"],
  ["1mLFmbQ1m2kpWMvGJQmPKuqolWyA1KcmI", "The Masonic Series"],
  ["16kOTZrxei7sT8dhFVSvbelUljLPHbow5", "Children’s Scrolls"],
  ["1CvaPrgHogBoFuSVL2E3FG5_-uWqWd4mK", "The Holy Tabernacle Ministries Series"],
  ["1bFUb9wLnac6gRn9mYd9fGSu3Ef7MCADw", "Ancient And Mystic Order Of Melchizedek"],
  ["1dQVtjHMgrO05Xp-drjNzwhQz33l8WfO6", "Ceremonies Series"],
  ["1N4e5bbcAUdEuu6_G25b7i2WENRuWErgV", "Ansaar Series"],
  ["1Q052VZ9t1aCwm0db1sJip5bRP4Y3AzGw", "The Supreme Mathematics Series"],
  ["1Gm2HBql1ax8yM9nXecsYd5mctC3q9X7o", "Ritual & Practices Series"],
  ["18i_PQgOBGUvDcBi00mI-mPxiSdKZqVoN", "Debates And Discussions Scrolls"],
  ["1kTwx5Xss2BzgZeSpURdhUZL39Gx7qlyP", "The Right Knowledge Series"],
  ["13l9PoOgsQKtIZUr5tbs0T37fzMtpYTET", "The Ancient Egyptian Order Series"],
  ["1dgd5zgfIypf138HWVuPvKm5_6RNS75oH", "The Nuwaupic Language Series"],
].map(([id, title]) => freeze({ id, title })));

// First verified recursive leaf scan. Additional collection scans append metadata only;
// source files remain in place and are never copied, moved, renamed, or deleted.
export const DISCOVERED_SOURCE_FILES = freeze([
  ["1TgTHPeSJHugqnYAKgysRxFNBU-1Sqg3X", "The Millennium Book Part 1", "2025-08-19T19:54:31.564Z"],
  ["1dd2oZaBpR_Q_HhoLEmf9TK_HIpEujg9d", "The Millennium Book Part 2", "2025-08-19T19:54:07.269Z"],
  ["18m2OrOyUZqje33pg-WKD_PRxrM3Da-oH", "Women Who Changed The Course Of History", "2025-01-12T18:40:10.725Z"],
  ["1ifkP7DCduCgEZ1gYvJ8x7Of0wtadQPym", "The United Nuwaubian Nation Of Moors International Flags", "2025-01-12T17:57:46.857Z"],
  ["1xwUNUDP5EoRg9UDnG6iNJoE-KMrvp0v_", "The Sacred Wisdom Of Tehuti", "2025-01-12T17:43:34.743Z"],
  ["1wSoVORq0bSWl2RACC-yFbSId6-Vp8J8i", "The Black Book", "2025-01-12T16:37:50.923Z"],
  ["1pu9eQANOT5jM-BHfH1STxYJL3f8SYFDT", "Let’s Set The Record Straight An Except From The Sacred Record Of The Moors", "2025-01-11T21:33:38.733Z"],
  ["13olI8YvHf2Qngq59ihByeAbB35mLJDa2", "The United Nuwaupian Nation Of Moors", "2025-01-11T20:25:16.841Z"],
  ["1anSV3hRPnxPS918v3vRay_fu_JHY9b1H", "Man Of The Hour", "2025-01-11T01:29:07.227Z"],
  ["1cBXgLA5d4T8FsApbry53gyIE6ZhsIvpD", "Ancient Egypt, And The Pharoahs", "2025-01-07T20:17:44.067Z"],
  ["1qtZ46A6UP-1hPSK-DI_eLAep4WQQNWh5", "The Luciferian Conspiracy", "2023-05-29T22:48:47.000Z"],
].map(([sourceId, title, modifiedAt]) => freeze({
  id: `drive-${sourceId}`,
  title,
  author: "Dr. Malachi Z. York",
  resourceType: "book",
  description: null,
  coverImage: null,
  source: "google-drive",
  sourceId,
  sourceUrl: `https://drive.google.com/file/d/${sourceId}/view`,
  mediaUrl: `https://drive.google.com/file/d/${sourceId}/view`,
  mimeType: "application/pdf",
  edition: null,
  modifiedAt,
  accessClass: "REVIEW",
  degreeMapping: [],
  status: "REVIEW",
  collection: "The Moorish Series",
})));

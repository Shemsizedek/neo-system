# MSTA / Noone Society legacy-site preservation

Public target: `https://msta.holytemples.org`

## Recovered legacy sources

The following IM Creator URLs were recovered from the current `holytemples.org` WordPress content and are treated as canonical legacy references until a fuller export or archive is recovered:

- `https://www.im-creator.com/free/noonesociety/moorish_parliament`
- `http://www.im-creator.com/free/noonesociety/noone-society`

The current WordPress site references the Moorish Parliament URL from World Ministries and World Parliament, and references the Noone Society URL from World Interfaith Court.

## Preservation behavior

`server/msta-legacy-proxy` uses mirror-first behavior:

1. Request the registered IM Creator source.
2. Rewrite the two recovered legacy page URLs onto `msta.holytemples.org`.
3. Preserve the source response when reachable.
4. If IM Creator is unavailable, return an explicit preservation fallback page instead of inventing replacement content.

## Faithful rebuild input

For pixel-faithful reconstruction, prefer one or more of the following from the original IM Creator account:

- exported/downloaded HTML/site package;
- saved HTML pages;
- screenshots of each page at desktop and mobile widths;
- image/media exports;
- the complete list of `noonesociety` page URLs;
- archival snapshots.

When recovered, the static preservation copy should replace upstream dependency while preserving the historical layout, text, images, navigation, and page hierarchy. New NEO services should be added outside the preserved historical surface rather than silently altering the archive.

# NEO Consumer UI Standard

This standard applies to public-facing NEO websites, web apps, mobile apps, device interfaces, browser extensions, and GitHub Pages surfaces.

## Primary principles

1. **Consumer task first.** The primary action must dominate the first screen. Internal telemetry, development status, governance metadata, diagnostics, and advanced controls should not compete with the primary task.
2. **Progressive disclosure.** Advanced capabilities belong in compact menus, drawers, accordions, secondary pages, or post-action views.
3. **Mobile first.** A mobile landing page should normally expose one primary action and one compact menu at most.
4. **Desktop remains simple.** Desktop may add a persistent utility/search surface, but should not duplicate large panels or dashboards without a user action.
5. **Small controls.** Utility buttons, menu buttons, status badges, and navigation controls should be compact and visually secondary.
6. **No broken affordances.** Buttons and links that do nothing, routes that 404, missing uploads, broken media, and empty placeholders must be fixed, disabled with an explanation, or removed.
7. **Asset integrity.** Logos, favicons, images, video thumbnails, app icons, and device art must resolve correctly and include accessible alternative text where appropriate.
8. **Market-ready copy.** Public copy should explain consumer value. Internal architecture, experimental terminology, and implementation details belong in documentation or advanced views unless they directly help the consumer.
9. **Responsive by default.** Every public surface must support small mobile screens, tablets, desktop browsers, and keyboard navigation without horizontal overflow.
10. **GitHub Pages compatible.** Static consumer surfaces must work with relative URLs and the repository's GitHub Pages base path. Runtime/API dependencies must fail gracefully when unavailable.

## NEO visual language

- Prefer dark, high-contrast surfaces with restrained NEO green accents.
- Use generous whitespace and clear hierarchy rather than dense card grids.
- Limit each view to one dominant CTA.
- Prefer rounded search/input surfaces and compact secondary controls.
- Avoid unnecessary animation, glowing effects, or decorative panels that reduce readability.

## Consumer readiness audit

For each NEO Service, verify:

- landing page hierarchy and primary CTA
- navigation and dropdown behavior
- all links and buttons
- 404/error states
- form validation and uploads
- image/logo/favicon resolution
- embedded media/video behavior
- mobile/tablet/desktop responsive layout
- accessibility labels and keyboard behavior
- loading/empty/offline states
- GitHub Pages relative-path compatibility
- public copy and product naming
- console errors and obvious JavaScript failures

## Noogle-specific rule

Noogle's home page is search-first:

- **Mobile:** one primary search bar.
- **Desktop:** one compact top search/address bar plus one central primary search bar.
- Secondary information is hidden until it is relevant or explicitly requested.
- Secondary navigation uses a compact dropdown instead of a persistent sidebar.

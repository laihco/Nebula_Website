# Nebula player website

A static, responsive player website with an interactive Three.js landing page, 13 information pages and the
modding documentation at `/mods/`.

## Performance and mobile

The homepage paints its content before loading the 3D scene. Star bits share six instanced draw batches;
the scene sleeps outside the hero and in hidden tabs. Touch devices use a 30 fps animation budget and a
capped pixel density. Collection, regeneration, planet collisions, and word formation remain available.
All information pages use the lightweight shared script, without downloading Three.js.

Browser models are optimized GLB files. Original COLLADA models are kept in `assets/model-sources/`
outside the published assets. After changing a source model, run `npm run models:optimize` and commit
the generated GLB files. This is an offline tool; its XML parser is never shipped to visitors. Vertex colours
are stored as normalized 16-bit values (a largest error of 1/131070, invisible on an 8-bit display).

Textures and images are published as lossless WebP. The PNG originals live in `assets/texture-sources/`;
after changing one, run `npm run images:optimize`. The script decodes every WebP it writes and stops if a
single pixel differs from the PNG, including colour under transparent pixels. The Delfino font is served as
WOFF2 (TTF fallback) and preloaded on every page so headings render in it without a late swap.

The scene only resizes its WebGL buffer when its size really changes, so a phone's address bar showing and
hiding while scrolling does not stall the page. The custom cursor moves with a transform, not layout.

Mobile layouts share the same content and URLs as desktop. Navigation collapses into a menu; cards
stack, touch controls have larger targets, and wide tables scroll within their own containers.

## Modding docs

The **Modding** section is written in Markdown in `content/modding/` — see
[its writing guide](content/modding/README.md). `scripts/render-docs.mjs` turns each page into HTML with a
sidebar, "On this page" contents, previous/next links and build-time syntax highlighting, and writes a search
index that loads only when a visitor starts searching. Every link between pages is checked: a broken link stops
the build. The generated `mods/` and `public/mods/` folders are not committed.

## Run locally

```sh
npm install
npm run dev
```

The development server regenerates the HTML before starting. Production builds do the same.

```sh
npm test
npm run build
npm run preview
npm run format
npm run format:check
```

## Where to edit

| File                       | Purpose                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| `content/pages/*.json`     | All text for each page; see [editing instructions](content/pages/README.md) |
| `templates/pages/*.html`   | Page layout and link destinations, with text placeholders                   |
| `content/pages.json`       | Routes and their JSON/template file locations                               |
| `scripts/render-pages.mjs` | Validates text and generates formatted HTML                                 |
| `style.css`                | Base layout and responsive rules                                            |
| `reference-ui.css`         | Delfino typography, Galaxy-style controls, and scenery                      |
| `player-site.css`          | Information pages, release section, cards, and navigation                   |
| `main.js`                  | Models, collection effects, and word formation                              |
| `star-physics.js`          | Gravity and terrain collisions                                              |
| `site.js`                  | Shared cursor, menu, help search, and live download count                   |
| `content/modding/**/*.md`  | Modding docs pages; see [the writing guide](content/modding/README.md)      |
| `scripts/render-docs.mjs`  | Builds the modding docs, checks their links, writes the search index        |
| `docs.css`, `docs.js`      | Modding docs layout, sidebar drawer, search and copy buttons                |

While `npm run dev` is running, saving a page JSON or template automatically regenerates the local preview. Builds also regenerate all pages. Generated `index.html` files should not be edited directly. Use `npm run content` to regenerate them manually.

Download totals are cached in `content/downloads.json`; if GitHub is unavailable, the last saved count remains visible. Pending release confirmations and media are listed in `content/launch-checklist.md`.

## Animation and assets

The home page alone loads Three.js. Star bits use the supplied StarPiece model. Honeyhive and Good Egg Garden Planet use their original COLLADA geometry, UVs, and available vertex colors. The sky layers the supplied Dome starfield and galaxy textures. Active files live in `public/environment`, `public/models`, and `public/fonts`.

Bits gather into the silhouette from `public/nebula-word-reference.webp`, then return to their previous positions when released. Pointer sweeps or touch collect bits with a short accelerating pickup and sparkle trail. Regenerate restores them. Reduced-motion settings skip animated movement.

Terrain collision queries use three-mesh-bvh and the models' triangle geometry. Enclosing spheres only reject distant queries; they are not bounce barriers. Foliage cards collide as polygons, including their transparent texture cutouts. Tests cover empty space, rebounds, landing, and model transforms.

The locally supplied Delfino font and Nintendo game assets came from the user. Model collection: [The Models Resource](https://models.spriters-resource.com/wii/supermariogalaxy/). They remain their respective owners' artwork. The site is not affiliated with Nintendo.

## Publishing

Live site: [laihco.github.io/Nebula_Website](https://laihco.github.io/Nebula_Website/).

Pushing `main` triggers `.github/workflows/pages.yml`, which installs dependencies, runs tests, builds all routes, and deploys to GitHub Pages. Relative URLs support the repository subdirectory.

## Previewing in VS Code

Use **Ctrl+Shift+B → Preview website (Vite)**, or run `npm run dev` in the terminal. Open the Local URL printed by Vite. If the preview is already running, reuse that browser tab.

The **Go Live** button belongs to the Live Server extension and is not compatible with this project's source files. It bypasses Vite's module handling and public asset routing, so the font, scenery textures, and Three.js models will be missing. For a production preview, use `npm run build` followed by `npm run preview`.

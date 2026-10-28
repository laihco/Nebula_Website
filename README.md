# Nebula player website

A static, responsive player website with an interactive Three.js landing page and 13 information pages.

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

While `npm run dev` is running, saving a page JSON or template automatically regenerates the local preview. Builds also regenerate all pages. Generated `index.html` files should not be edited directly. Use `npm run content` to regenerate them manually.

Download totals are cached in `content/downloads.json`; if GitHub is unavailable, the last saved count remains visible. Pending release confirmations and media are listed in `content/launch-checklist.md`.

## Animation and assets

The home page alone loads Three.js. Star bits use the supplied StarPiece model. Honeyhive and Good Egg Garden Planet use their original COLLADA geometry, UVs, and available vertex colors. The sky layers the supplied Dome starfield and galaxy textures. Active files live in `public/environment`, `public/models`, and `public/fonts`.

Bits gather into the silhouette from `public/nebula-word-reference.png`, then return to their previous positions when released. Pointer sweeps or touch collect bits with a short accelerating pickup and sparkle trail. Regenerate restores them. Reduced-motion settings skip animated movement.

Terrain collision queries use three-mesh-bvh and the models' triangle geometry. Enclosing spheres only reject distant queries; they are not bounce barriers. Foliage cards collide as polygons, including their transparent texture cutouts. Tests cover empty space, rebounds, landing, and model transforms.

The locally supplied Delfino font and Nintendo game assets came from the user. Model collection: [The Models Resource](https://models.spriters-resource.com/wii/supermariogalaxy/). They remain their respective owners' artwork. The site is not affiliated with Nintendo.

## Publishing

Live site: [laihco.github.io/Nebula_Website](https://laihco.github.io/Nebula_Website/).

Pushing `main` triggers `.github/workflows/pages.yml`, which installs dependencies, runs tests, builds all routes, and deploys to GitHub Pages. Relative URLs support the repository subdirectory.

## Previewing in VS Code

Use **Ctrl+Shift+B → Preview website (Vite)**, or run `npm run dev` in the terminal. Open the Local URL printed by Vite. If the preview is already running, reuse that browser tab.

The **Go Live** button belongs to the Live Server extension and is not compatible with this project's source files. It bypasses Vite's module handling and public asset routing, so the font, scenery textures, and Three.js models will be missing. For a production preview, use `npm run build` followed by `npm run preview`.

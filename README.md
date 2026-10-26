# Nebula landing page concept

Local, responsive fan-site demo. Run `npm install`, then `npm run dev`. Build with `npm run build`.

Uses Three.js to load the supplied StarPiece COLLADA geometry. Colors are applied with new materials to make small models readable. The original highlight texture is retained with the source model. Sweep the pointer over drifting bits to collect them, or tap them on touchscreens. Regenerate restores the bits. Form the word restores all bits and replaces the main title with a star-bit NEBULA silhouette; release returns the text heading. Star bits gather into the title over 1.5 seconds, then become collectible within the letters. Regenerate rebuilds the title in formation mode. Reduced motion skips the gathering animation. Motion respects the system reduced-motion setting. Content stays usable without WebGL or JavaScript.

Project information and links were checked against https://github.com/keepvaibin/nebula on October 22, 2026. This is an independent design concept, not an official Nebula or Nintendo site. Recheck project requirements and release availability before publishing.

Model: user-supplied StarPiece.dae and HighLight3.png from https://models.spriters-resource.com/wii/supermariogalaxy/asset/283844/ (Super Mario Galaxy / Nintendo). Review asset permissions before public distribution. Fonts: DM Sans and Space Grotesk via Google Fonts, with local system fallbacks.



## Galaxy visual direction

The presentation draws on Nintendo's original Wii manual (https://m1.nintendo.net/docvc/RVL/USA/RMGE/RMGE_E.pdf) and Gravity 101 (https://www.nintendo.com/en-gb/News/2008/Gravity-101-of-Super-Mario-Galaxy-250418.html).

The manual confirms pointer-sweep collection. Nintendo describes local planetary gravity and separately activated Pull Stars. The demo's elliptical star-bit paths are a visual interpretation of this theme, not a recreation of the game's star-bit physics. Procedural CSS planets, a blue atmospheric horizon, ice-blue controls, gold chapter stars, a star pointer, pickup sparkles, and a session-only collection counter develop the journey from space to launch preparation. No new Nintendo artwork was downloaded.

## Supplied UI references and font

The October 26 UI pass follows the user-supplied settings.mp4 and observatory/dialogue screenshots: glossy cyan controls, turquoise selected states, white beveled rims, pale-blue panels, and rounded dialogue bubbles. reference-ui.css contains the presentation layer. public/fonts/Delfino.ttf is the user-supplied Delfino typeface, served locally; the star-bit word samples the same font after loading it. The old external Google Fonts request was removed. The reference video is not bundled with the website.

## Original environment assets

The user-supplied galaxy assets folder provides Dome Skies (AstroDomeUniverse.png and AstroDomeGalaxy.png), Comet Observatory Dome Asteroids (AstroDomeAsteroid.dae), and Good Egg Garden Planet (DiskGardenPlanet.dae with its texture files). These are stored in public/environment. The original textured geometry replaces the CSS placeholder planets. The sky textures are layered behind the scene, rather than claiming an exact recreation of the Wii sky material pipeline. COLLADA texture UVs and available vertex colors are preserved, using basic materials because Wii lighting/TEV settings do not translate directly to browser materials. Scenery rotates gently and stays static with reduced motion. Source collection: https://models.spriters-resource.com/wii/supermariogalaxy/ . Assets remain Nintendo game artwork supplied by the user.

The upper-left scenery now uses the user-supplied Honeyhive ForestHomePlanet.dae and its referenced textures (public/environment/honeyhive), replacing the asteroid field.

## Star-bit gravity and collection

The October 26 recording informed a new motion pass. star-physics.js integrates inward gravity with velocity and small time steps, reflects incoming velocity on impact, and maintains gentle hops. Conservative bounding spheres enclose each rotating world, expanded by each bit's radius. This avoids terrain penetration but deliberately leaves clearance around irregular trees, ledges, and empty parts of the bounding volume. The word formation and pickup targets sit in front of the worlds; gathering and pickup paths also respect collision shells. Pickup now accelerates toward the pointer over 260 ms, spins, emits a short glint trail, and ends in a sparkle. Reduced motion skips movement. Validation included a 60-second simulated gravity run with no shell penetration and a verified inward-to-outward bounce.

### Terrain collision upgrade

Triangle-level collisions now replace the spherical bounce barriers. A three-mesh-bvh acceleration tree is built once from each model's geometry; each query is transformed into the rotating/scaled world's local coordinates. The old enclosing sphere remains only as a fast rejection check, not as a contact surface. Bits use small sphere colliders against the closest terrain triangle, so they can enter empty space between model features. Automated tests cover open space, contact reflection, a 20-second gravity landing, and rotation/scale changes (`npm test`). Exported foliage cards remain polygonal collision surfaces, so the collision shape does not follow transparent cutouts inside individual texture images.

Flight tuning now uses weaker gravity, near-elastic rebounds, wider starting radii, and varied sideways/outward launch speeds. Contacts replenish outward flight so bits do not settle into dense terrain clusters; triangle collisions remain active.

Project terminology checked October 26, 2026 against Nebula's current README and BUILDING.md: Nebula is a native PC port based on the Petari decompilation by SMGCommunity. The page headline, description, and explanation have been corrected from the older static-recompiler description. Sources: https://github.com/keepvaibin/nebula and https://github.com/SMGCommunity/Petari .

## Sharing and deployment

Live site: https://laihco.github.io/Nebula_Website/ . GitHub Pages builds and deploys main using .github/workflows/pages.yml. Every push runs npm ci, tests, and the production build before deploying. Relative build URLs and the runtime asset helper keep fonts, textures, and COLLADA files working under the repository URL.

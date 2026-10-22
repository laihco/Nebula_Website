# Nebula landing page concept

Local, responsive fan-site demo. Run `npm install`, then `npm run dev`. Build with `npm run build`.

Uses Three.js to load the supplied StarPiece COLLADA geometry. Colors are applied with new materials to make small models readable. The original highlight texture is retained with the source model. Sweep the pointer over drifting bits to collect them, or tap them on touchscreens. Regenerate restores the bits. Form the word restores all bits and replaces the main title with a star-bit NEBULA silhouette; release returns the text heading. Star bits gather into the title over 1.5 seconds, then become collectible within the letters. Regenerate rebuilds the title in formation mode. Reduced motion skips the gathering animation. Motion respects the system reduced-motion setting. Content stays usable without WebGL or JavaScript.

Project information and links were checked against https://github.com/keepvaibin/nebula on October 22, 2026. This is an independent design concept, not an official Nebula or Nintendo site. Recheck project requirements and release availability before publishing.

Model: user-supplied StarPiece.dae and HighLight3.png from https://models.spriters-resource.com/wii/supermariogalaxy/asset/283844/ (Super Mario Galaxy / Nintendo). Review asset permissions before public distribution. Fonts: DM Sans and Space Grotesk via Google Fonts, with local system fallbacks.



## Galaxy visual direction

The presentation draws on Nintendo's original Wii manual (https://m1.nintendo.net/docvc/RVL/USA/RMGE/RMGE_E.pdf) and Gravity 101 (https://www.nintendo.com/en-gb/News/2008/Gravity-101-of-Super-Mario-Galaxy-250418.html).

The manual confirms pointer-sweep collection. Nintendo describes local planetary gravity and separately activated Pull Stars. The demo's elliptical star-bit paths are a visual interpretation of this theme, not a recreation of the game's star-bit physics. Procedural CSS planets, a blue atmospheric horizon, ice-blue controls, gold chapter stars, a star pointer, pickup sparkles, and a session-only collection counter develop the journey from space to launch preparation. No new Nintendo artwork was downloaded.

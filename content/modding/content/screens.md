---
title: Screens and fonts
description: Build 2D screens and HUD pieces as .layout.json files, bring your own fonts, and open them from code.
order: 7
level: intermediate
---

A screen (a layout) is a tree of 2D panes: pictures, text and groups. You write it as a `.layout.json` file; the cook
turns it into the game's own layout file, so the game draws it, widens it for 16:9 and pays for it exactly as it
does for its own screens. You can also bring TrueType or OpenType fonts, which are cooked into the game's font form
and stay sharp at any size.

## Quick start

```text
my-mod/
  luma.json
  source/main.lum
  layers/
    base/
      files/
        LayoutData/Counter.arc/
          Counter.layout.json
          timg/Star.png
```

```json
{
  "panes": [
    {
      "name": "Hud",
      "type": "pane",
      "position": [240, 170],
      "widen": true,
      "children": [
        {
          "name": "Icon",
          "type": "picture",
          "texture": "Star",
          "size": [32, 32],
          "anchor": "right"
        },
        {
          "name": "Count",
          "type": "text",
          "size": [160, 32],
          "text": "x 120",
          "length": 16,
          "font": "NumberFont",
          "font_size": 28,
          "place": "left",
          "colour": "ffffffff"
        }
      ]
    }
  ],
  "groups": [{ "name": "Counter", "panes": ["Icon", "Count"] }]
}
```

```lumascript source/main.lum
use kit.screen

hook after GameScene::startStagePlayFirst() {
    screen.layout(layout "Counter", pauses: false)    // the mod's layout, shown as a screen
}
```

A layout you open by name with the [ui service](services/ui.md) lives in the archive `LayoutData/<Name>.arc`.

## Where a layout goes

- `layers/<layer>/files/<Archive>.arc/<Name>.layout.json` (or in the archive's `blyt/` folder) becomes the archive's
  `blyt/<Name>.brlyt`, the game's own layout file.
- Picture textures are the archive's `timg/<texture>.png` (cooked to the game's texture form) or
  `timg/<texture>.tpl`.
- A `.layout.json` outside an archive is refused: `Cook.Layout.NotInArchive` {file}.

## The file

| Key      | Meaning                                                                                                | Default                            |
| -------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| `size`   | The layout's screen, `[w, h]`, centred                                                                 | `[608, 456]` (every game layout's) |
| `panes`  | The top-level panes (required; may be empty). They hang from a root pane `RootPane` that the cook adds |                                    |
| `groups` | Named groups of panes                                                                                  | none                               |

The screen is 608 layout units wide. Positions are measured x to the right and y **up**, from the parent's position;
the root's position is the screen's centre.

### Every pane

| Key                 | Meaning                                                                                                                                          | Default  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `name`              | Required. 1 to 16 letters, digits or `_`; unique in the layout (without case), and not `RootPane`                                                |          |
| `type`              | `pane` (groups others), `picture`, `text`, or `bounding` (a hit area that draws nothing)                                                         |          |
| `position`          | `[x, y]`: where the pane's anchor stands, from its parent's position                                                                             |          |
| `size`              | `[w, h]`, not negative. Required except for `pane`                                                                                               |          |
| `scale`             | A number or `[x, y]`                                                                                                                             | 1        |
| `rotation`          | Degrees about the screen's axis, or `[x, y, z]`                                                                                                  |          |
| `anchor`            | Which point of the pane stands at `position`: `top_left`, `top`, `top_right`, `left`, `center`, `right`, `bottom_left`, `bottom`, `bottom_right` | `center` |
| `alpha`             | 0 to 255                                                                                                                                         | 255      |
| `visible`           | Shown or not                                                                                                                                     | `true`   |
| `alpha_to_children` | Its alpha fades its children too                                                                                                                 | `true`   |
| `widen`             | On a wide screen its place spreads with the screen, as the game's HUD counters do                                                                | `false`  |
| `children`          | A list of panes                                                                                                                                  | none     |

> [!TIP]
> Set `widen` on panes that sit near the screen's edges (counters, icons) so they move out to the edges on a 16:9
> screen instead of staying in the 4:3 middle.

### picture

| Key       | Meaning                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------- |
| `texture` | A texture name (`.png` or `.tpl` may be written). The archive must have `timg/<name>.png` or `.tpl` |
| `colour`  | `"rrggbbaa"` for the whole picture                                                                  |
| `corners` | Four colours: top left, top right, bottom left, bottom right. Not with `colour`                     |

The default colour is white. With a texture the colours tint it; without one they are the picture.

### text

| Key                                    | Meaning                                                                                                                       | Default         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `text`                                 | The words as they show, in any language. `\n` breaks a line; other control characters are refused                             |                 |
| `length`                               | The most characters (UTF-16 units) it holds, 1 to 255. `ui.set_text` cuts there; text in the file longer than this is refused | 255             |
| `font`                                 | A game font (below), or a mod's own font `Luma/<id>/<path>`                                                                   | `MessageFont26` |
| `font_size`                            | A number or `[w, h]`                                                                                                          | 26              |
| `place`                                | Where the text sits in its pane (the anchor names)                                                                            | `center`        |
| `align`                                | How its lines line up: `as_place`, `left`, `center`, `right`                                                                  | `as_place`      |
| `colour`, or `colours` `[top, bottom]` | Text colour, or a top-to-bottom fade                                                                                          | white           |
| `char_space`, `line_space`             | Extra space between characters and lines                                                                                      | 0               |

The game's fonts are `MessageFont26`, `NumberFont`, `MenuFont64`, `PictureFont` and `CinemaFont26`.

### groups

Each group has a `name` (as a pane's, unique among groups, not `RootGroup`) and `panes`, a list of the layout's pane
names.

## Fonts

To use your own typeface, put a font description and the font file in `assets/`:

```text
layers/
  base/
    assets/
      fonts/Title.font.json
      fonts/Title.ttf
```

```json
{
  "file": "Title.ttf",
  "size": 48,
  "glyphs": { "chars": "★♥", "ranges": [["U+0400", "U+04FF"]] },
  "fallback": "MessageFont26"
}
```

In a layout, name it as `"font": "Luma/<id>/fonts/Title"` (a `.font.json` or `.brfnt` ending may be written). In
LumaScript, fonts are named with `font "..."`, for example `draw.text(..., font: font "Lyrics", ...)`.

| Key        | Meaning                                                                                            | Default         |
| ---------- | -------------------------------------------------------------------------------------------------- | --------------- |
| `file`     | Required. A TrueType or OpenType file beside it (`.ttf`, `.otf`, `.ttc`, `.otc`; the first face)   |                 |
| `size`     | Pixels an em the characters are drawn at, 8 to 96. This is the detail kept, not the size on screen | 48              |
| `glyphs`   | Extra characters to draw (below)                                                                   |                 |
| `fallback` | The game font that draws characters your font lacks                                                | `MessageFont26` |

**Characters drawn.** Always Latin (U+0020-007E, U+00A0-024F), common punctuation (U+2010-2027, U+2030-203A) and the
euro sign, those the font has. Add more with `glyphs`:

- `chars`: a string of characters;
- `ranges`: `[first, last]` pairs, each a number or `"U+hhhh"`;
- `all`: `true` draws every character the font maps, up to U+FFFF.

Characters you asked for that the font lacks are named in a Note (`Cook.Font.Missing`, with the first 20), and the
fallback font draws them.

**How it is cooked.** The characters are drawn into the game's own font form as distance-field sheets, so they stay
sharp at any drawn size. Kerning pairs are read from the font (its GPOS `kern` feature, else its `kern` table) for
characters below U+3000. A layout's `font_size` N makes the font's ascent plus descent N high.

| Limit                                                                     | Refusal                                                                                |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Characters up to U+FFFF                                                   | `Cook.Font.Beyond` {where, char}                                                       |
| A line, advance or left side of at most 127 pixels, a cell of at most 255 | `Cook.Font.TooLarge` {uri, size, most}: `most` is the largest `size` that fits         |
| Sheets at most 1024 x 1024, at most 32 sheets                             | `Cook.Font.TooMany` {uri, count, max, size}: draw fewer characters or a smaller `size` |
| At most 65,536 kerning pairs (those that move most are kept)              | `Cook.Font.KernCut` (a Note)                                                           |

Other refusals: `Cook.Font.Unreadable` {uri} (not a font), `Cook.Font.Code` {where, value} (a bad code),
`Cook.Font.RangeOrder` {where} (first after last), `Cook.Font.NoGlyph` {uri} (no character drawn at all),
`Cook.Font.NotAsset` {file} (a `.font.json` under `files/`), `Cook.Effect.FilePath` and `Cook.Effect.FileMissing`
for the file path, and `Cook.Effect.Choice` for an unknown fallback.

At run time, a font that is missing or cannot be read is replaced by the message font, and the mod log says so
(`Content.MissingFont`, 672).

## Checks

Every key is checked with the same words as effects, and every refusal names the place as a JSON pointer:
`Cook.Effect.UnknownPart` (a key the place does not take, so a misspelt key is never ignored), `Kind`, `Range`,
`Choice`, `Color`, `Length` and `Missing`.

| Refusal                                    | When                                                            |
| ------------------------------------------ | --------------------------------------------------------------- |
| `Cook.Layout.Name`                         | A pane name that is empty, too long, or has other characters    |
| `Cook.Layout.Twice`                        | Two panes (or groups) with one name, or a pane named `RootPane` |
| `Cook.Layout.NoTexture` {where, name, uri} | A picture's texture is not in the archive's `timg/`             |
| `Cook.Layout.Both`                         | A picture with both `colour` and `corners`                      |
| `Cook.Layout.Control`                      | A control character in text other than `\n`                     |
| `Cook.Layout.TextLong`                     | Text longer than its `length`                                   |
| `Cook.Layout.NoFont` {where, name, uri}    | A font of your own mod that no layer has                        |
| `Cook.Layout.NoPane`                       | A group names a pane the layout lacks                           |
| `Cook.Layout.TooMany`                      | More than 16,000 panes                                          |
| `Cook.Layout.NotInArchive` {file}          | A layout outside an archive                                     |

A font path with an empty, `.` or `..` part, fewer than three parts, a character in `\ : < > " | ? *`, or longer than
199 bytes with `.brfnt` is `Cook.Effect.Choice`.

`lumalink check` and `pack` with `--game` cook each `.layout.json` and report refusals as **L804** on the layout
file. The texture and font checks need your mod **folder**: on a packed `.luma` LumaLink cannot look, but the game's
start does.

> [!PLANNED]
> Not built yet:
>
> - animations as named tracks in the layout file (the ui service already plays the game's own layout animations);
> - `window` panes with a 9-slice frame;
> - patching one of the game's layouts by pane name, so two mods changing one HUD combine. Today a `.layout.json` in
>   an archive the game has adds a layout file beside the game's;
> - a check for text overflowing its pane;
> - text by message key (today: literal text, or `ui.set_text`).

## Run time

- [LumaKit: screen](lumakit/screen.md) shows a layout of your mod as a whole screen: `screen.layout(layout "<Name>")`.
- [LumaKit: hud](lumakit/hud.md) gives ready-made HUD pieces without a layout file.
- The [ui service](services/ui.md) opens a layout by name (`LayoutData/<Name>.arc`), sets its text
  (`ui.set_text`, cut at the pane's `length`), scales panes and plays animations.

## See also

- [Services: ui](services/ui.md), [Services: draw](services/draw.md)
- [LumaKit: screen](lumakit/screen.md), [LumaKit: hud](lumakit/hud.md), [LumaKit: ui-kit](lumakit/ui-kit.md)
- [Content overview](content/overview.md)
- [Tutorial: hide the HUD](tutorials/hide-the-hud.md)

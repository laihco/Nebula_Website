---
title: 'Service: draw'
nav_title: draw
description: Draw text over the game, tint or fade the game's actors, make textures from pixels, and render extra views of the world.
order: 4
level: intermediate
---

The `draw` service lets your mod add to the game's picture: text and pictures over the screen, a gold flash on an
enemy, a see-through ghost, a video on a screen inside a galaxy, a minimap or a second view for split-screen.

`draw` needs no permission. Drawing into the game's picture, and reading it, shows nothing outside the game.

> [!PLANNED]
> The full reference for `draw` (every parameter, default and limit) is still being written. The calls on this page
> are the ones the worked examples and LumaKit use; their names and parameters may still change before release. For
> HUD elements, pictures in corners and cameras, prefer [LumaKit's hud](lumakit/hud.md) and
> [camera](lumakit/camera.md) modules, which are built on `draw`.

## Example: words over the game

```lumascript source/main.lum
use svc.draw

on draw draw.Point.Overlay {             // a 2D drawing point of the frame
    draw.text("Practice mode", at: vec2(0.5, 0.05), align: draw.Align.Center)
}
```

## Drawing points: `on draw`

`on draw <point> { }` runs your code at one drawing point of each frame. Whether you draw in 2D or 3D depends on the
point:

| Point                | What it is for                                                                    |
| -------------------- | --------------------------------------------------------------------------------- |
| `draw.Point.Hud`     | 2D, with the game's HUD. LumaKit's `hud` draws its text here, in the game's font. |
| `draw.Point.Overlay` | 2D, over the game's picture.                                                      |

The game also has a loading point that is drawn on every presented frame, loading screens included; LumaKit's
`screen.loading` uses it.

An `on draw` handler may not `wait` (S0105): it draws this frame and returns. Keep state in module variables and
change it from `on frame`, tasks or hooks.

## What the examples use

| Call                                                                             | What it does                                                                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `draw.text(s, at: vec2, align: draw.Align, font: ..., size: f32, colour: color)` | Draws text at a drawing point. `font` may be your mod's own font (`font "Lyrics"`).                              |
| `draw.tint(actor, multiply: color, add: color)`                                  | Tints a game actor's look with a colour to multiply by and a colour to add.                                      |
| `draw.untint(actor)`                                                             | Takes the tint off again.                                                                                        |
| `draw.opacity(view, f32)`                                                        | Draws a model see-through: 1.0 solid, lower more transparent.                                                    |
| `draw.texture(width, height) -> draw.Texture`                                    | A texture made from pixels. `tex.update(pixels)` replaces the whole picture; a sub-rectangle update also exists. |
| `draw.swap_texture(actor, material: text, texture: draw.Texture)`                | Shows your texture in place of one material's texture on an actor's model.                                       |
| `draw.view(draw.View { camera, region, target })`                                | A second view of the world: a camera, where on screen it goes, or a texture it renders into.                     |
| `draw.set_main_region(draw.Region { x, y, w, h })`                               | Moves the game's own view into part of the screen.                                                               |

The types these use:

| Type              | What it is                                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `draw.Point`      | A drawing point (above)                                                                                                                                              |
| `draw.Align`      | How text lines up at its position, such as `draw.Align.Center`                                                                                                       |
| `draw.Texture`    | A texture your mod made. LumaKit's `hud.picture`, `hud.counter` and `screen.loading` take one.                                                                       |
| `draw.View`       | What `draw.view` makes: `camera`, `region`, `target`                                                                                                                 |
| `draw.Region`     | Part of the screen: `x`, `y`, `w`, `h` as fractions of it (`{ x: 0.5, y: 0.0, w: 0.5, h: 1.0 }` is the right half)                                                   |
| `draw.Target`     | Where a view draws, such as `draw.Target.Texture(width, height)`. A view given a `region` and no target draws in that part of the screen.                            |
| `draw.ViewCamera` | A camera rig. LumaKit's `camera` makes them (`camera.follow`, `camera.eye`, `camera.side`); `draw.ViewCamera.Above(of:, height:, ortho_width:)` looks straight down. |
| `draw.Eye`        | Where a camera is. LumaKit's `camera.now()` gives the main camera's.                                                                                                 |

## Examples

**A gold flash that fades** (from [the Gold Flower tutorial](tutorials/a-new-power-up.md)):

```lumascript
use svc.draw

option flash_frames: int

task flash(e: ref<LiveActor>) {
    for f in 0..flash_frames {
        let fade = 1.0 - f as f32 / flash_frames as f32
        if let a = e.get() { draw.tint(a, multiply: #FFFFFF, add: #FFD700 * fade) } else { stop }
        wait 1 frames
    }
    if let a = e.get() { draw.untint(a) }
}
```

The task keeps a `ref` to the enemy, not a view, because it waits across frames; `e.get()` is `none` once the enemy
is gone.

**A minimap rendered from above**, shown in a HUD corner:

```lumascript
use kit.hud
use svc.draw

let map_view = draw.view(draw.View {
    camera: draw.ViewCamera.Above(of: fn() -> vec3 { return MR::getPlayerPos() }, height: 6000.0, ortho_width: 8000.0)
    target: draw.Target.Texture(256, 256)
})
let panel = hud.picture(hud.Corner.BottomRight, map_view.texture(), size: vec2(200, 200))
```

**A video on a screen in a galaxy** (from [the video tutorial](tutorials/video-in-a-galaxy.md)):

```lumascript
use kit.actor
use svc.draw
use svc.assets

let screen_kind = actor.define(actor.Kind { name: "LumaScreen", look: model "Screen" })
let film = assets.movie(movie "Trailer")                 // the mod's WebM, decoded by the game's movie player
let tex = draw.texture(film.width(), film.height())

on frame {
    if film.next_frame() { tex.update(film.pixels()) }
    for s in screen_kind.all() {                         // refs to every screen in the stage
        if let a = s.get() { draw.swap_texture(a, material: "ScreenFace", texture: tex) }
    }
}
```

## Edge cases

- **Your mod switched off.** Like every service, `draw` closes what your mod made when it is taken out (see
  [A mod's life](services/overview.md#a-mod-s-life)). LumaKit's modules also remove their HUD elements and give the
  camera back.
- **Threads.** Call `draw` from the game thread: `on draw`, `on frame`, tasks and hooks all run there.
- **Held world.** While a mod holds the world clock, the held world is still drawn every frame (see
  [time](services/time.md#slow-motion-and-pause)).

> [!PLANNED]
> Also not built yet: a camera computed by your own function each frame, `draw.ViewCamera.Look(fn() -> draw.Eye)`.

## See also

- [LumaKit: hud](lumakit/hud.md)
- [LumaKit: camera](lumakit/camera.md)
- [ui](services/ui.md)
- [time](services/time.md)
- [Content: screens and fonts](content/screens.md)
- [Services overview](services/overview.md)

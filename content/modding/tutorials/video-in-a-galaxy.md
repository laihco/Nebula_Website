---
title: 'Tutorial: a video on a screen inside a galaxy'
nav_title: Video in a galaxy
description: Place a screen object in a stage and play your own video on it, frame by frame, as a texture on its model.
order: 4
level: intermediate
---

This tutorial puts a video inside the game world: a screen object you place in a stage, showing a movie of your mod's own on its face. It shows how a mod makes a texture from pixels, keeps it up to date every frame, and puts it on a model's material.

> [!PLANNED]
> Parts of this tutorial are not built yet, so the mod as written builds once they are:
>
> - playing a mod's own movie (`assets.movie`, Step 3) is not part of `assets` 1.0, which reads files only;
> - LumaKit's `actor` module is written but not yet in the LumaKit library you can install;
> - the `draw` calls used here (`draw.texture`, `draw.swap_texture`) may still change before release; see [Draw](services/draw.md).

## What you'll build

An object kind, `LumaScreen`, with a model of a screen. Every `LumaScreen` in the stage plays the movie `Trailer` on the part of its model whose material is called `ScreenFace`. All screens show the same picture at the same time.

## What you'll learn

- How a short `actor.define` makes a placeable object with nothing but a model.
- How a mod's movie is decoded a frame at a time with `assets.movie`.
- How `draw.texture` makes a texture you fill with pixels, and how `update` changes it.
- How `draw.swap_texture` shows your texture on one material of an object's model.
- How to go through every object of a kind with `all()`, and why it gives handles.

## Before you start

- Finish [A new NPC](tutorials/a-new-npc.md): it explains `needs`, `actor.define`, placing a kind in a stage and handles (`ref`).
- You need a screen model (glTF) with a material named `ScreenFace` on the face that should show the video, and a video file.

## The mod's folder

```text
cinema/
  luma.json
  source/
    main.lum
  layers/
    base/
      assets/
        Screen.glb          the screen model; its face uses the material "ScreenFace"
        Trailer.webm        the movie
```

The model is cooked into the game's model format on the player's device, with its materials. The movie is a WebM file that the game's movie player decodes. See [Models](content/models.md) and [Materials](content/materials.md).

## Step 1: luma.json

```json luma.json
{
  "format": "1.0",
  "id": "you.cinema",
  "version": "1.0.0",
  "name": "Cinema",
  "summary": "A screen in the galaxy that plays a video.",
  "authors": ["you"],
  "game": { "id": "RMG" },
  "needs": [{ "id": "lumakit", "version": "^1" }]
}
```

`needs` lists LumaKit because the mod uses `kit.actor`. The `draw` and `assets` services need no permission: drawing in the game and reading the game's and the mod's own files are always allowed.

## Step 2: the screen object

```lumascript source/main.lum
use kit.actor
use svc.draw
use svc.assets

let screen_kind = actor.define(actor.Kind { name: "LumaScreen", look: model "Screen" })
```

This is the shortest form of `actor.define`: a name to place it by and a model to show. Every other field of `actor.Kind` keeps its default. It has no sensors and no callbacks; it just stands where you place it. Place it in a stage with a patch row named `LumaScreen`, as in [A new NPC](tutorials/a-new-npc.md#step-5-place-the-keeper-in-a-stage).

`screen_kind` is the kind's `KindId`, which you'll use in Step 4 to find every screen.

## Step 3: the movie and the texture

```lumascript
let film = assets.movie(movie "Trailer")                 // the mod's WebM, decoded by the game's movie player
let tex = draw.texture(film.width(), film.height())      // a texture from pixels, updated each frame
```

- `movie "Trailer"` names your mod's movie. Like every content name, it's checked when you build.
- `assets.movie(...)` opens it for decoding by the game's own movie player. `film` hands you one picture at a time.
- `draw.texture(width, height)` makes an empty texture the size of the movie's pictures. You fill it from code.

Both are module-level `let`s, so they're made once, when the mod starts, and last as long as the mod is on.

## Step 4: play it, every frame

```lumascript
on frame {
    if film.next_frame() { tex.update(film.pixels()) }   // whole frame; a sub-rectangle update also exists
    for s in screen_kind.all() { if let a = s.get() { draw.swap_texture(a, material: "ScreenFace", texture: tex) } }
}
```

Each frame:

1. `film.next_frame()` moves the movie on and tells you whether there's a new picture. Only then does `tex.update(film.pixels())` copy the new picture's pixels into the texture. On frames without a new picture, the texture keeps the last one, so the video plays at its own rate whatever the game's frame rate.
2. `screen_kind.all()` gives every live object of the kind, as a list of handles (`ref<LiveActor>`). A handle may have emptied since the list was made, so `if let a = s.get()` takes the object only when it's still there.
3. `draw.swap_texture(a, material: "ScreenFace", texture: tex)` draws that object's `ScreenFace` material with your texture instead of its own. `material:` and `texture:` are named arguments.

Because every screen uses the same `tex`, updating it once updates all of them.

## Check, build, pack and try

```sh
lumalink check cinema
lumalink build cinema
lumalink pack cinema
```

See [Check, build, pack and run](start/workflow.md) for the options these commands take and the faster edit loop with `lumalink run`.

Install LumaKit and `cinema.luma`, switch both on, and go to the stage where you placed a `LumaScreen`.

If the screen shows its own material and not the video, check that the material in your glTF file is really called `ScreenFace`, and read the mod log.

## The complete file

```lumascript source/main.lum
use kit.actor
use svc.draw
use svc.assets

let screen_kind = actor.define(actor.Kind { name: "LumaScreen", look: model "Screen" })
let film = assets.movie(movie "Trailer")                 // the mod's WebM, decoded by the game's movie player
let tex = draw.texture(film.width(), film.height())      // a texture from pixels, updated each frame

on frame {
    if film.next_frame() { tex.update(film.pixels()) }   // whole frame; a sub-rectangle update also exists
    for s in screen_kind.all() { if let a = s.get() { draw.swap_texture(a, material: "ScreenFace", texture: tex) } }
}
```

## Ideas to extend it

- **Show it on the HUD too.** LumaKit's [hud](lumakit/hud.md) shows a texture in a corner of the screen: `hud.picture(hud.Corner.BottomRight, tex, size: vec2(200, 200))`. The [minimap recipe](tutorials/recipes.md) does the same with a picture rendered from above.
- **Let the screen be touched.** Give the kind a sensor and an `on_touch_player` callback, as [Balloon World](tutorials/balloon-world.md) does, to react when Mario bumps into it.

## See also

- [LumaKit: actor](lumakit/actor.md)
- [Draw service](services/draw.md) and [Assets service](services/assets.md)
- [Models](content/models.md) and [Materials](content/materials.md)
- [A new NPC](tutorials/a-new-npc.md)

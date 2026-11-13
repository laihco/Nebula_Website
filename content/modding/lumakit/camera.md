---
title: 'LumaKit: camera'
nav_title: camera
description: Take the main camera for a time, make camera rigs (follow, first person, side, free, stereo), mirror the screen, change the field of view and shake the view.
order: 10
level: intermediate
---

`kit.camera` takes over the main camera for as long as you need it and gives it back exactly as it was. It makes camera rigs: one that follows an actor, a first-person eye, a side view for 2D sections, a free camera moved with the sticks, and a pair of rigs for stereo views. A rig is a `draw.ViewCamera` from the [draw service](services/draw.md), so the same rig can drive the main camera or a picture-in-picture view. The module also mirrors the screen, changes the field of view and shakes the view.

## Example

From the [ghost time trial tutorial](tutorials/ghost-time-trial.md)'s replay viewer: a free camera while a replay plays, ended when the viewer closes.

```lumascript source/main.lum
use kit.camera

task viewer() {
    let cam = camera.free()                  // moved with the sticks
    wait 600 frames
    cam.end()                                // the game's camera is back as it was
}
```

A rig that follows the player from high above, drawn in the right half of the screen while the game's own view moves to the left half (the split-screen recipe's layout):

```lumascript
use kit.camera
use svc.draw

let view = draw.view(draw.View {
    camera: camera.follow(MarioAccess::getPlayerActor(), distance: 1200.0, height: 2000.0)
    region: draw.Region { x: 0.5, y: 0.0, w: 0.5, h: 1.0 }    // right half
})
draw.set_main_region(draw.Region { x: 0.0, y: 0.0, w: 0.5, h: 1.0 })
```

First person, taken and given back:

```lumascript
let fp = camera.take(camera.eye(MarioAccess::getPlayerActor()))
// ... later
fp.end()
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.camera
```

The module drives the main camera through a hook on the game's camera director, and uses the [draw service](services/draw.md) for views and the mirror, the [input service](services/input.md) for the free camera, and the game's own calls to hide and show the player for first person. It needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub struct Control { fn end(self); fn alive(self) -> bool }
pub fn take(rig: draw.ViewCamera) -> Control      // the main camera follows the rig until end()
pub fn free(speed: f32 = 40.0) -> Control         // a free camera moved with the sticks
pub fn follow(target: LiveActor, distance: f32, height: f32 = 300.0) -> draw.ViewCamera
pub fn eye(of: LiveActor, joint: text = "Head", near: f32 = 5.0) -> draw.ViewCamera   // first person
pub fn side(normal: vec3, distance: f32) -> draw.ViewCamera                          // 2D sections
pub fn stereo(rig: draw.ViewCamera, eye_distance: f32) -> (draw.ViewCamera, draw.ViewCamera)
pub fn mirror(on: bool)                            // the image and the stick's x flipped
pub fn fov(degrees: f32?)                          // none: the game's own
pub fn shake(strength: f32, frames: u32)
pub fn now() -> draw.Eye                           // where the main camera is
```

## Functions

### Taking the main camera

| Name          | Description                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `take(rig)`   | The main camera follows `rig` until you call `end()` on the returned `Control`.                                                      |
| `free(speed)` | A free camera the player moves with the sticks, at `speed` (default `40.0`), until `end()`. Good for photo modes and replay viewers. |

### Rigs

Each returns a `draw.ViewCamera`: give it to `take`, to a [`draw.view`](services/draw.md), or to an area's `camera`.

| Name                               | Description                                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `follow(target, distance, height)` | Follows `target` at `distance` from it and `height` (default `300.0`) above it.                                                  |
| `eye(of, joint, near)`             | Looks out from the joint `joint` (default `"Head"`) of `of`: first person. `near` (default `5.0`) is the near clipping distance. |
| `side(normal, distance)`           | Looks along `normal` from `distance` away: a side view for 2D sections.                                                          |
| `stereo(rig, eye_distance)`        | Two rigs, `eye_distance` apart, from one: a left and a right eye for stereo (VR) views.                                          |

For a view from above (a minimap), use the draw service's own `draw.ViewCamera.Above`.

### The view

| Name                      | Description                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `mirror(on)`              | Mirrors the image left to right, and flips the stick's x so controls still match.                                         |
| `fov(degrees)`            | Sets the main camera's field of view; `none` gives back the game's own.                                                   |
| `shake(strength, frames)` | Shakes the view with `strength` for `frames` frames.                                                                      |
| `now()`                   | Where the main camera is now, as a `draw.Eye` (its eye point, the point it looks at, its up direction and field of view). |

### Control

| Name      | Description                                              |
| --------- | -------------------------------------------------------- |
| `end()`   | Gives the main camera back. Safe to call more than once. |
| `alive()` | `true` while this control holds the camera.              |

## Behaviour and edge cases

- **Given back as it was.** After `end()`, the game's camera is back at its own state, as if you had never taken it.
- **Several mods.** When two mods take the main camera, the newer one holds it, and the older one holds it again when the newer one ends. An [area](lumakit/area.md)'s camera and a [cutscene](lumakit/cutscene.md) take the camera the same way.
- **First person.** While an `eye` rig of the player drives the main camera, the player's model is hidden, and shown again afterwards.
- **Your mod switched off.** Every camera it held is given back, the mirror is undone and the field of view is the game's again.

## See also

- [Draw service](services/draw.md): `ViewCamera`, `Eye`, views and regions
- [area](lumakit/area.md): a camera while the player is inside
- [cutscene](lumakit/cutscene.md)
- [player.character](lumakit/player-character.md): a second player to follow
- [Tutorial: ghost time trial](tutorials/ghost-time-trial.md)

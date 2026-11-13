---
title: 'LumaKit: area'
nav_title: area
description: New kinds of area, placed in stages like the game's own - slow zones, wind, a camera while the player is inside, and your code on enter, inside and leave.
order: 8
level: intermediate
---

`kit.area` adds new kinds of area: invisible shapes placed in a stage, like the game's own areas, that do something while the player is inside. An area kind can slow the player down, push them like wind, take the camera while they are inside, or call your code when they enter, each frame they stay, and when they leave.

## Example

From the lava swimming recipe: a new area kind, placed in stages like the game's water areas. The mod makes the game treat it as water, and the player burns slowly while swimming in it.

```lumascript source/main.lum
use kit.area

let lava = area.define(area.Kind { name: "LumaLavaSwimArea", shape_from_placement: true })

hook after MR::isInWater(at: vec3) -> inside {          // the game asks this to decide swimming
    if not inside and lava.contains(at) { result = true }
}

var burn = 0
on frame {
    if MR::isPlayerSwimming() and lava.contains(MR::getPlayerPos()) {
        burn += 1
        if burn % 120 == 0 { MarioAccess::getPlayerActor().decLife(1) }
    } else { burn = 0 }
}
```

A wind tunnel that also logs when the player enters and leaves:

```lumascript
use kit.area

let wind = area.define(area.Kind {
    name: "LumaWindArea"
    player_force: vec3(0, 0, 5)              // along the area's own axes
    on_enter: fn(p: MarioActor) { log "into the wind" }
    on_leave: fn(p: MarioActor) { log "out of the wind" }
})
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.area
```

Area kinds derive from the game's `AreaObj` and are managed by the game's own area manager, so they are placed in your stage files like the game's areas (see [Stages](content/stages.md)). An area's `camera` goes through [camera](lumakit/camera.md). The module needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub struct Kind {
    name: text
    shape_from_placement: bool = true         // the placement's own shape (box, cylinder, sphere)
    player_speed: f32 = 1.0                   // a zone that makes the player slow
    player_force: vec3? = none                // wind, along the area's own axes
    camera: draw.ViewCamera? = none           // the main camera while the player is inside
    on_enter: fn(MarioActor)? = none
    on_inside: fn(MarioActor)? = none          // each frame
    on_leave: fn(MarioActor)? = none
}
pub struct KindId { fn contains(self, at: vec3) -> bool; fn player_inside(self) -> bool }
pub fn define(k: Kind) -> KindId
pub fn find(name: text) -> KindId?
```

## Functions

| Name         | Description                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------- |
| `define(k)`  | Defines an area kind for your mod and returns its `KindId`. Stages then place it by `name`. |
| `find(name)` | The area kind your mod defined in `kit/area/<name>.json`, or `none`.                        |

### KindId

| Name              | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `contains(at)`    | `true` when the point `at` is inside any placed area of this kind. |
| `player_inside()` | `true` while the player is inside one.                             |

## Types

### Kind

| Field                  | Description                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `name`                 | The name stages place it by.                                                                                         |
| `shape_from_placement` | Uses the shape the placement gives it (box, cylinder or sphere), as the game's areas do. Default `true`.             |
| `player_speed`         | Multiplies the player's speed inside: below `1.0` for a slow zone. Default `1.0`.                                    |
| `player_force`         | A push on the player inside, along the area's own axes: wind. `none` for none.                                       |
| `camera`               | A camera rig (for example [`camera.side`](lumakit/camera.md)) that takes the main camera while the player is inside. |
| `on_enter`             | Called when the player enters.                                                                                       |
| `on_inside`            | Called each frame while the player is inside.                                                                        |
| `on_leave`             | Called when the player leaves.                                                                                       |

## Data files

An area kind can be written as `kit/area/<name>.json`, with every field except the callbacks. Declare the data format in `luma.json` with `"kit": { "lumakit.area": 1 }`, and look it up in code with `find`.

## Behaviour and edge cases

- **Order of callbacks.** For each visit, `on_enter` runs once, then `on_inside` each frame, then `on_leave` once, in that order.
- **Overlapping areas.** Areas may overlap, including areas of different kinds.
- **The camera.** An area's `camera` takes the main camera through [camera](lumakit/camera.md), so it follows the camera's rule for several mods: the newest request holds, and the earlier one returns when it ends. The camera is given back when the player leaves.
- **Your mod switched off.** Its area kinds stop acting and any camera they held is given back.

## See also

- [camera](lumakit/camera.md): rigs for an area's camera
- [gravity](lumakit/gravity.md)
- [Stages](content/stages.md): placing areas
- [Hooking the game's functions](lumascript/hooks.md)

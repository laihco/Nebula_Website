---
title: 'LumaKit: gravity'
nav_title: gravity
description: Override the player's gravity for a time, define new gravity shapes that stages place like the game's own, and read the gravity at any point.
order: 9
level: intermediate
---

`kit.gravity` changes which way is down. You can override the player's gravity (flip it, point it at a spot, push away from one) until you end the override or for a number of frames. You can define a new gravity shape, given by your own function, that stages place by name like the game's own gravity. And you can ask what the gravity is at any point.

## Example

From the gravity flip recipe: a button that flips the player's gravity, and flips it back. The button is a `key` option in `luma.json`, which the player can rebind in Controls:

```json luma.json
"options": [
  { "key": "flip", "kind": "key", "default": "two", "name": "Flip gravity" }
]
```

```lumascript source/main.lum
use kit.gravity
use svc.input

option flip: input.Action                    // the key option above
var flipped: gravity.Override? = none

on frame {
    if input.read(flip).pressed == 1 {
        if let f = flipped { f.end(); flipped = none }
        else {
            let down = MarioAccess::getPlayerActor().mGravity
            flipped = gravity.override_player(gravity.Field.Parallel { direction: down * -1.0 })
        }
    }
}
```

A short pull toward a point, ending by itself after five seconds:

```lumascript
gravity.override_player(gravity.Field.Point { at: vec3(0, 2000, 0) }, frames: 300)
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.gravity
```

New shapes derive from the game's `PlanetGravity` and are registered with the game's own gravity calls, so they mix with the game's gravities by priority. The override hooks the player's gravity. The module needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub enum Field { Parallel { direction: vec3 }, Point { at: vec3 }, Away { at: vec3 } }
pub struct Override { fn end(self); fn alive(self) -> bool }
pub fn override_player(f: Field, frames: u32? = none) -> Override
pub struct Shape { name: text, vector: fn(vec3) -> vec3?, range: f32 = 1000.0, priority: int = 0 }
pub struct ShapeId { fn name(self) -> text }
pub fn define_shape(s: Shape) -> ShapeId          // placed in stages by name
pub fn at(p: vec3) -> vec3
```

## Functions

| Name                         | Description                                                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `override_player(f, frames)` | Replaces the player's gravity with the field `f`. With `frames`, it ends by itself after that many frames; with `none` (the default) it lasts until you call `end()`. Returns an `Override` handle. |
| `define_shape(s)`            | Defines a new gravity shape that stages place by `name`. Returns its `ShapeId`.                                                                                                                     |
| `at(p)`                      | The gravity at the point `p`, as a vector.                                                                                                                                                          |

### Override

| Name      | Description                                                   |
| --------- | ------------------------------------------------------------- |
| `end()`   | Gives the player's gravity back. Safe to call more than once. |
| `alive()` | `true` while the override holds.                              |

### ShapeId

| Name     | Description       |
| -------- | ----------------- |
| `name()` | The shape's name. |

## Types

### Field

| Case                     | Gravity pulls                              |
| ------------------------ | ------------------------------------------ |
| `Parallel { direction }` | the same way everywhere, along `direction` |
| `Point { at }`           | toward the point `at`                      |
| `Away { at }`            | away from the point `at`                   |

### Shape

| Field      | Description                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| `name`     | The name stages place it by.                                                                         |
| `vector`   | Your function: given a point, it returns the gravity there, or `none` where the shape does not pull. |
| `range`    | How far from its placement the shape reaches. Default `1000.0`.                                      |
| `priority` | Its priority against other gravities at the same point, including the game's own. Default `0`.       |

## Behaviour and edge cases

- **Several mods.** When two mods override the player's gravity, the newer override holds, and the older one holds again when the newer one ends.
- **No player yet.** An override made when there is no player (on the title screen, while a stage loads, after a death) still holds, and acts on the next player. `end()` works either way.
- **Shapes and the game's gravity.** A placed shape sits beside the game's own gravities and wins or loses by `priority`.
- **Your mod switched off.** Its overrides end and the player's gravity is the game's again.

## See also

- [area](lumakit/area.md)
- [stage](lumakit/stage.md): `Builder.gravity` in a stage built in code
- [Stages](content/stages.md): placing gravity
- [Input service](services/input.md)
- [Recipes](tutorials/recipes.md)

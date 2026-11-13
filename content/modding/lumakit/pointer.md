---
title: 'LumaKit: pointer'
nav_title: pointer
description: The star pointer - where it points on screen and in the world, what B throws and what it costs, grabbing what it points at, and what aims it (infrared, gyro, mouse or stick).
order: 23
level: intermediate
---

`kit.pointer` works with the game's star pointer, the cursor that collects star bits and shoots them with B. It tells you where the pointer is on the screen and which point of the stage is under it. It changes what B throws (coins, fireballs, anything [projectile](lumakit/projectile.md) can make) and what each throw costs. It lets the player grab what the pointer is on with A. And it chooses what aims the pointer for a pad: infrared, the gyro, the mouse or a stick.

## Example

B throws coin shots that cost one coin each, built from the module's documented calls:

```lumascript source/main.lum
use kit.pointer
use kit.projectile

var coins: pointer.ThrowSet? = none

fn coin_mode(on: bool) {
    if on {
        coins = pointer.set_throw(pointer.Throw {
            shot: fn(from: vec3, toward: vec3) -> projectile.Shot {
                let dir = toward - from
                return projectile.Shot { look: model "CoinShot", from: from,
                                         velocity: dir * (30.0 / length(dir)), falls: true }
            }
            cost: pointer.Cost.Coins(1)
        })
    } else {
        coins?.end()                         // B throws star bits again
        coins = none
    }
}
```

Reading where the pointer is:

```lumascript
on frame {
    if let hit = pointer.world() { log "pointing at {hit.0}" }    // the map point; hit.1 is its normal
}
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.pointer
```

The module hooks the game's star bit shot (`StarPieceDirector`) and pointer controller, reads the pointer with the game's own calls, throws with [projectile](lumakit/projectile.md), and reads motion sensors through the [input service](services/input.md). It needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today). `source` takes an `input.Pad`, and the input service does not give pads to mods yet (only actions).

## Interface

```lumascript
pub fn screen() -> vec2?                          // none: off screen
pub fn world() -> (vec3, vec3)?                   // the map point and normal under the pointer
pub enum Cost { StarBits(u32), Coins(u32), Free }
pub struct Throw { shot: fn(vec3, vec3) -> projectile.Shot, cost: Cost = Cost.StarBits(1) }   // (from, toward)
pub struct ThrowSet { fn end(self) }
pub fn set_throw(t: Throw) -> ThrowSet            // what B throws; end(): star bits again
pub fn on_grab(f: fn(LiveActor) -> bool) -> ThrowSet   // A on a pointed actor
pub enum Source { Infrared, Gyro(sensitivity: f32), Mouse, Stick }
pub fn source(pad: input.Pad, s: Source)
```

## Functions

| Name             | Description                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `screen()`       | Where the pointer is on the screen (`MR::getStarPointerScreenPosition`), or `none` when it is off screen.                                       |
| `world()`        | The point of the stage under the pointer and the surface's normal there, or `none` when it points at nothing.                                   |
| `set_throw(t)`   | Changes what B throws and what it costs. Returns a `ThrowSet`; `end()` on it makes B throw star bits again.                                     |
| `on_grab(f)`     | Calls `f` with the actor the pointer is on when the player presses A. Return `true` if you grabbed it. `end()` on the returned handle stops it. |
| `source(pad, s)` | Chooses what aims the pointer for `pad`.                                                                                                        |

## Types

### Throw

| Field  | Description                                                                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `shot` | Your function, called for each throw with two vectors, `from` and `toward`. It returns the [`projectile.Shot`](lumakit/projectile.md) to throw. |
| `cost` | What each throw costs. Default: one star bit.                                                                                                   |

### Cost

| Case          | Each throw costs |
| ------------- | ---------------- |
| `StarBits(n)` | `n` star bits    |
| `Coins(n)`    | `n` coins        |
| `Free`        | nothing          |

### Source

| Case                | The pointer is aimed by                  |
| ------------------- | ---------------------------------------- |
| `Infrared`          | the Wii Remote's pointer, as in the game |
| `Gyro(sensitivity)` | the pad's gyro, at `sensitivity`         |
| `Mouse`             | the mouse                                |
| `Stick`             | a stick                                  |

## Behaviour and edge cases

- **Not enough to pay.** When the player cannot pay a throw's cost, nothing is thrown and the game's own out-of-ammo sound plays.
- **Coins in the observatory.** Coins exist only in a galaxy, so a `Cost.Coins` throw in the observatory (the hub) throws nothing, with the same sound.
- **Coins are spent quietly.** Paying with coins never heals the player, gives a 1-up, or counts toward coins collected.
- **Gyro on a pad without one.** Asking for `Gyro` on a pad with no motion sensors is refused with an error naming it.
- **Several throws.** `ThrowSet.end()` puts back star bits; it is safe to call more than once.
- **Your mod switched off.** B throws star bits again, grabbing is off, and each pad's aim is the game's again.

## See also

- [projectile](lumakit/projectile.md): the shots
- [shop](lumakit/shop.md): the same rules for spending coins
- [Input service](services/input.md)
- [Recipes](tutorials/recipes.md)

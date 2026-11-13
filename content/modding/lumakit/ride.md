---
title: 'LumaKit: ride'
nav_title: ride
description: Mounts and vehicles the player gets on and off - their model, seat, speed, jump and turning, driving along a planet's surface, and the moves the rider has while mounted.
order: 22
level: intermediate
---

`kit.ride` adds mounts and vehicles: a creature to ride, a kart, a board. A mount has a model with a seat joint where the player sits, the animation the player plays while riding, its speed, jump and turning, and whether it drives along a planet's surface under gravity. You can give the rider extra moves while mounted (a tongue, a flutter) from [player.state](lumakit/player-state.md). Mounts are placed in stages by name or spawned from code.

## Example

A board placed in stages as `LumaBoard`, built from the module's documented calls:

```lumascript source/main.lum
use kit.ride

let board = ride.define(ride.Mount {
    name: "LumaBoard"                        // placeable by name
    look: model "Board"
    seat_joint: "Seat"                       // where the player stands or sits
    speed: 25.0
    jump: 35.0
    surface: true                            // drives along a planet's surface
    on_mount: fn(m: LiveActor) { log "on board" }
    on_dismount: fn(m: LiveActor) { log "off board" }
})

fn board_here(at: vec3) { board.spawn(at: at) }

fn throw_off() {
    if ride.riding() != none { ride.dismount() }
}
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.ride
```

Mounts are game actors derived from `LiveActor`, built with [actor](lumakit/actor.md). While the player rides, the module hooks the player's control, uses [player.state](lumakit/player-state.md) for the rider's moves, model and animation content for the look and the rider's pose, and the [input service](services/input.md). It needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub struct Mount {
    name: text                                // placeable by name
    look: model
    seat_joint: text                          // where the player sits
    rider_action: text = "Ride"               // the player's clip while riding
    speed: f32 = 15.0
    jump: f32 = 30.0
    turn_degrees: f32 = 6.0
    surface: bool = true                      // drives along a planet's surface under gravity (karts, boards)
    moves: list<player.state.StateId> = []    // states the rider has while mounted
    on_mount: fn(LiveActor)? = none
    on_dismount: fn(LiveActor)? = none
}
pub struct MountId { fn spawn(self, at: vec3) -> LiveActor }
pub fn define(m: Mount) -> MountId
pub fn find(name: text) -> MountId?
pub fn riding() -> ref<LiveActor>?
pub fn dismount()
```

## Functions

| Name         | Description                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------- |
| `define(m)`  | Defines a mount for your mod and returns its `MountId`. Stages can then place it by `name`. |
| `find(name)` | The mount your mod defined in `kit/ride/<name>.json`, or `none`.                            |
| `riding()`   | The mount the player is on, or `none`.                                                      |
| `dismount()` | Takes the player off the mount they are riding.                                             |

### MountId

| Name        | Description                                          |
| ----------- | ---------------------------------------------------- |
| `spawn(at)` | Makes one of these mounts in the stage now, at `at`. |

## Types

### Mount

| Field                     | Description                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `name`                    | The name stages place it by.                                                           |
| `look`                    | Its model.                                                                             |
| `seat_joint`              | The joint of the model where the player sits.                                          |
| `rider_action`            | The animation the player plays while riding. Default `"Ride"`.                         |
| `speed`                   | Its speed. Default `15.0`.                                                             |
| `jump`                    | Its jump. Default `30.0`.                                                              |
| `turn_degrees`            | How far it turns each frame, in degrees. Default `6.0`.                                |
| `surface`                 | Drives along a planet's surface under gravity, as karts and boards do. Default `true`. |
| `moves`                   | Moves from [player.state](lumakit/player-state.md) the rider has while mounted.        |
| `on_mount`, `on_dismount` | Called with the mount when the player gets on and off.                                 |

## Data files

A mount can be written as `kit/ride/<name>.json`, with every field except the callbacks. Declare the data format in `luma.json` with `"kit": { "lumakit.ride": 1 }`, and look it up in code with `find`.

## Behaviour and edge cases

- **Damage** throws the rider off the mount.
- **Names.** Like actor kinds, mounts are known to the game as `<mod id>/<name>`.
- **Your mod switched off.** Its mounts are removed, and a player riding one is no longer mounted.

## See also

- [player.state](lumakit/player-state.md): moves while mounted
- [actor](lumakit/actor.md)
- [Models](content/models.md) and [Animation](content/animation.md)

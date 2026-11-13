---
title: 'LumaKit: player.state'
nav_title: player.state
description: New moves for the player - what starts them, their animation, their physics each frame, how they end and whether they attack - and the player's constants changed by name.
order: 3
level: intermediate
---

`kit.player.state` adds a new move to the player: a double jump, a glide, a dive, a ground-pound shock wave. You say what starts the move, which animation it plays, how the player moves each frame while in it, how it ends and whether it hurts what it touches. The module also changes the player's constants (run speed, jump height and the rest) by name, and puts them back exactly when you are done.

## Example

A double jump: pressing an action in the air, once per jump. The action is a `key` option in `luma.json`, which the player can rebind in Controls:

```json luma.json
"options": [
  { "key": "double_jump", "kind": "key", "default": "a", "name": "Double jump" }
]
```

```lumascript source/main.lum
use kit.player.state as move
use svc.input

option double_jump: input.Action             // the key option above

let second_jump = move.define(move.State {
    id: "double-jump"
    starts: move.Start.Action(double_jump)
    from: [move.From.Air]
    once_per_air: true                         // once until the player lands
    action: "DoubleJump"                       // the player's animation clip
    ends: [move.End.Ground]
    on_start: fn(p: MarioActor) {
        p.mVelocity = p.mGravity * -30.0       // straight up, against this place's gravity
    }
})
```

The player's constants, doubled while a mode is on and put back afterwards:

```lumascript
var tuned: move.Tuned? = none

fn set_fast(constant: text, on: bool) {
    if on {
        var values: map<text, f32> = {}
        values[constant] = 2.0                 // multiplies the game's own value
        tuned = move.tune(move.Tuning { values: values })
    } else {
        tuned?.end()                           // the constants are exactly as before
        tuned = none
    }
}
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module. `state` is a reserved word in LumaScript, so give the module another name:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.player.state as move
```

The module relies on hooks into the player's action and physics steps, the game's table of player constants (`MarioConst`), animation content and the input service. It needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub struct State {
    id: text
    starts: Start
    from: set<From> = [From.Air]
    once_per_air: bool = false                // double jump
    action: text                              // the player's animation
    motion: fn(MarioActor, var Motion)? = none   // each frame while in the state
    ends: list<End> = [End.Ground]
    attack: actor.Attack? = none              // hurts what it touches as this attack while it lasts
    effect_start: effect? = none
    sound_start: sound? = none
    on_start: fn(MarioActor)? = none
    on_end: fn(MarioActor)? = none
}
pub enum Start { Action(input.Action), Code }
pub enum From { Ground, Air, Water, Any }
pub enum End { Ground, Wall, Water, Frames(u32), ActionEnd, Released(input.Action), Code }
pub struct Motion { velocity: vec3, gravity_scale: f32 = 1.0, friction: f32 = 1.0, turn: f32 = 1.0 }
pub struct Tuning { values: map<text, f32> }    // the player's constants by name, multiplied
pub struct StateId { fn enter(self) -> bool; fn is_current(self) -> bool }
pub fn define(s: State) -> StateId
pub fn find(id: text) -> StateId?
pub fn current() -> StateId?
pub fn tune(t: Tuning) -> Tuned                  // end() puts the constants back
pub struct Tuned { fn end(self); fn alive(self) -> bool }
```

## Functions

| Name        | Description                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `define(s)` | Defines a move for your mod and returns its `StateId`.                                                                                  |
| `find(id)`  | The move your mod defined in `kit/player.state/<id>.json`, or `none`.                                                                   |
| `current()` | The mod-defined move the player is in now, or `none`.                                                                                   |
| `tune(t)`   | Multiplies the player's constants named in `t` and returns a `Tuned` handle. `end()` on the handle puts them back exactly as they were. |

### StateId

| Name           | Description                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `enter()`      | Puts the player into the move now (for a move with `Start.Code`). Returns `false` if it could not. |
| `is_current()` | `true` while the player is in this move.                                                           |

### Tuned

| Name      | Description                                           |
| --------- | ----------------------------------------------------- |
| `end()`   | Puts the constants back. Safe to call more than once. |
| `alive()` | `true` while the change holds.                        |

## Types

### State

| Field                         | Description                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                          | Unique within your mod.                                                                                                                      |
| `starts`                      | What starts the move: `Start.Action(a)` when the action `a` is pressed, or `Start.Code` when your code calls `enter()`.                      |
| `from`                        | Where the player may start it: `Ground`, `Air`, `Water` or `Any`. Default: in the air.                                                       |
| `once_per_air`                | Allows the move once until the player lands, as a double jump. Default `false`.                                                              |
| `action`                      | The animation the player plays: a clip added to your mod and bound to the player's skeleton by LumaLink.                                     |
| `motion`                      | Called each frame while in the move, with a `Motion` you change to steer the player.                                                         |
| `ends`                        | What ends the move; the first that happens ends it. Default: landing.                                                                        |
| `attack`                      | While the move lasts, it hurts what it touches as this [`actor.Attack`](lumakit/actor.md) (a ground pound's shock wave, a dive that stomps). |
| `effect_start`, `sound_start` | An effect and a sound started with the move.                                                                                                 |
| `on_start`, `on_end`          | Called when the move starts and ends.                                                                                                        |

### End

| Case          | The move ends when              |
| ------------- | ------------------------------- |
| `Ground`      | the player lands                |
| `Wall`        | the player hits a wall          |
| `Water`       | the player enters water         |
| `Frames(n)`   | `n` frames have passed          |
| `ActionEnd`   | the animation `action` finishes |
| `Released(a)` | the action `a` is released      |
| `Code`        | your code ends it               |

### Motion

| Field           | Description                                                             |
| --------------- | ----------------------------------------------------------------------- |
| `velocity`      | The player's velocity this frame, in game units per frame.              |
| `gravity_scale` | How strongly gravity pulls this frame (0.3 for a glide). Default `1.0`. |
| `friction`      | Friction this frame. Default `1.0`.                                     |
| `turn`          | How quickly the player turns this frame. Default `1.0`.                 |

### Tuning

`values` maps the names of the player's constants (from the game's `MarioConst` table) to a factor each is multiplied by. A factor of `2.0` doubles the game's value.

## Data files

A move can be written as `kit/player.state/<id>.json`, with every field of `State` except the callbacks. For simple moves, `motion` is given as fixed numbers instead of a function:

```json
"motion": { "velocity_up": 30, "gravity_scale": 0.3 }
```

Declare the data format in `luma.json` with `"kit": { "lumakit.player.state": 1 }`, and look the move up in code with `find`.

## Behaviour and edge cases

- **Several mods.** Moves of different mods on different actions work side by side.
- **Tuning is undone exactly.** `end()` restores the constants to the values they had, not to a guess.
- **Your mod switched off mid-move.** The move ends, and every constant your mod tuned is put back.
- **Callbacks** (`motion`, `on_start`, `on_end`) run on the game thread and only while your mod is on.

## See also

- [player.form](lumakit/player-form.md): a form's `physics` is a `Tuning`
- [ride](lumakit/ride.md): moves a rider has while mounted
- [actor](lumakit/actor.md): the `Attack` kinds
- [Animation](content/animation.md)
- [Input service](services/input.md)
- [Tutorial: moon jump](tutorials/moon-jump.md)

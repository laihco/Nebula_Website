---
title: 'LumaKit: player.form'
nav_title: player.form
description: Power-ups for the player - a look, aura, timer, music, size and physics, and what the spin or a button does while it lasts - plus the game's own forms given from code.
order: 2
level: intermediate
---

`kit.player.form` gives the player a power-up. A form is a look (a model bound to the player's skeleton), an optional aura and music, a time limit shown on the game's form meter, its own size and physics, and what the player's spin, jump or a button of your choice does while it lasts. The module also hands you the game's own forms (Bee, Boo, Fire, Ice and the rest) by name, so you can give one from code.

## Example

From the [Gold Flower tutorial](tutorials/a-new-power-up.md): the flower item gives a gold form, and each spin in that form throws a ball.

```lumascript source/main.lum
use kit.player.form
use kit.item
use kit.projectile

pub let gold = form.define(form.Form {
    id: "gold"
    look: model "GoldMario"                  // bound to Mario's skeleton
    aura: effect "GoldAura"                  // kept on the player while the form lasts
    ends_on_damage: true
    on_spin: throw_ball
})

let flower = item.define(item.Item {
    id: "GoldFlower"
    look: model "GoldFlower"
    gives: item.Gives.Form(gold)             // picking it up gives the form
})

fn throw_ball(player: MarioActor) {
    var front = vec3(0, 0, 0)
    MR::getPlayerFrontVec(var front)
    projectile.throw(projectile.Shot { look: model "GoldBall", from: player.mPosition + front * 80.0,
                                       velocity: front * 35.0, bounces: 3 })
}
```

A form with a time limit and its own button, from the ice breath recipe. The button is an action your mod declares as a `key` option in `luma.json`, so the player can rebind it in Controls:

```json luma.json
"options": [
  { "key": "breath", "kind": "key", "default": "b", "name": "Ice breath" }
]
```

```lumascript
use kit.player.form
use svc.input

option breath: input.Action                  // the key option above

let ice = form.define(form.Form {
    id: "ice-breath"
    look: model "IceMario"
    timer_frames: 1200                       // 20 seconds
    meter: true                              // time left on the game's form meter
    on_action: breath                        // B, or whatever the player binds
    on_act: blow
})

fn blow(player: MarioActor) {
    log "a puff of ice"
}
```

Giving one of the game's own forms from code:

```lumascript
form.game(form.GameForm.Bee).give()
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.player.form
```

You then write `form.define(...)`, `form.Form { ... }` and so on. The module relies on hooks into the game's own player-mode code, the content system for the look, aura and music, and the draw, audio, input and ui services; you need no permission for any of it.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub struct Form {
    id: text                                  // unique in your mod; "<mod id>/<id>" to the game
    look: model? = none                       // bound to the player's skeleton; none: the player's own
    look_luigi: model? = none                 // when the player is Luigi; none: look
    aura: effect? = none                      // kept on the player while the form lasts
    timer_frames: u32? = none                 // none: lasts until damage or end()
    ends_on_damage: bool = true
    music: sound? = none                      // over the stage's music while it lasts
    meter: bool = false                       // the time left shown as the game's form meter
    scale: f32 = 1.0                          // model, collision, sensors and camera distance together
    opacity: f32 = 1.0                        // see-through forms
    hurts_on_touch: bool = false              // touching an enemy attacks it
    physics: player.state.Tuning? = none      // the player's constants while it lasts
    base: GameForm = GameForm.Normal          // keep a game form's moves under this look
    item: item.ItemId? = none                 // the item that gives it (set by item.Gives.Form)
    on_spin: fn(MarioActor)? = none
    on_action: input.Action? = none           // with on_act: a bindable action, listed in the controls menu
    on_act: fn(MarioActor)? = none
    on_jump: fn(MarioActor)? = none
    on_start: fn(MarioActor)? = none
    on_end: fn(MarioActor, Ended)? = none
}
pub enum GameForm { Normal = 0, Invincible = 1, Fire = 2, Ice = 3, Bee = 4, Hopper = 5, Teresa = 6, Foo = 7,
                    Tornado = 9 }
pub enum Ended { Timer, Damage, Replaced, Ended, ModStopped }
pub struct FormId { fn give(self); fn is_current(self) -> bool; fn id(self) -> text }
pub fn define(f: Form) -> FormId
pub fn find(id: text) -> FormId?
pub fn game(f: GameForm) -> FormId
pub fn current() -> FormId?
pub fn frames_left() -> u32?
pub fn end()
```

## Functions

| Name            | Description                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `define(f)`     | Defines a form for your mod and returns its `FormId`. Define each form once, at the top level of a module or in `on start`. |
| `find(id)`      | The form your mod defined in `kit/player.form/<id>.json`, or `none` if your mod has no such file.                           |
| `game(f)`       | One of the game's own forms as a `FormId`, so you can give it like your own.                                                |
| `current()`     | The form the player has now, or `none`.                                                                                     |
| `frames_left()` | Frames left on the current form's timer, or `none` when it has no timer.                                                    |
| `end()`         | Ends the current form: the player is Normal again, and the form's `on_end` gets `Ended.Ended`.                              |

### FormId

| Name           | Description                            |
| -------------- | -------------------------------------- |
| `give()`       | Gives the form to the player now.      |
| `is_current()` | `true` while the player has this form. |
| `id()`         | The form's id.                         |

## Types

### Form

| Field            | Description                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | Unique within your mod. The game knows it as `<mod id>/<id>`, so it never clashes with another mod's.                                                     |
| `look`           | The player's model in this form, bound to the player's skeleton when you add it with LumaLink. `none` keeps the player's own model.                       |
| `look_luigi`     | The model used when the player is Luigi. `none` uses `look`.                                                                                              |
| `aura`           | An effect kept on the player while the form lasts.                                                                                                        |
| `timer_frames`   | How long the form lasts, in frames (60 a second). `none`: until damage or `end()`.                                                                        |
| `ends_on_damage` | Whether taking damage ends the form. Default `true`.                                                                                                      |
| `music`          | Music played over the stage's music while the form lasts, as the game's own forms do.                                                                     |
| `meter`          | Shows the time left on the game's own form meter. Default `false`.                                                                                        |
| `scale`          | The player's size: model, collision, sensors and camera distance change together (0.5 for a mini form, 2 for a mega one). Default `1.0`.                  |
| `opacity`        | Below `1.0` the player is drawn see-through.                                                                                                              |
| `hurts_on_touch` | Touching an enemy attacks it, as a mega form would. Default `false`.                                                                                      |
| `physics`        | The player's constants while the form lasts, as a [`player.state.Tuning`](lumakit/player-state.md).                                                       |
| `base`           | A game form whose moves the player keeps under your look: Bee's flight, Boo's float. Default `GameForm.Normal`.                                           |
| `item`           | The item that gives this form. Set for you when an item uses `item.Gives.Form`.                                                                           |
| `on_spin`        | Called at the player's spin.                                                                                                                              |
| `on_action`      | An action of your mod (a `key` option, read through the [input service](services/input.md)), which the player can bind in Controls. Use it with `on_act`. |
| `on_act`         | Called once each time `on_action` is pressed.                                                                                                             |
| `on_jump`        | Called when the player jumps.                                                                                                                             |
| `on_start`       | Called when the form begins.                                                                                                                              |
| `on_end`         | Called when the form ends, with the reason.                                                                                                               |

### GameForm

The game's own forms, with the game's own names and numbers:

| Case         | The form players know                                      |
| ------------ | ---------------------------------------------------------- |
| `Normal`     | No power-up                                                |
| `Invincible` | The rainbow star                                           |
| `Fire`       | The fire flower                                            |
| `Ice`        | The ice flower                                             |
| `Bee`        | The bee mushroom                                           |
| `Hopper`     | The spring mushroom                                        |
| `Teresa`     | The Boo mushroom                                           |
| `Foo`        | The red star's flying                                      |
| `Tornado`    | A form the game has models for but never gives (see below) |

### Ended

Why a form ended, passed to `on_end`:

| Case         | Meaning                                                 |
| ------------ | ------------------------------------------------------- |
| `Timer`      | Its `timer_frames` ran out.                             |
| `Damage`     | The player took damage and `ends_on_damage` was `true`. |
| `Replaced`   | Another form was given.                                 |
| `Ended`      | `end()` was called.                                     |
| `ModStopped` | The mod that gave the form stopped.                     |

## Data files

A form can be written without code as `kit/player.form/<id>.json`, with every field of `Form` except the callbacks (`on_spin`, `on_act`, `on_jump`, `on_start`, `on_end`). `physics` is given by the names of the player's constants, the same names `player.state.Tuning` uses. Declare the data format in `luma.json`:

```json
"kit": { "lumakit.player.form": 1 }
```

In code, `form.find("<id>")` gives you the data-defined form, for example to give it with `give()`.

## Behaviour and edge cases

- **One form at a time, many mods.** The player has one form. When two mods give forms, the newer one holds; when it ends, the older one returns. Two forms given in the same frame take effect in the mod list's order, so the higher mod's form holds.
- **Mario and Luigi.** The form uses `look_luigi` when the player is Luigi, else `look`.
- **Scale.** Model, collision, sensors and the camera's follow distance change together, so a mini or mega form moves and collides at its size.
- **Callbacks.** `on_spin` and `on_act` are called once per press, only while your mod is on.
- **Your mod switched off.** If your mod stops while the player has its form, the player goes back to Normal, and everything the form added (look, aura, music, meter) goes with it.
- **The Tornado form.** The game builds its model at every player start and has its checks, but no stage or item gives it. `form.game(form.GameForm.Tornado)` gives it like the others. A form whose model the player does not have (for example a costume mod's player without the Tornado model) is refused with a script error: `kit.player.form.give: form is Tornado; it must be a form the player's models have`.

> [!NOTE]
> Giving Tornado is written but not yet proven in a test run in the game.

## See also

- [item](lumakit/item.md): the item that gives a form
- [player.state](lumakit/player-state.md): new moves and `Tuning`
- [projectile](lumakit/projectile.md): what the form throws
- [Tutorial: a new power-up](tutorials/a-new-power-up.md)
- [Models](content/models.md)
- [Input service](services/input.md)

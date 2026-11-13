---
title: LumaKit overview
nav_title: Overview
description: What LumaKit is, how to add it to your mod, and the rules every one of its 22 modules keeps about ownership, data, permissions and versions.
order: 1
level: essential
---

LumaKit is a library of ready-made gameplay building blocks: power-ups, new moves, characters, items, thrown objects, new actors and areas, gravity, cameras, HUD elements, screens, pause-menu entries, cutscenes, dialogue, shops, galaxies, save progress, replays, network helpers, UI panels, mounts and the star pointer. Instead of hooking the game yourself for each of these, you describe what you want and call a module. This page shows how to add LumaKit to a mod and the rules that every module follows, so the module pages can stay short.

## Example

The Gold Flower power-up uses three modules. Picking up the flower turns Mario gold, and each spin throws a gold ball:

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
    id: "GoldFlower"                         // placeable in a stage by this name
    look: model "GoldFlower"
    gives: item.Gives.Form(gold)
})

fn throw_ball(player: MarioActor) {
    var front = vec3(0, 0, 0)
    MR::getPlayerFrontVec(var front)
    projectile.throw(projectile.Shot {
        look: model "GoldBall"
        from: player.mPosition + front * 80.0
        velocity: front * 35.0               // game units per frame
        bounces: 3
    })
}
```

And in `luma.json`:

```json
{
  "format": "1.0",
  "id": "gold-flower",
  "version": "1.0.0",
  "needs": [{ "id": "lumakit", "version": "^1" }]
}
```

The [Gold Flower tutorial](tutorials/a-new-power-up.md) builds the whole mod.

## Adding LumaKit to a mod

LumaKit is itself a mod, with the id `lumakit` (version 1.x). It is written in LumaScript, built by LumaLink for every platform like any other mod, and installed as a `.luma`. To use it:

1. List it in your mod's `needs` in `luma.json`:

   ```json
   "needs": [ { "id": "lumakit", "version": "^1" } ]
   ```

   `lumalink add need lumakit` writes this entry for you. If you forget it, the compiler stops at your `use` line and names the `needs` entry to add.

2. `use` each module you call, in each source file that calls it:

   ```lumascript
   use kit.hud
   use kit.player.form
   ```

   `kit.` is the short form of `lumakit.`. After `use`, you refer to the module by the last part of its name: `hud.timer(...)`, `form.define(...)`.

> [!TIP]
> `state` is a reserved word in LumaScript, so rename `kit.player.state` when you use it: `use kit.player.state as move`. Do the same for the two modules whose last part is `kit`: `use kit.net.kit as net_kit` and `use kit.ui.kit as ui_kit`. `use x as y` is ordinary LumaScript (see [Files, modules and use](lumascript/basics.md)).

### How LumaKit is loaded

- **Only when needed.** LumaKit loads only when an enabled mod needs it. Each module adds its hooks to the game when a mod first uses it and removes them when the last mod using it stops, so a mod that uses one module pays only for that module.
- **One copy.** However many mods need LumaKit, one copy is loaded. That is why the things the game has only one of (the player's form, the main camera, the pause menu, the HUD corners) have one owner that settles requests between mods (see [One owner, many mods](lumakit/overview.md#one-owner-many-mods)).
- **Needs order.** LumaKit is loaded and started before every mod that needs it, and stopped after them. This order comes from `needs` alone; the mod list's order does not change it. The mod list's order still decides hooks, files and who wins a clash. A cycle of needs (a needs b, b needs a) refuses every mod in it.
- **Direct calls.** A call into a LumaKit module is bound when your mod loads and is a direct native call afterwards: there is no lookup per call. The types a module declares (`form.Form`, `projectile.Hit`) are compiled into your mod from LumaKit's interface, so both sides agree on their layout. If the installed LumaKit was built from a different interface than the one your mod was compiled against, your mod is not loaded, and the log names the function and both versions.

## The modules

| Module                                            | What it gives you                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [`player.form`](lumakit/player-form.md)           | Power-ups: a look, aura, timer, music, physics and size for the player, and the game's own forms by name     |
| [`player.state`](lumakit/player-state.md)         | New moves (double jump, glide, dive) and the player's constants changed by name                              |
| [`player.character`](lumakit/player-character.md) | Playable characters, switching mid-level, a second player                                                    |
| [`item`](lumakit/item.md)                         | Things to pick up, placed in stages or spawned, in bubbles or crystals, carried in an inventory              |
| [`projectile`](lumakit/projectile.md)             | Things thrown or shot, with bounces, a trail, a burst and a hit callback                                     |
| [`actor`](lumakit/actor.md)                       | A new object kind in a few lines, and helpers for your own classes                                           |
| [`area`](lumakit/area.md)                         | New kinds of area: slow zones, wind, a camera, code on enter and leave                                       |
| [`gravity`](lumakit/gravity.md)                   | The player's gravity overridden, new gravity shapes, the gravity at a point                                  |
| [`camera`](lumakit/camera.md)                     | The main camera taken for a time, camera rigs, mirror, field of view, shake                                  |
| [`hud`](lumakit/hud.md)                           | Timers, counters, meters, text and pictures in corners; popups, subtitles, text in 3D; hiding the game's HUD |
| [`screen`](lumakit/screen.md)                     | Whole screens: a message, a choice, a list, a loading screen, your own layout                                |
| [`menu`](lumakit/menu.md)                         | Entries in the game's pause menu                                                                             |
| [`cutscene`](lumakit/cutscene.md)                 | Scripted scenes of shots and lines, waited on and skippable                                                  |
| [`talk`](lumakit/talk.md)                         | Lines and choices in the game's speech balloon, dialogue trees, voiced lines                                 |
| [`shop`](lumakit/shop.md)                         | Buying things with coins or star bits                                                                        |
| [`stage`](lumakit/stage.md)                       | New galaxies and domes, music per galaxy, warping, stars appearing, stages built in code                     |
| [`progress`](lumakit/progress.md)                 | Stars past 120, comets, what a star gives, per-file flags and numbers, new-file rules                        |
| [`replay`](lumakit/replay.md)                     | Recording and playing back poses, puppets, input playback, a seeded game, rewind                             |
| [`net.kit`](lumakit/net-kit.md)                   | Reliable ordered messages and rooms, a shared clock, a small web server for a phone page                     |
| [`ui.kit`](lumakit/ui-kit.md)                     | Widgets for your own panels: buttons, sliders, toggles, lists, text fields, a wheel                          |
| [`ride`](lumakit/ride.md)                         | Mounts and vehicles                                                                                          |
| [`pointer`](lumakit/pointer.md)                   | The star pointer: where it points, what B throws and what it costs, grabbing, how it is aimed                |

Types used by several modules live in the module that owns the idea and are named from there: `actor.Attack` (the player's attacks), `item.Gives` (what something gives the player), `form.FormId`, `hud.Corner`. Types from the services keep their service's name: `draw.Texture`, `draw.ViewCamera` and `draw.Eye` from [draw](services/draw.md), `input.Action` and `input.Pad` from [input](services/input.md). A module never redefines another's type.

## Rules every module keeps

These rules hold for all 22 modules. The module pages only add what is particular to each one.

### Everything belongs to the mod that made it

A form, an actor kind, a HUD element, a pause entry, a hook a module added for you: each is recorded under your mod. When your mod stops (it is switched off, removed, reloaded, or switched off by the guard), LumaKit undoes all of it, newest first, before your mod's code is unloaded.

So a mod switched off in the middle of a stage leaves nothing behind: no pause entry, no HUD element, no camera or gravity override. Actors of its kinds are removed with the game's own `kill`. A kind that a stage places but that no mod defines any more is simply not made: the stage loads without it, and the log names the kind, the stage and the mod.

Your mod's `on stop` code may still call LumaKit (to end its handles or save its progress). After that, LumaKit drops every function your mod gave it (`on_frame`, `on_touch_player`, `on_spin`, a timer's `follow`, every callback) and never calls them again.

### One owner, many mods

Where two mods ask for the one thing the game has only one of (the player's form, an override of the player's gravity, the main camera, the player's character, the game's random seed), **the newest request holds it**, and the earlier one holds it again when the newer one ends. Requests made in the same frame take effect in the mod list's order, the lowest mod's first, so the higher mod's request is the newest and holds.

Things that can sit side by side are ordered instead: HUD elements in one corner stack in the order they were made, and pause entries are listed in the mod list's order (top first), each mod's entries in the order made.

### Names are your mod's own

Two mods cannot clash over a name. Actor kinds, items, forms and the other things you name are known to the game as `<mod id>/<name>`, so two mods may each define an actor kind called `LumaBalloon`. A stage places the short name only from its own mod's layers; anything else uses the full name.

### Data or code

Most things a module defines can be written either in code, with `define`, or as data in your mod's `kit/<module>/` folder: one JSON file per thing, with every field except the callbacks. A mod of only content and data can therefore add a power-up, an item, a galaxy or a dialogue without a line of code. Both ways make the same thing, and code can look up a data-defined one by its id with `find`.

To use data files, declare the module and the version of its data format in `luma.json`:

```json
"kit": { "lumakit.player.form": 1 }
```

LumaKit reads each enabled mod's `kit/` files when it starts, and checks them against the module's schema before your mod loads. They are also checked when you check or pack the mod:

| Code | When                                                                                                                                |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- |
| L700 | A `kit/<module>/` folder without that module in `"kit"`, or the other way round                                                     |
| L701 | A data file that does not match its module's schema; the message names the file, the line and what was expected                     |
| L702 | A data version that the installed LumaKit does not know; the message names the module, the version wanted and the version installed |

The modules that take data files are `player.form`, `player.state`, `player.character`, `item`, `actor`, `area`, `cutscene`, `talk`, `shop`, `stage` and `ride`. Each module page has a "Data files" section.

### Handles

A value a module gives back for something that lasts (`hud.Timer`, `gravity.Override`, `camera.Control`) is a small handle you can copy and keep.

- `end()` or `remove()` on a handle may be called any number of times.
- Any other call on an ended handle is a script error naming it (S0913, for example `kit.hud.meter was ended, so it can no longer be used`).
- `alive()`, where a handle has it, tells you whether it still holds.
- Everything your handles hold ends with your mod.

### Callbacks and the game thread

Module functions are called on the game thread; a call from elsewhere is a script error. Each callback runs at a named moment, which the module pages give: an actor's `on_touch_player` from the actor's attack sensor, a form's `on_spin` at the player's spin. A callback you give a module is kept with your mod and called only while your mod is on.

A call that answers later (`screen.choose`, `talk.ask`, `cutscene.play`, `shop.open`) returns a `pending` result. Read it with `wait`, inside a task, a state or an event handler (see [Tasks, states and wait](lumascript/tasks.md)):

```lumascript
task ask_player() {
    let choice = wait screen.choose(text "Pick.Title", [text "Pick.Red", text "Pick.Blue"])
    guard let i = choice else { return }     // none: the player backed out
    log "picked {i}"
}
```

### Values across the boundary

Plain values (numbers, vectors, and structs and enums made of them) are passed by value. Text, bytes and containers that a module keeps are copied into LumaKit's own memory. A module never keeps a view of a game object (such as a `LiveActor`) past the call: where it must keep an actor, it takes a `ref<LiveActor>`, which is why `cutscene.Shot.Look` and `talk.say` take a `ref` (see [The game in scope](lumascript/game-objects.md)).

### Permissions are yours

A module function that uses a service needing a permission says so in its interface (`// needs: net`). Your mod must declare that permission, exactly as if it called the service itself; the compiler checks this. The module then makes the service call on your behalf, so the player sees the permission on your mod, and LumaKit itself declares none. See [Permissions](start/permissions.md).

### Errors are named

Nothing a module does fails silently.

- A call with an argument the module cannot take is a script error at your line (S0914), naming the module, the function, the parameter, the value and what it must be: `kit.hud.meter: max is 0; it must be >= 1`.
- Where a module cannot do what was asked and its interface returns an optional or a `bool`, you get `none` or `false` instead.
- Data in `kit/<module>/` is checked when the mod is checked or packed (L700 to L702 above).

See [Debugging](start/debugging.md) and [Error codes](reference/error-codes.md).

### Versions

LumaKit 1.x only adds within version 1: new functions, new struct fields with defaults, and new cases of enums marked open. A `match` over an open enum needs an `else =>` arm, so that your mod keeps building when a case is added. A module's data format has its own version number, the one you give in `"kit"` in `luma.json`.

## What works today

> [!PLANNED]
> LumaKit's interfaces on these pages are fixed, and the modules are being written against them, but today's compiler cannot yet pass everything between your mod and a library mod. Numbers, `bool`, vectors, the game's enums, views, a class's object, optionals of these, text going in, and LumaKit's own structs and enums cross today. Lists, maps, `bytes`, functions (callbacks), handles, `pending` results and methods on LumaKit's types do not cross yet: a LumaKit function that uses them is part of the interface but cannot be called from your mod until that support lands.
>
> The `Kind` / `define` / `find` forms that make a new actor kind wait for classes defined from a script. Until then, write a class derived from the game's (see [Classes](lumascript/classes.md)) and use the module's helper functions, such as `actor.add_body`, in it.
>
> The tutorials that use LumaKit build once the modules they use are merged into the library the compiler reads.
>
> A few modules also rest on service features that are not built yet; their pages say which: a second player's pad and pointer sources (`input.Pad`), replaying inputs, text fields, and `net.kit`'s WebSocket page server and internet peer-to-peer.

## See also

- [Your first mod](start/first-mod.md)
- [Anatomy of a mod](start/mod-anatomy.md) (the `kit/` folder)
- [luma.json reference](reference/luma-json.md) (`needs` and `kit`)
- [Services overview](services/overview.md)
- [Tasks, states and wait](lumascript/tasks.md)
- [The Gold Flower tutorial](tutorials/a-new-power-up.md)

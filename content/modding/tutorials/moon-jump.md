---
title: 'Tutorial: moon jump'
nav_title: Moon jump
description: Hold a button in the air and Mario keeps rising, whichever way gravity pulls. A whole mod in one short file.
order: 1
level: essential
---

This tutorial builds the smallest useful mod there is: while you hold a button in the air (A, until the player binds another), Mario floats upward, away from whatever gravity pulls on him in that spot. It's a good first step after [Your first mod](start/first-mod.md), because it shows how a mod gets a control of its own and changes the game's own objects every frame.

## What you'll build

A mod called **Moon jump** with one control of its own, also called Moon jump, which follows the A button until the player binds it to something else in the game's Controls page. Jump, keep holding it, and instead of falling back down Mario keeps going "up". On a small planet "up" is away from the planet's centre, so the mod works on every planet, not just flat ground.

## What you'll learn

- How `on frame` runs your code once every game frame.
- How to give your mod an _action_ the player can rebind, with a `key` option, and read it with the `input` service.
- How to call the game's own functions by name (`MarioAccess::getPlayerActor`, `MR::isOnGroundPlayer`).
- How to read and write a field of a game object (`mVelocity`, `mGravity`) through a _view_.
- Why the player may be missing, and how `if let` handles it.

## Before you start

- Finish [Your first mod](start/first-mod.md). It shows how to install the tools, write `luma.json`, and check, build and pack a mod. This tutorial doesn't repeat those steps in detail.
- You need the tools from [Install the tools](start/install.md).

## The mod's folder

```text
moon-jump/
  luma.json
  source/
    main.lum
```

That's all. The mod has no models, sounds or other content, so it has no `layers/` folder.

## Step 1: luma.json

You can make the folder and its `luma.json` with [`lumalink new`](lumalink/new.md):

```sh
lumalink new --id you.moon-jump --name "Moon jump" --summary "Hold A in the air to keep rising." --author you moon-jump
```

and then add the `options` list shown below, or write the whole `luma.json` yourself:

```json luma.json
{
  "format": "1.0",
  "id": "you.moon-jump",
  "version": "1.0.0",
  "name": "Moon jump",
  "summary": "Hold A in the air to keep rising.",
  "authors": ["you"],
  "game": { "id": "RMG" },
  "options": [{ "key": "moon_jump", "kind": "key", "default": "a", "name": "Moon jump" }]
}
```

**The action.** A mod never reads a particular button. It declares an _action_, an option of kind `key`, and reads that. `default` is the game control it follows (here `a`) until the player binds something else to it on the game's Controls page, where it's listed by its `name`. So a player with a different pad or keyboard layout can move it, and your code doesn't change. A `key` option isn't shown on the Mods page with other options; the player finds it in Controls.

The `input` service needs no permission (a mod reads only its own actions), so there's no `permissions` list. Leaving out `game.regions` means the mod runs on all three regions of the game. Every field is described in [luma.json](reference/luma-json.md).

## Step 2: run code every frame

Create `source/main.lum`. Start with the line that brings in the service, and an empty frame handler:

```lumascript source/main.lum
use svc.input

option moon_jump: input.Action        // the key option in luma.json

on frame {
}
```

- `use svc.input` gives your code the `input` service's functions, under the name `input`. Services are the game's ready-made interfaces for mods; see [Services overview](services/overview.md).
- `option moon_jump: input.Action` reads the `key` option by its key. A `key` option is an `input.Action`; the compiler checks the name against `luma.json` when you build.
- `on frame { }` runs once per game frame, at the start of the frame. A mod has at most one `on frame`. See [Lifecycle, options and frames](lumascript/events.md).

## Step 3: find the player

Inside `on frame`, get the player's object:

```lumascript
on frame {
    if let p = MarioAccess::getPlayerActor() {
        // p is the player, this frame
    }
}
```

`MarioAccess::getPlayerActor` is the game's own function. You call it by its own name, and the compiler checks the name and its arguments against the game's description when you build.

The game may have no player at that moment: on the title screen, while a stage loads, or just after Mario loses a life. So the function gives a `MarioActor?`, a value that may be `none`. You can't use it directly. `if let p = ...` runs the block only when there is a player, with `p` holding it. This is LumaScript's way of making you handle the missing case. See [The game in scope](lumascript/game-objects.md).

`p` is a _view_: a way to look at a game object that the game owns. A view is valid for the code that uses it right now. You can't keep it for a later frame; you'd keep a handle (`ref`) for that, as [the NPC tutorial](tutorials/a-new-npc.md) does.

## Step 4: push Mario up while the action is held in the air

Now the whole program:

```lumascript source/main.lum
use svc.input

option moon_jump: input.Action        // the key option in luma.json

on frame {
    if let p = MarioAccess::getPlayerActor() {
        if input.read(moon_jump).down == 1 and not MR::isOnGroundPlayer() {
            p.mVelocity = p.mGravity * -12.0          // straight up, against this place's gravity
        }
    }
}
```

What each part does:

| Part                              | What it does                                                                                                                                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input.read(moon_jump).down == 1` | `input.read` gives this frame's state of the action; its `down` is 1 while it's held. The state also has `pressed` and `released` (1 for the one frame it went down or up) and `frames` (how long it's been down). See [Input](services/input.md). |
| `MR::isOnGroundPlayer()`          | The game's own test: true while Mario stands on something. `not` turns it round, so the push only happens in the air.                                                                                                                              |
| `p.mGravity`                      | The player's gravity direction right now, a `vec3`. It points "down" wherever Mario is: towards a planet's centre, or along a gravity field.                                                                                                       |
| `p.mGravity * -12.0`              | The opposite direction, 12 game units long: "up" for this spot.                                                                                                                                                                                    |
| `p.mVelocity = ...`               | Writes the player's velocity field directly, replacing whatever the game had set.                                                                                                                                                                  |

Because the code sets the velocity every frame while the button is held, Mario rises at a steady speed. Let go (or land) and the game's own physics take over again.

> [!TIP]
> `-12.0` is the speed in game units per frame. Try `-6.0` for a slow float or `-20.0` for a rocket. For a sense of scale, 100 game units are one metre (a model's glTF metre becomes 100 units).

## Check, build, pack and try

From the folder above `moon-jump`:

```sh
lumalink check moon-jump
lumalink build moon-jump
lumalink pack moon-jump
```

- `check` reads the folder as the game will and lists every finding with its file and line. Fix any errors before you go on.
- `build` compiles `source/` to native code for each platform.
- `pack` writes `moon-jump.luma`.

Drop `moon-jump.luma` on the game's window (or copy it into the game's `mods` folder), switch it on in the Mods screen, and start a stage. Jump and keep holding A. To move the action to another button, find **Moon jump** on the game's Controls page.

> [!NOTE]
> Actions are declared once a session, when the first mod with code starts. If you switch the mod on while the game is already running, start the game again so its action is declared; until then the action reads as up.

If something is wrong, the mod log names the mod, the file and the line. [Debugging](start/debugging.md) explains how to read it, and [`lumalink explain`](lumalink/explain.md) explains any error code. [Check, build, pack and run](start/workflow.md) shows the faster edit loop with [`lumalink run`](lumalink/run.md).

## Ideas to extend it

- **Choose the speed on the Mods screen.** Declare a `number` option in `luma.json` and read it with `option speed: f32` in place of the fixed `12.0`. [Lifecycle, options and frames](lumascript/events.md) shows how options work, and [Hide the HUD](tutorials/hide-the-hud.md) uses one.
- **Rumble while it pushes.** The game's own `MR::tryRumblePadWeak` works from a mod; see the rumble recipe in [Recipes](tutorials/recipes.md).
- **Flip gravity instead of floating.** The gravity-flip recipe in [Recipes](tutorials/recipes.md) uses LumaKit's [gravity](lumakit/gravity.md) module.

## See also

- [Your first mod](start/first-mod.md)
- [Hide the HUD](tutorials/hide-the-hud.md), the next tutorial
- [Lifecycle, options and frames](lumascript/events.md)
- [The game in scope: names, views, handles](lumascript/game-objects.md)
- [Input service](services/input.md)

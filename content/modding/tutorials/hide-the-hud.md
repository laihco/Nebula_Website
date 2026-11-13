---
title: 'Tutorial: hide the HUD'
nav_title: Hide the HUD
description: Hide the game's counters with two hooks and an option the player can switch on the Mods screen.
order: 2
level: essential
---

This tutorial hides the game's on-screen counters, which is handy for screenshots, videos or a cleaner look. You'll learn the most important tool a mod has, the _hook_: code of yours that runs before one of the game's own functions and can stop it from running. You'll also give players an option to switch it on and off.

## What you'll build

A mod called **Hide the HUD** with one option, "Hide the HUD", on the game's Mods screen. While the option is on, the game's counters don't appear.

## What you'll learn

- How a `before` hook runs your code each time the game calls one of its functions.
- How `skip` stops the game's own function from running.
- How to declare an option in `luma.json` and read it in code with `option`.
- Why a change of the option applies from the next time the HUD appears.

## Before you start

Finish [Your first mod](start/first-mod.md) and [Moon jump](tutorials/moon-jump.md). This tutorial uses the same check, build and pack steps.

## The mod's folder

```text
hide-the-hud/
  luma.json
  source/
    main.lum
```

## Step 1: luma.json with an option

```json luma.json
{
  "format": "1.0",
  "id": "you.hide-the-hud",
  "version": "1.0.0",
  "name": "Hide the HUD",
  "summary": "Hides the game's counters.",
  "authors": ["you"],
  "game": { "id": "RMG" },
  "options": [
    {
      "key": "hide",
      "kind": "toggle",
      "default": true,
      "name": "Hide the HUD (from its next appearance)"
    }
  ]
}
```

The `options` list declares what the player can change on the Mods screen:

| Field     | Meaning                                                                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`     | The option's name in code. Your script reads it as `hide`.                                                                                                                        |
| `kind`    | `toggle` is an on/off switch, which your code reads as a `bool`. The other kinds are `number`, `choice`, `text` and `key`.                                                        |
| `default` | Its value until the player changes it. Every option needs one.                                                                                                                    |
| `name`    | What the Mods screen shows. Here it also tells the player when a change takes effect (see [Step 3](tutorials/hide-the-hud.md#step-3-why-a-change-waits-for-the-next-appearance)). |

A mod may declare up to 64 options. See [luma.json](reference/luma-json.md) for every field.

## Step 2: the hooks

```lumascript source/main.lum
option hide: bool
hook before CounterLayoutController::appear() { if hide { skip } }    // every counter the HUD brings in
hook before CoinCounter::appear() { if hide { skip } }
```

That's the whole program. Here's what each line does.

### Reading the option

`option hide: bool` declares that the mod reads the option `hide` from `luma.json`. The compiler checks that the option exists and that its kind matches the type: a `toggle` is a `bool`. From then on `hide` is just a name you read, and it always holds the player's current choice.

### Stopping the counters from appearing

`hook before CounterLayoutController::appear() { ... }` is a hook. A hook attaches your code to one of the game's functions, named as the game names it. `before` means your block runs each time the game calls that function, before the game's own code.

`CounterLayoutController::appear` is the function the game calls when the HUD brings its counters on screen. Inside a `before` hook you may write `skip`: the game's own function then doesn't run for this call. So when `hide` is true, the counters are never told to appear.

The function returns nothing, so a plain `skip` is enough. For a function that returns a value, `skip` must give one (`skip false`, for example); the compiler insists, so a skipped call always has a result. See [Hooking the game's functions](lumascript/hooks.md) for `before`, `after`, `wrap` and `replace`.

### The coin counter

The coin counter appears through its own function, so it gets its own hook with the same rule.

> [!NOTE]
> If two mods hook the same function, both hooks run. The mod higher in the player's mod list runs its `before` first. Neither mod needs to know about the other.

## Step 3: why a change waits for the next appearance

The hooks stop counters from _appearing_. A counter that's already on screen when the player switches the option on stays there until it goes away by itself; from its next appearance, it's hidden. The game has no "hide every counter now" function to call, so the mod can't do more than that with these hooks.

That's why the option's `name` says "(from its next appearance)": it's good practice to tell the player in the option text how it behaves.

> [!TIP]
> To react the moment an option changes, a mod can write `on option hide { ... }`. This mod has nothing useful to do there, but [the LiveSplit tutorial](tutorials/livesplit-link.md) uses one to reconnect when the port changes.

## Check, build, pack and try

```sh
lumalink check hide-the-hud
lumalink build hide-the-hud
lumalink pack hide-the-hud
```

See [Check, build, pack and run](start/workflow.md) for the options these commands take and the faster edit loop with `lumalink run`.

Drop `hide-the-hud.luma` on the game's window, switch it on in the Mods screen and start a stage: the counters stay away. Switch the option off, and they come back the next time the HUD brings them in.

If `check` reports that a function doesn't exist, check its spelling and its class. The compiler only accepts names the game's description lists. The mod log and [Debugging](start/debugging.md) help with anything that goes wrong in the game.

## Ideas to extend it

- **Hide only some parts.** LumaKit's [hud](lumakit/hud.md) module has `hud.hide_game(part, hidden)` with the parts `Lives`, `Coins`, `StarBits`, `Stars`, `Health` and `All`. A mod that uses it needs LumaKit (see [the NPC tutorial](tutorials/a-new-npc.md) for how a mod lists it in `needs`).
- **Show your own counter instead.** The same module puts timers, counters and text in a corner of the screen; [the ghost time trial](tutorials/ghost-time-trial.md) uses a timer.

## See also

- [Hooking the game's functions](lumascript/hooks.md)
- [Lifecycle, options and frames](lumascript/events.md)
- [luma.json reference](reference/luma-json.md)
- [LumaKit: hud](lumakit/hud.md)
- [Moon jump](tutorials/moon-jump.md), the previous tutorial

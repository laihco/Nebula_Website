---
title: "Service: input"
nav_title: input
description: Give your mod its own controls: actions the player can rebind in Controls, read once a frame with presses that are never lost.
order: 2
level: essential
---

The `input` service gives your mod its own **actions**: named controls such as "Moon jump" or "Flip gravity" that
the player sees and rebinds in the game's Controls page, next to the game's own. Your code reads an action, never a
particular button, so your mod works with any pad, keyboard or binding the player prefers.

`input` needs no permission: a mod reads only its own actions.

## Example: moon jump on a button

Declare the action as a `key` option in `luma.json`. Its `default` is the game control it follows until the player
binds something else:

```json luma.json
"options": [
  { "key": "moon_jump", "kind": "key", "default": "a", "name": "Moon jump" }
]
```

Then read it in your code:

```lumascript source/main.lum
use svc.input

option moon_jump: input.Action        // the key option above

on frame {
    if let p = MarioAccess::getPlayerActor() {      // there may be no player: test it
        if input.read(moon_jump).down == 1 and not MR::isOnGroundPlayer() {
            p.mVelocity = p.mGravity * -12.0        // straight up, against this place's gravity
        }
    }
}
```

Out of the box, holding A in the air pulls Mario upward. If the player binds Moon jump to another button in
Controls, your code does not change.

## Operations

| Name                                      | What it does                                                                                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `option <key>: input.Action`              | Gives you the action of the `key` option `<key>` by name, checked when you build. This is the usual way.                                                              |
| `input.action(id: text) -> input.Action?` | The action of the key option `id`, found while running. `none` when your mod has no such key option (an answer, not a mistake). The same action is given all session. |
| `input.read(action: input.Action)`        | This frame's state of the action (below).                                                                                                                             |

The state `input.read` gives has these fields:

| Field      | Meaning                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `down`     | 1 while the action is held (in the newest sample), else 0                                                                                               |
| `pressed`  | 1 for one frame when the action went down                                                                                                               |
| `released` | 1 for one frame when the action went up                                                                                                                 |
| `frames`   | How many samples it has been down (0 while up)                                                                                                          |
| `value`    | How far it is pressed, 0 to 1: a trigger or stick bound to it gives the in-between values; a key or button gives 0 or 1. The action is `down` from 0.5. |
| `bound`    | 1 when a control scheme in use had the player's own binding for it, 0 when it is following its default game control                                     |

```lumascript
use svc.input

option flip: input.Action

on frame {
    let s = input.read(flip)
    if s.pressed == 1 { log "flip!" }
    if s.down == 1 and s.frames == 60 { log "held for 60 frames" }
}
```

## Declaring actions

Each action is one option of `kind` `key` in `luma.json`:

| Field     | Meaning                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------- |
| `key`     | The action's id: 1 to 64 characters of `a-z`, `0-9`, `.`, `_` and `-`. Your code names it by this. |
| `kind`    | `"key"`                                                                                            |
| `name`    | What the Controls page shows (translations go in `luma.json`'s `text`, as for every option name)   |
| `default` | The game control it follows until the player binds it (required)                                   |

`default` is one of the game's controls, written without regard to case:

```text
a  b  one  two  plus  minus  home
dpad_up  dpad_down  dpad_left  dpad_right
stick_up  stick_down  stick_left  stick_right
c  z  shake  nunchuk_shake
pointer_up  pointer_down  pointer_left  pointer_right  pointer_recenter
jump_back
```

Anything else is refused when you check the mod (L210 `Option.KeyDefaultUnknown`).

A key option is not shown on the Mods page with your other options: the player finds it in Controls. It cannot
choose a layer (`when.option` naming it is L301).

Limits: at most 64 actions a mod and 1024 across all mods. An action past those limits, a second option with the
same key, or a bad id is left out, with one line in the log: `input: <mod>'s action <id> is left out (<why>)`.

## What the player sees: the Controls page

The Controls page lists every declared action after the game's own bindings, one row each in your declared order,
on every control scheme the page edits except the phone's and the Wii Remote modes.

- The row's label is the action's `name`.
- Its value is what the player bound on that scheme, or **Same as {control}** (the default control's label, in the
  player's language) while it follows its default.
- Enter or A waits for an input, as the game's own rows do. An input the default control could not take is refused
  ("THAT INPUT CANNOT DRIVE THIS ROW").
- Backspace or X clears the row back to following its default. RESET clears every action on that scheme.
- Changes are applied with the page (Space or Y) and saved with the game's settings.

A player's bindings for your mod are kept in the game's settings while your mod is off, and even after it is
removed, so they are still there when it comes back.

## How an action is read

- **Once a frame.** The controls are sampled once a game frame. The first `read` after a new sample takes it for
  every action, so all reads in one frame agree.
- **No lost presses.** `pressed` and `released` are 1 for one frame when the action went down or up in any sample
  since the last frame any mod read it. A press shorter than a frame is never lost, and both can be 1 in the same
  frame.
- **Read every frame you care about.** If your mod skips reading in a frame, it misses that frame's `pressed` and
  `released`, just as the game would reading its own pad.
- **Bindings follow the player's schemes.** The keyboard (when the game reads it) and each connected pad add their
  own bindings of the action. When no scheme in use has a binding, the action follows its default game control
  exactly as the game gets it: the player's bindings, extension buttons and shake included.

## Edge cases

- **Settings and HOME menu.** While the Settings menu or the HOME Menu is open, every action reads up, and nothing
  pressed there reaches your mod after it closes.
- **Declared once a session.** Actions are declared once, when the first mod with code starts: the actions of the
  mods that are on at the start of the session, in the Mods list's order. They never change during the session, so
  a mod switched on later in the session has no actions declared until the game is started again with it on.
- **Mods without code** declare nothing; with no code mod at all, nothing is declared and nothing is sampled.
- **No controls.** On a host that reads no controls (a headless run), every action stays up.
- **Only your own actions.** Reading a handle that is not one of your mod's actions is a mistake: `Service.Handle`
  in the mod log, and the read does nothing.
- **Threads.** Both functions run on the game thread only.
- **Slow motion.** When a mod slows the world below real time, presses on frames with no world step are carried to
  the next step, so the game's own controls lose no tap either (see [time](services/time.md#slow-motion-and-pause)).
- **Cost.** With no action declared, the game does one check a frame for this service.

> [!PLANNED]
> Not built yet:
>
> - showing the name of the key or button an action is bound to, for your own prompts;
> - reading a pad's buttons directly without declaring an action, and a second player's pad;
> - text entry with the platform's keyboard;
> - pressing buttons and moving the controls as if the player did (permission `input.inject`);
> - Bluetooth, USB and MIDI devices (permission `input.devices`);
> - menu focus and menu entries for the `ui` service that build on actions.

## From C

The header is `luma_input.h`; import it with `LUMA_SERVICE(slot, "input", "1.0")`. Both calls are game thread only
and use only the shared statuses (see [Services overview](services/overview.md#from-c)).

| Function                 | Behaviour                                                                                                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action(mod, id, out)`   | The mod's action `id` in `*out`: never 0, the same all session. No such key option: `LUMA_E_NOT_FOUND`, `*out` 0, not reported. A null `id` or `out`: `LUMA_E_ARGUMENT`, reported.                                                                                                          |
| `read(mod, action, out)` | Fills `*out` with this frame's state. A handle that is not one of this mod's actions (0, another mod's, past the list): `LUMA_E_HANDLE`, reported. A null `out`, or `out->size` below 24: `LUMA_E_ARGUMENT`, reported. `out->size` is kept; the rest of version 1.0's 24 bytes are written. |

## See also

- [time](services/time.md)
- [ui](services/ui.md)
- [Services overview](services/overview.md)
- [Lifecycle, options and frames](lumascript/events.md)
- [luma.json](reference/luma-json.md)
- [Tutorial: moon jump](tutorials/moon-jump.md)
- [LumaKit overview](lumakit/overview.md)

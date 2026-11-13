---
title: Lifecycle, options and frames
nav_title: Events and options
description: The on handlers that run your code at the mod's start and stop, every frame, when an option changes, when a stage loads, and when a service has news - plus options and content names.
order: 6
level: essential
---

Hooks run when the game calls a function. Everything else a mod does starts in an `on` handler: when the mod starts
and stops, once a frame, when the player changes an option, when a stage is ready, or when a service has an event.
This page lists every handler, how a mod reads its options, and how it names its own content.

## Example

```lumascript source/main.lum
use svc.draw

option speed: f32                               // declared in luma.json "options"
option colour: text

on start { log "ready, speed {speed}" }         // after every game name is found
on stop { }                                     // before a reload, or when the mod is turned off
on frame { }                                    // once per game frame, at the frame's start
on option speed { log "speed is now {speed}" }  // the player changed it on the Mods screen
on load { Mario::kReactionDecay = 0.9 }         // game data in code, before the stage that uses it loads
on stage "EggStarGalaxy" { }                    // a stage became ready
on draw draw.Point.Overlay { }                  // a drawing point of the frame
on layers -> list<text> { return [] }           // which code-chosen layers are on
```

## The handlers

| Handler                     | Runs                                                              | May `wait` |
| --------------------------- | ----------------------------------------------------------------- | ---------- |
| `on start`                  | once, when the mod starts, after every game name it uses is found | yes        |
| `on stop`                   | before a reload, or when the mod is turned off                    | no         |
| `on frame`                  | once per game frame, at the frame's start, before the mod's tasks | no         |
| `on step`                   | once per world step, before the scene's update                    | no         |
| `on option <key>`           | when the player changes that option                               | yes        |
| `on load`                   | before the stage that uses the game data it changes loads         | no         |
| `on stage "<name>"`         | when that stage is ready                                          | yes        |
| `on draw <point>`           | at a drawing point of the frame (2D or 3D by point)               | no         |
| `on layers -> list<text>`   | before content loads, to choose code-chosen layers                | no         |
| `on <service>.<event>(...)` | when a service delivers that event, at a frame's start            | yes        |

A handler that may wait and does is made into a task by the compiler (see [Tasks](lumascript/tasks.md)).

`on start`, `on stop`, `on frame`, `on step`, `on load` and `on layers` may each appear **once** in a mod, across all
its modules. A second is error S0109, which names where the first is.

## on start

`on start` runs once when the mod starts: after the game has bound every name the mod uses, and after the module-level
`let` and `var` values have been made, in module order.

```lumascript
var bests: map<text, int> = {}

on start {
    log "hello"
    wait 1 seconds                              // allowed: on start may wait
    log "a second later"
}
```

A script error in `on start` (before it first waits) means the mod does not start: it stays off, and the mod log names
the line. See [Errors](lumascript/errors.md).

## on stop

`on stop` runs before the mod's code is reloaded and when the player turns the mod off. It cannot wait. Use it to hand
values to the next load with `keep` (below).

## on frame and on step

```lumascript
var frames = 0
on frame { frames += 1 }
```

- `on frame` runs once per game frame, at the frame's start, before the mod's tasks. It runs even while the world is
  held (paused).
- `on step` and `on step(now: time.Now)` run once per world step, before the scene's update: 0 times in a held frame
  and up to 16 times in a fast one. `now`'s `step` and `step_in_frame` are this step's. It comes from the
  [time service](services/time.md).

Neither may `wait`, but either may `start` a task.

## Options

An option is a setting the player changes on the Mods screen. You declare it once in `luma.json`'s `options` and read
it in code by its key:

```json luma.json
{
  "options": [
    {
      "key": "balls_at_once",
      "kind": "number",
      "default": 2,
      "min": 1,
      "max": 4,
      "name": "Balls at once"
    },
    {
      "key": "look",
      "kind": "choice",
      "default": "shiny",
      "values": ["shiny", "matte"],
      "name": "Look"
    }
  ]
}
```

```lumascript
option balls_at_once: int
option look: text

fn can_throw(count: int) -> bool { return count < balls_at_once }

on start {
    match look {
        "shiny" => log "shiny"
        "matte" => log "matte"
        else => log "?"
    }
}
```

`option <key>: <type>` declares it; the compiler checks the key against `luma.json` and the type against its `kind`:

| `kind`   | Type                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------ |
| `toggle` | `bool`                                                                                           |
| `number` | `int` when `default` and whichever of `min`, `max`, `step` are present are all whole; else `f32` |
| `text`   | `text`                                                                                           |
| `choice` | `text` (one of its `values`; a `match` on it may list them)                                      |
| `key`    | `input.Action` (an action the player binds; see [Input](services/input.md))                      |

Declaring `int` for a number with a fraction is an error naming it. An option is read by its key as a name
(`balls_at_once`); there is no `option("key")` call. Options cannot be written by code (S0064).

`on option <key> { }` runs when the player changes that option. The full list of option fields is in
[luma.json](reference/luma-json.md).

## on load: game data in code

Some of the game's constants live in its code, such as `Mario::kReactionDecay`. You can read them anywhere by name.
You change them only in `on load`, which runs before the stage that uses them loads:

```lumascript
on load { Mario::kReactionDecay = 0.9 }
```

## on stage

```lumascript
on stage "EggStarGalaxy" {
    wait 2 seconds
    log "welcome"
}
```

Runs when the named stage becomes ready. It may wait.

## on draw

```lumascript
use svc.draw

on draw draw.Point.Overlay {
    // 2D drawing over the frame
}
```

Runs at a drawing point of the frame. The point (any dotted name, such as `d.Point.Hud` after `use svc.draw as d`)
says whether it is 2D or 3D. See [Drawing](services/draw.md).

## on layers

Layers in `luma.json` with `"when": { "code": true }` are chosen by your code. `on layers` returns the names of those
that are on. It runs before content loads, so it cannot wait.

```lumascript
on layers -> list<text> {
    if christmas_today() { return ["xmas"] }    // a function of your own
    return []
}
```

## Service events

A service result that waits on the outside world (a network message, a finished download) is an **event**. Handle it
mod-wide with `on <service>.<event>`:

```lumascript
use svc.net.local

var link: net.local.Stream? = none

on net.local.closed(s, why) {
    if same(s, link) { link = none; log "link closed: {why}" }
}
```

Events arrive at a frame's start. The event names and their parameters are on each [service's page](services/overview.md).
`on <word>.<...>` is always an event path, whatever the word (`on stage.entered` is an event of `stage`).

- Some events go only to the function you gave the request that caused them (a timer's to its closure, for example).
  Writing `on` for one of those is error S0107, which names the call.
- Some service functions are set by an `on` handler rather than called (`time.on_frame` is `on frame`). Calling or
  naming one is error S0108.
- Using a service whose permission `luma.json` does not declare is an error at check time. See
  [Permissions](start/permissions.md).

## Content by name

Your mod names its own content (in `layers/`, or by its key) with a content word and a plain string:

```lumascript
model "GoldBall"
effect "Burst"
sound "Throw"
layout "Timer"
text "Timer.Title"
font "Lyrics"
movie "Trailer"
data "lyrics.json"                              // a data file of the mod: its bytes
nerve "DinoPackunVs1.BattleLv2"                 // a step of a game class (see The game in scope)
```

Each name is checked when building against the mod's own files; a name that is not there is a build error naming
it. The string must be plain: `model "{name}"` is an error, because content is named when building.

```lumascript
struct Line { at: f32, words: text }
let lines = json.decode<list<Line>>(data "lyrics.json")!
```

### Names made while running

When the name is only known at run time, use the lookup functions `sound_named(name)`, `model_named(name)`, and the
same for the other kinds. Each gives `none` when the mod has no such content. These are the only content names the
build cannot check, so each use is listed in the build's report.

```lumascript
hook after TalkMessageCtrl::startTalk() -> started {
    if not started { return }
    let id = self.getMessageID()
    if let voice = sound_named("voice/{id}") {  // optional: one sound per message
        log "a voice line for {id}"
    }
}
```

What happens when content is missing in play (placeholders) is on [References](lumascript/references.md).

### Text with placeholders

`text "Key"` is your mod's text row in the player's language. Fill its `{name}` placeholders with named arguments
right after it:

```lumascript
let outside = "203.0.113.5:4000"
let line = text "Coop.Hosting"(address: outside)    // the row reads, say, "Hosting at {address}"
```

Every placeholder of the row, in every language, must be given, and no other: checked when building, as content
names are.

## Keeping values across a reload

When your mod's code is reloaded while the game runs, module state starts fresh. To carry a value over, `keep` it in
`on stop` and read it back with `kept<T>()` in `on start`:

```lumascript
struct Saved { picked: int, bests: map<text, int> }
var picked = 0
var bests: map<text, int> = {}

on stop {
    keep(Saved { picked, bests })               // true when kept
}

on start {
    if let s = kept<Saved>() {                   // none on a fresh start
        picked = s.picked
        bests = s.bests
    }
}
```

- `keep(value) -> bool` is allowed only in `on stop`'s own body. The value must be JSON data. It gives false when the
  encoded value is over 1 MiB (also written to the mod log). The last call wins.
- `kept<T>() -> T?` is allowed only in `on start`'s own body, before any `wait` on its path. It gives what the
  previous load of the mod's code kept this session, or `none` when nothing was kept or the bytes are not a `T`
  (for example, after you changed the struct; this is also logged).
- Anywhere else is error S0132. See [Reloading](reference/reload.md).

## See also

- [Tasks, states and wait](lumascript/tasks.md)
- [Hooks](lumascript/hooks.md)
- [References to content](lumascript/references.md)
- [luma.json](reference/luma-json.md)
- [Services overview](services/overview.md)
- [Content overview](content/overview.md)

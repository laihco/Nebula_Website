---
title: 'LumaKit: cutscene'
nav_title: cutscene
description: Scripted scenes of camera shots, spoken lines, animations, waits and your own calls - letterboxed, skippable and waited on.
order: 14
level: intermediate
---

`kit.cutscene` plays a scripted scene: a list of shots, each a camera look or move, a spoken line, an animation, a wait or a call to your code. The scene can be letterboxed, can hold the world still while it plays, can play its own music, and can be skipped by the player. You `wait` on it, and learn whether it ran to its end or was skipped.

## Example

From [A new galaxy](tutorials/a-new-galaxy.md): a boss's introduction, played from the boss's first state before the fight begins.

```lumascript source/main.lum
use kit.cutscene
use kit.hud

// OrbKing is the boss's class (a LiveActor with a `meter: hud.Meter?` field); see the tutorial.
states OrbKingStates for OrbKing {
    state Intro {
        enter {
            wait cutscene.play(cutscene.Scene {
                shots: [ cutscene.Shot.Look(at: ref(self), from_offset: vec3(0, 400, 900), frames: 120),
                         cutscene.Shot.Line(speaker: ref(self), line: text "Boss.Greeting") ]
                letterbox: true
            })
            meter = hud.meter(hud.Corner.Top, max: 3, label: text "Boss.Name")
            go Attack
        }
    }
    // ... the boss's other states
}
```

Knowing whether the player skipped:

```lumascript
task intro(guide: ref<LiveActor>) {
    let watched = wait cutscene.play(cutscene.Scene {
        shots: [ cutscene.Shot.Line(speaker: guide, line: text "Guide.Welcome"),
                 cutscene.Shot.Action(who: guide, action: "Wave"),
                 cutscene.Shot.Wait(frames: 60) ]
        music: sound "IntroTheme"
    })
    if not watched { log "skipped" }
}
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.cutscene
```

The module takes the main camera through [camera](lumakit/camera.md), speaks lines through [talk](lumakit/talk.md), holds the world with the [time service](services/time.md), plays music with the [audio service](services/audio.md), and uses the game's own cinema frame for the letterbox. It needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub struct Scene { shots: list<Shot>, letterbox: bool = true, skippable: bool = true, holds_world: bool = true,
                   music: sound? = none }
pub enum Shot { Look(at: ref<LiveActor>, from_offset: vec3, frames: u32), Move(from: draw.Eye, to: draw.Eye, frames: u32),
                Line(speaker: ref<LiveActor>?, line: text), Action(who: ref<LiveActor>, action: text),
                Wait(frames: u32), Call(fn()) }
pub fn play(s: Scene) -> pending<bool>     // true: it ran to its end; false: skipped
pub fn find(id: text) -> Scene?            // a scene of this mod from kit/cutscene
```

## Functions

| Name       | Description                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `play(s)`  | Plays the scene. `wait` on it: `true` when it ran to its end, `false` when the player skipped it. |
| `find(id)` | The scene your mod wrote in `kit/cutscene/<id>.json`, or `none`.                                  |

## Types

### Scene

| Field         | Description                                                |
| ------------- | ---------------------------------------------------------- |
| `shots`       | The shots, played in order.                                |
| `letterbox`   | Black bars above and below while it plays. Default `true`. |
| `skippable`   | The player may skip it. Default `true`.                    |
| `holds_world` | The world stands still while it plays. Default `true`.     |
| `music`       | Music for the scene, or `none`.                            |

### Shot

| Case                            | Description                                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `Look(at, from_offset, frames)` | The camera looks at the actor `at` from `from_offset` away, for `frames`.                                                  |
| `Move(from, to, frames)`        | The camera moves from one `draw.Eye` to another over `frames`.                                                             |
| `Line(speaker, line)`           | `speaker` says `line` in the game's speech balloon (through [talk](lumakit/talk.md)); `none` for a line without a speaker. |
| `Action(who, action)`           | The actor `who` plays the animation `action`.                                                                              |
| `Wait(frames)`                  | Nothing new for `frames`.                                                                                                  |
| `Call(f)`                       | Calls your function `f`.                                                                                                   |

## Data files

A scene can be written as `kit/cutscene/<id>.json`, with its actors named by their placement names in the stage. Declare the data format in `luma.json` with `"kit": { "lumakit.cutscene": 1 }`, and play it from code with `find`:

```lumascript
task play_opening() {
    if let scene = cutscene.find("opening") { wait cutscene.play(scene) }
}
```

## Behaviour and edge cases

- **Refs, not views.** Shots keep their actors across frames, so they take `ref<LiveActor>`: write `ref(self)` inside a class, not `self`.
- **Waiting.** `play` returns a `pending` result, read with `wait` in a task, a state or an event handler.
- **The camera.** A scene takes the main camera the way [camera](lumakit/camera.md)'s `take` does, so it follows the same rule for several mods, and gives it back when it ends or is skipped.
- **Your mod switched off.** A scene it was playing stops, and the camera and world are given back.

## See also

- [talk](lumakit/talk.md): the lines
- [camera](lumakit/camera.md)
- [actor](lumakit/actor.md)
- [Tasks, states and wait](lumascript/tasks.md)
- [Tutorial: a new galaxy](tutorials/a-new-galaxy.md)

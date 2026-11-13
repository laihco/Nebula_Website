---
title: 'LumaKit: talk'
nav_title: talk
description: Lines and choices spoken by an actor in the game's own speech balloon, dialogue trees written as data, and voice for lines.
order: 15
level: intermediate
---

`kit.talk` makes an actor speak in the game's own speech balloon. It says a line, asks a question with choices and gives you the answer, runs a whole dialogue tree written as data (with choices that set per-file flags), and plays a voice sound when a line is shown. Pair it with [actor](lumakit/actor.md)'s `on_talk` for a character the player can walk up to and talk to.

## Example

From [A new NPC](tutorials/a-new-npc.md): a keeper who asks a question and answers the player's choice.

```lumascript source/main.lum
use kit.actor
use kit.talk

let keeper = actor.define(actor.Kind {
    name: "LumaKeeper"
    look: model "Keeper"
    idle_action: "Wait"
    sensors: [actor.Sensor.Body(radius: 70.0)]
    on_talk: chat
})

fn chat(self: LiveActor) {
    start chat_task(ref(self))
}

task chat_task(k: ref<LiveActor>) {
    let answer = wait talk.ask(k, text "Keeper.Hello", [text "Keeper.Yes", text "Keeper.No"])
    match answer {
        0 => wait talk.say(k, text "Keeper.Thanks")
        else => wait talk.say(k, text "Keeper.Bye")
    }
}
```

A dialogue tree from `kit/talk/keeper.json`, and a voiced line:

```lumascript
on start {
    talk.voice(text "Keeper.Hello", sound "KeeperHello")
}

task tree_task(k: ref<LiveActor>) {
    let ending = wait talk.run(k, "keeper")
    if ending == "agreed" { log "the keeper agreed" }
}
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.talk
```

The module uses the game's own talk calls and `TalkMessageCtrl`, so lines look and sound like the game's. It reads text and sound content, and sets per-file flags through [progress](lumakit/progress.md). It needs no permission.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today).

## Interface

```lumascript
pub fn say(who: ref<LiveActor>, line: text) -> pending
pub fn ask(who: ref<LiveActor>, line: text, choices: list<text>) -> pending<int>
pub fn run(who: ref<LiveActor>, tree: text) -> pending<text?>  // a tree of kit/talk; its end node's name
pub fn voice(line: text, s: sound)          // the sound played when the line is shown
```

## Functions

| Name                      | Description                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `say(who, line)`          | `who` says `line` in the speech balloon. `wait` on it to continue when the player closes the line.                                            |
| `ask(who, line, choices)` | `who` says `line` and offers `choices`. `wait` gives the index of the chosen one (0 for the first).                                           |
| `run(who, tree)`          | Runs the dialogue tree `kit/talk/<tree>.json` with `who` speaking. `wait` gives the name of the end node the conversation reached, or `none`. |
| `voice(line, s)`          | Plays the sound `s` whenever the line `line` is shown. Set it once, for example in `on start`.                                                |

## Data files

A dialogue tree is a file `kit/talk/<tree>.json`. It is a set of nodes; each node has a line, its choices, the next node for each choice, and a per-file flag a choice sets (kept by [progress](lumakit/progress.md)). Trees may loop back to earlier nodes. Declare the data format in `luma.json` with `"kit": { "lumakit.talk": 1 }`, and run a tree with `talk.run(who, "<tree>")`.

## Behaviour and edge cases

- **Refs, not views.** Each call takes a `ref<LiveActor>`, since the conversation lasts several frames. Inside `on_talk`, turn the view you are given into a ref with `ref(self)` and start a task, as in the example.
- **Waiting.** `say`, `ask` and `run` return `pending` results, read with `wait` in a task, a state or an event handler.
- **Text.** Use your mod's text rows (`text "Keeper.Hello"`) so the dialogue is translated.
- **Your mod switched off.** A conversation it started ends.

## See also

- [actor](lumakit/actor.md): `on_talk`
- [cutscene](lumakit/cutscene.md): lines inside a scene
- [progress](lumakit/progress.md): the flags a tree sets
- [Sound](content/sound.md)
- [Tutorial: a new NPC](tutorials/a-new-npc.md)

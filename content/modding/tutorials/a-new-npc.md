---
title: 'Tutorial: a new character to talk to'
nav_title: A new NPC
description: Add a character with its own model, materials and textures that greets Mario and asks him a question.
order: 3
level: essential
---

This tutorial adds a new character to the game: the Keeper, with a model of your own, who greets Mario, asks a yes-or-no question and answers. It's your first mod that uses LumaKit, the ready-made gameplay library, and your first _task_: code that waits for the player without stopping the game.

> [!PLANNED]
> This tutorial uses the LumaKit modules `actor` and `talk`. They're written but not yet part of the LumaKit library you can install, so the code builds once they are. The steps and code below are final.

## What you'll build

A character kind called `LumaKeeper` that you can place in any stage. When Mario walks up to it, the game shows its talk prompt. Talk to it, and it asks a question with two answers in the game's own speech balloon, then replies to whichever you chose.

## What you'll learn

- How to use a LumaKit module: `needs` in `luma.json`, then `use kit.<module>`.
- How `actor.define` makes a new kind of object, with a model, an idle animation and a sensor, in a few lines.
- How a _callback_ (`on_talk`) lets LumaKit call your code at the right moment.
- How a `task` waits for the player's answer with `wait`, without holding up the game.
- Why a task keeps a _handle_ (`ref`) instead of the object itself.
- How content names like `model "Keeper"` and `text "Keeper.Hello"` are checked when you build.

## Before you start

- Finish [Your first mod](start/first-mod.md) and [Moon jump](tutorials/moon-jump.md).
- Read [LumaKit overview](lumakit/overview.md) if you haven't; it explains the rules every LumaKit module keeps.
- You need a model for the character: a glTF file (`.glb` or `.gltf`) with its materials and textures, and an animation named `Wait` for it to play while it stands. [Models](content/models.md) says how the game reads a glTF file.

## The mod's folder

```text
keeper/
  luma.json
  source/
    main.lum
  layers/
    base/
      assets/
        Keeper.glb
```

`layers/base/assets/` holds new content of your mod's own, named by its path: `Keeper.glb` is the model `"Keeper"`. The game _cooks_ it on the player's device: the glTF model, its materials and textures become the game's own model format, and each animation in the file becomes one of the model's clips. See [Content overview](content/overview.md) and [Materials](content/materials.md).

Your mod also needs the five pieces of text the Keeper uses (`Keeper.Hello`, `Keeper.Yes`, `Keeper.No`, `Keeper.Thanks` and `Keeper.Bye`) as text rows of the mod, in each language you support.

## Step 1: luma.json

```json luma.json
{
  "format": "1.0",
  "id": "you.keeper",
  "version": "1.0.0",
  "name": "The Keeper",
  "summary": "A new character to talk to.",
  "authors": ["you"],
  "game": { "id": "RMG" },
  "needs": [{ "id": "lumakit", "version": "^1" }]
}
```

LumaKit is itself a mod, `lumakit`. A mod that writes `use kit.<module>` must list it in `needs`, with the versions it works with (`^1`: any 1.x). Without it, the compiler stops at the `use` line and names the `needs` entry to add. With it, the game loads and starts LumaKit before your mod, and a player who doesn't have LumaKit sees your mod off with the reason. One copy of LumaKit serves every mod that needs it.

## Step 2: define the character

```lumascript source/main.lum
use kit.actor
use kit.talk

let keeper = actor.define(actor.Kind {
    name: "LumaKeeper"                     // placed in stages by name
    look: model "Keeper"                   // its glTF materials and textures, cooked on the device
    idle_action: "Wait"
    sensors: [actor.Sensor.Body(radius: 70.0)]
    on_talk: chat
})
```

`use kit.actor` and `use kit.talk` bring in two LumaKit modules. (`kit.` is short for `lumakit.`.)

`actor.define` takes an `actor.Kind`, a description of a new kind of object, and returns its `KindId`. It runs once, when the mod starts, because it's a module-level `let`. The fields used here:

| Field         | What it does                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | The class name stages place it by. To the game it's `<your mod id>/LumaKeeper`, so two mods can both have a "LumaKeeper" without clashing.        |
| `look`        | The model it shows. `model "Keeper"` names your mod's content; the build checks that the model exists.                                            |
| `idle_action` | The animation it starts when it appears.                                                                                                          |
| `sensors`     | Its hit sensors. `actor.Sensor.Body(radius: 70.0)` is a body sensor with a radius of 70 units, so Mario bumps into it instead of walking through. |
| `on_talk`     | The function to call when the player talks to it. Giving `on_talk` makes the actor talkable: the game shows its talk prompt when Mario is near.   |

`actor.Kind` has more fields with defaults: by default an actor stands on the ground under gravity and casts a shadow. See [LumaKit: actor](lumakit/actor.md) for all of them.

## Step 3: start a conversation

```lumascript
fn chat(npc: LiveActor) {
    start chat_task(ref(npc))
}
```

LumaKit calls `chat` when the player talks to a Keeper, giving it that Keeper as a `LiveActor` view.

A conversation takes several seconds: the game shows a line, the player reads it and picks an answer. A function can't wait that long; it has to return so the game can go on. So `chat` _starts a task_ and returns at once. `start chat_task(...)` runs the task from the next frame.

The task gets `ref(npc)`, not `npc`. A view like `npc` is only valid now; the game may remove the object on a later frame (a stage change, for instance). A `ref<LiveActor>` is a _handle_: a safe way to refer to the object across frames, which becomes empty once the object is gone. The compiler refuses a view as a task's parameter for exactly this reason. See [Memory and lifetimes](lumascript/memory.md).

## Step 4: the conversation as a task

```lumascript
task chat_task(k: ref<LiveActor>) {
    let answer = wait talk.ask(k, text "Keeper.Hello", [text "Keeper.Yes", text "Keeper.No"])
    match answer {
        0 => wait talk.say(k, text "Keeper.Thanks")
        else => wait talk.say(k, text "Keeper.Bye")
    }
}
```

A `task` runs on the game thread, a little each frame, and can `wait`. See [Tasks, states and wait](lumascript/tasks.md).

- `talk.ask(who, line, choices)` shows `line` in the game's speech balloon from `who`, with the choices to pick from. It answers later, so it returns a _pending_ result. `wait` pauses the task, frame by frame, until the player has chosen, then gives the index of the choice: `0` for "Yes", `1` for "No".
- `talk.say(who, line)` shows one line. Waiting on it keeps the task going until the player has read it.
- `match answer` picks the reply: `0 =>` for the first choice, `else =>` for anything else.
- `text "Keeper.Hello"` is the mod's text row with that key, in the player's language. Like `model "Keeper"`, the key is checked when you build: a key your mod doesn't have is a compile error naming it.

The game keeps running while the task waits. Other mods, the frame handler and the rest of your mod all carry on.

## Step 5: place the Keeper in a stage

A kind defined by a mod is placed like any of the game's objects: by its name, in a stage's placement table. You change a game stage's table with a _patch_ that adds a row, in your mod's `layers/`:

```text
layers/base/patches/StageData/<Stage>.arc/jmp/placement/<layer>/objinfo.json
```

```json
{
  "patch": 1,
  "add": [{ "name": "LumaKeeper", "l_id": 900, "pos_x": 0, "pos_y": 0, "pos_z": 500 }]
}
```

Replace `<Stage>` and `<layer>` with the stage's archive and placement layer (`lumalink extract` writes a stage's tables so you can see them). Because this patch is in your own mod's layers, it can use the short name `LumaKeeper`. Anywhere else, a stage places it by its full name, `you.keeper/LumaKeeper`. See [Stages](content/stages.md) and [Table patches](content/table-patches.md).

If the stage is loaded while your mod is off, the Keeper simply isn't made: the stage loads without it, and the mod log names the kind, the stage and the mod.

## Check, build, pack and try

```sh
lumalink check keeper
lumalink build keeper
lumalink pack keeper
```

See [Check, build, pack and run](start/workflow.md) for the options these commands take and the faster edit loop with `lumalink run`.

`check` also cooks and checks your content, so a model that can't be read, or a missing text key, is reported here with its file. Install LumaKit and `keeper.luma`, switch both on in the Mods screen, and go to the stage. Walk up to the Keeper and talk.

## The complete file

```lumascript source/main.lum
use kit.actor
use kit.talk

let keeper = actor.define(actor.Kind {
    name: "LumaKeeper"                     // placed in stages by name
    look: model "Keeper"                   // its glTF materials and textures, cooked on the device
    idle_action: "Wait"
    sensors: [actor.Sensor.Body(radius: 70.0)]
    on_talk: chat
})

fn chat(npc: LiveActor) {
    start chat_task(ref(npc))
}

task chat_task(k: ref<LiveActor>) {
    let answer = wait talk.ask(k, text "Keeper.Hello", [text "Keeper.Yes", text "Keeper.No"])
    match answer {
        0 => wait talk.say(k, text "Keeper.Thanks")
        else => wait talk.say(k, text "Keeper.Bye")
    }
}
```

## Ideas to extend it

- **A longer conversation.** `talk.run(who, tree)` runs a dialogue tree from your mod's `kit/talk/<tree>.json`: lines, choices and the next node for each, and a flag each choice can set. It gives the name of the node the conversation ended on. See [LumaKit: talk](lumakit/talk.md).
- **A voice for each line.** `talk.voice(line, sound)` plays a sound when a line is shown.
- **No code at all.** A kind can also be written as data in `kit/actor/<name>.json`, with every field but the functions. Code can then find it with `actor.find(name)`. See [LumaKit: actor](lumakit/actor.md).
- **Make it look at Mario.** `actor.turn_toward(a, at, degrees_per_frame)` turns an actor toward a point; `actor.sees_player(a, distance, degrees)` tells whether Mario is in front of it.

## See also

- [LumaKit overview](lumakit/overview.md)
- [LumaKit: actor](lumakit/actor.md) and [LumaKit: talk](lumakit/talk.md)
- [Tasks, states and wait](lumascript/tasks.md)
- [Memory and lifetimes](lumascript/memory.md)
- [Models](content/models.md) and [Stages](content/stages.md)

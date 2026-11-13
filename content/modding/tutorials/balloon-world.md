---
title: 'Tutorial: a game mode of your own, Balloon World'
nav_title: Balloon World
description: A hide-and-seek game mode over the internet. Hide a balloon on the ground where you stand; others download it, read your hint and race to pop it.
order: 9
level: advanced
---

This tutorial builds a whole online game mode on top of the game. One player hides a balloon on the ground beneath them, with a hint; the mod uploads where it is. Other players in the same star download the balloons hidden there, pick one by its hint, and race to find and pop it, with a timer running. Their time is uploaded too.

> [!PLANNED]
> Several parts of this tutorial are not built yet, so the mod as written builds once they are:
>
> - the LumaKit modules `actor`, `hud`, `menu` and `screen` (written, not yet in the LumaKit library you can install);
> - making an actor in the middle of a stage, after the stage has made its own objects (Step 5's `spawn`);
> - text entry with the platform's keyboard (`input.text`, Step 3);
> - the short, waited form of HTTP requests used here (`use svc.net.http`, then `wait http.get(...)` and `wait http.post(...)` giving a reply with `status` and `body`, and `net.url_escape`). As built, HTTP is the `http` operation of the `net.internet` service, which answers with HEADERS, DATA and DONE events; see [Network](services/net.md#http-requests) for the exact calls.
>
> The permission, the raycast, the JSON and the actor logic below are as they will be.

## What you'll build

- Two pause-menu entries: **Hide a balloon** and **Find a balloon**.
- **Hide:** the mod finds the ground under the player, along the gravity there, asks for a hint (up to 40 characters), and uploads the stage, the star, the position and the hint.
- **Find:** the mod downloads the balloons hidden in this star, shows their hints to choose from, makes the chosen balloon at its place, and starts a timer.
- **Pop:** touching the balloon pops it with an effect, and the time is uploaded.

## What you'll learn

- How a callback on touch (`on_touch_player`) makes an actor that reacts to the player.
- How to ask the game where the ground is, with its own raycast, along the local gravity.
- How to pass `none` for a game function's optional pointer, and `var x` for one it writes.
- How to send your own struct as JSON and decode a list of them.
- How `screen.choose` asks the player to pick from a list, and gives `none` when they back out.
- How `hud.timer(...).follow(...)` shows a time that a function works out each frame.

## Before you start

- Finish [Online leaderboard](tutorials/online-leaderboard.md) (internet permission, HTTP requests, JSON, text input) and [A new NPC](tutorials/a-new-npc.md) (actor kinds).
- You need a balloon model with an animation `Float` and an effect `Pop` of its own, and a server (see [Step 7](tutorials/balloon-world.md#step-7-the-server-s-side)).

## The mod's folder

```text
balloon-world/
  luma.json
  source/
    main.lum
  layers/
    base/
      assets/
        Balloon.glb         with its animation "Float" and its effect "Pop"
```

The mod's text rows are the menu entries and messages: `Balloon.Hide`, `Balloon.Find`, `Balloon.NoGround`, `Balloon.AskHint`, `Balloon.Hidden`, `Balloon.Failed`, `Balloon.NoneHere` and `Balloon.Pick`.

## Step 1: luma.json

```json luma.json
{
  "format": "1.0",
  "id": "you.balloon-world",
  "version": "1.0.0",
  "name": "Balloon World",
  "summary": "Hide balloons for other players and race to pop theirs.",
  "authors": ["you"],
  "game": { "id": "RMG" },
  "needs": [{ "id": "lumakit", "version": "^1" }],
  "options": [
    {
      "key": "server",
      "kind": "text",
      "default": "https://example.invalid/balloons",
      "max_length": 256,
      "name": "Balloon server"
    }
  ],
  "permissions": [
    {
      "name": "net.internet",
      "hosts": ["example.invalid"],
      "why": "Uploads the balloons you hide and downloads others' to find."
    }
  ]
}
```

As in the leaderboard, `hosts` must name your server's host; the player sees it when asked. See [Permissions](start/permissions.md).

## Step 2: the balloon and the state

```lumascript source/main.lum
use svc.net.http
use svc.time
use svc.input
use kit.actor
use kit.hud
use kit.menu
use kit.screen

option server: text

struct Hidden { id: text, stage: text, scenario: int, at: vec3, hint: text, by: text }

let balloon_kind = actor.define(actor.Kind {
    name: "LumaBalloon"
    look: model "Balloon"
    sensors: [actor.Sensor.Body(radius: 80.0)]
    on_touch_player: pop
    idle_action: "Float"
})

var hunting: Hidden? = none
var hunt_start: u64 = 0
var placed: ref<LiveActor>? = none

on start {
    menu.add_pause_entry(text "Balloon.Hide", hide)
    menu.add_pause_entry(text "Balloon.Find", find)
}
```

- `Hidden` describes one hidden balloon, exactly as it travels to and from the server: its id, the stage and star, its position, the hint and who hid it. `json.encode` writes a struct as an object of its fields by name, and a `vec3` as `[x, y, z]`.
- `balloon_kind` is a new actor kind with a body sensor and `on_touch_player: pop`: when the player touches a balloon, LumaKit calls `pop` with it. It plays its `Float` animation while it waits.
- `hunting` is the balloon being looked for (or `none`), `hunt_start` the frame the hunt began, and `placed` a handle to the balloon made for it.
- `on start` adds the two pause entries.

## Step 3: hiding a balloon

```lumascript
fn hide() { start hide_task() }

task hide_task() {
    guard let player = MR::getPlayerPos(), let me = MarioAccess::getPlayerActor() else { return }
    var ground = vec3(0, 0, 0)
    var gravity = vec3(0, -1, 0)
    MR::calcGravityVector(me, var gravity, none, none)
    if not MR::getFirstPolyOnLineToMap(var ground, none, player, gravity * 1000.0) {
        screen.message(text "Balloon.NoGround")
        return
    }
```

**Where the player is.** `MR::getPlayerPos()` gives a copy of the player's position, or `none` when there's no player; `MarioAccess::getPlayerActor()` gives the player. `guard let` takes both, or ends the task.

**Which way is down here.** `MR::calcGravityVector(actor, var gravity, none, none)` is the game's own: it writes the gravity at the player's place into `gravity`. Its last two parameters are pointers the game lets you leave out, so you pass `none`. On a planet, "down" points at its centre, not along -Y.

**Where the ground is.** `MR::getFirstPolyOnLineToMap(var hit, triangle, from, along)` is the game's raycast against the map. It looks along the line from the player 1000 units "down" and writes the first point it hits into `ground`. The second parameter would receive the triangle that was hit; this mod doesn't need it, so it passes `none`. If nothing is hit (the player is over a pit, say), it returns false and the player gets a message.

```lumascript
    let hint = wait input.text(text "Balloon.AskHint", max_chars: 40) ?? ""
    let body = json.encode(Hidden { id: "", stage: MR::getCurrentStageName(), scenario: MR::getCurrentScenarioNo(),
                                    at: ground, hint, by: "" })
    let reply = wait http.post("{server}/hide", body)
    screen.message(if reply.status == 200 { text "Balloon.Hidden" } else { text "Balloon.Failed" })
}
```

- `input.text` asks for the hint on the platform's keyboard (planned, see the note at the top). `?? ""` gives an empty hint if the player cancels, so the balloon is still hidden.
- The body is a `Hidden` struct as JSON. `hint` alone is shorthand for `hint: hint`. The `id` and `by` are left empty for the server to fill in.
- After the upload, a message says whether it worked. `if ... { } else { }` is an expression, choosing which text to show.

> [!NOTE]
> The player's actor `me` is a view, made before the task waits. That's allowed because the task doesn't use it after the `wait`. Reading a view after a `wait` is a compile error, since the object may be gone by then.

## Step 4: choosing a balloon to find

```lumascript
fn find() { start find_task() }

task find_task() {
    let stage = MR::getCurrentStageName()
    let reply = wait http.get("{server}/list?stage={net.url_escape(stage)}&scenario={MR::getCurrentScenarioNo()}")
    guard reply.status == 200, let list = json.decode<list<Hidden>>(reply.body), list.len() > 0 else {
        screen.message(text "Balloon.NoneHere")
        return
    }
    let choice = wait screen.choose(text "Balloon.Pick", list.map(fn(h: Hidden) -> text { return h.hint }))
    guard let i = choice else { return }
```

- The request asks for the balloons of this stage and star. `net.url_escape` makes the stage name safe in a URL.
- `guard` checks three things in order: the status, that the body decodes as a list of `Hidden`, and that the list isn't empty. If any fails, there's nothing to find here.
- `screen.choose(title, rows)` shows the hints as a choice screen and gives the chosen row's index, or `none` if the player backed out. `list.map(...)` turns the list of balloons into a list of their hints.

## Step 5: the hunt begins

```lumascript
    hunting = list[i]
    placed = ref(balloon_kind.spawn(at: list[i].at))
    hunt_start = time.now().frame
    hud.timer(hud.Corner.TopRight).follow(fn() -> u64 { return time.now().frame - hunt_start })
}
```

- The chosen balloon becomes the one being hunted. `time.now().frame` (the frames presented since the game started) marks when the hunt began.
- `balloon_kind.spawn(at:)` makes a balloon at the hidden position, and `ref(...)` keeps a handle to it.
- `hud.timer(...)` puts a timer in the top-right corner. `follow(f)` hands it a function that it calls each frame to know what to show: the frames since the hunt began. You don't have to set it yourself.

## Step 6: popping it

```lumascript
fn pop(b: LiveActor) {
    guard let h = hunting else { return }
    let frames = time.now().frame - hunt_start
    MR::emitEffect(b, "Pop")                               // the balloon model's own effect, by name
    b.kill()
    hunting = none
    start report(h.id, frames as u32)
}

task report(id: text, frames: u32) {
    let reply = wait http.post("{server}/found", json.encode({ "id": id, "frames": frames }))
    if reply.status != 200 { log "balloon: {reply.status}" }
}
```

LumaKit calls `pop` when the player touches a balloon. If there's a hunt on, the mod notes the time, plays the balloon's own `Pop` effect with the game's `MR::emitEffect`, removes the balloon with `b.kill()`, ends the hunt, and starts a task to upload the time. Any upload error goes to the mod log.

## Step 7: the server's side

| Request                                        | Body or query                                                                                           | Answer                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `POST <server>/hide`                           | A `Hidden` as JSON: `{"id": "", "stage": ..., "scenario": ..., "at": [x, y, z], "hint": ..., "by": ""}` | Status 200 when stored                                                        |
| `GET <server>/list?stage=<stage>&scenario=<n>` |                                                                                                         | Status 200 and a JSON array of `Hidden` objects, each with its `id` filled in |
| `POST <server>/found`                          | `{"id": ..., "frames": ...}`                                                                            | Status 200 when stored                                                        |

## Check, build, pack and try

```sh
lumalink check balloon-world
lumalink build balloon-world
lumalink pack balloon-world
```

See [Check, build, pack and run](start/workflow.md) for the options. Install LumaKit and `balloon-world.luma`, allow the internet permission, and choose **Hide a balloon** from the pause menu. With a second player (or a second save file), choose **Find a balloon** in the same star.

## The complete file

```lumascript source/main.lum
use svc.net.http
use svc.time
use svc.input
use kit.actor
use kit.hud
use kit.menu
use kit.screen

option server: text

struct Hidden { id: text, stage: text, scenario: int, at: vec3, hint: text, by: text }

let balloon_kind = actor.define(actor.Kind {
    name: "LumaBalloon"
    look: model "Balloon"
    sensors: [actor.Sensor.Body(radius: 80.0)]
    on_touch_player: pop
    idle_action: "Float"
})

var hunting: Hidden? = none
var hunt_start: u64 = 0
var placed: ref<LiveActor>? = none

on start {
    menu.add_pause_entry(text "Balloon.Hide", hide)
    menu.add_pause_entry(text "Balloon.Find", find)
}

fn hide() { start hide_task() }

task hide_task() {
    guard let player = MR::getPlayerPos(), let me = MarioAccess::getPlayerActor() else { return }
    var ground = vec3(0, 0, 0)
    var gravity = vec3(0, -1, 0)
    MR::calcGravityVector(me, var gravity, none, none)
    if not MR::getFirstPolyOnLineToMap(var ground, none, player, gravity * 1000.0) {
        screen.message(text "Balloon.NoGround")
        return
    }
    let hint = wait input.text(text "Balloon.AskHint", max_chars: 40) ?? ""
    let body = json.encode(Hidden { id: "", stage: MR::getCurrentStageName(), scenario: MR::getCurrentScenarioNo(),
                                    at: ground, hint, by: "" })
    let reply = wait http.post("{server}/hide", body)
    screen.message(if reply.status == 200 { text "Balloon.Hidden" } else { text "Balloon.Failed" })
}

fn find() { start find_task() }

task find_task() {
    let stage = MR::getCurrentStageName()
    let reply = wait http.get("{server}/list?stage={net.url_escape(stage)}&scenario={MR::getCurrentScenarioNo()}")
    guard reply.status == 200, let list = json.decode<list<Hidden>>(reply.body), list.len() > 0 else {
        screen.message(text "Balloon.NoneHere")
        return
    }
    let choice = wait screen.choose(text "Balloon.Pick", list.map(fn(h: Hidden) -> text { return h.hint }))
    guard let i = choice else { return }
    hunting = list[i]
    placed = ref(balloon_kind.spawn(at: list[i].at))
    hunt_start = time.now().frame
    hud.timer(hud.Corner.TopRight).follow(fn() -> u64 { return time.now().frame - hunt_start })
}

fn pop(b: LiveActor) {
    guard let h = hunting else { return }
    let frames = time.now().frame - hunt_start
    MR::emitEffect(b, "Pop")                               // the balloon model's own effect, by name
    b.kill()
    hunting = none
    start report(h.id, frames as u32)
}

task report(id: text, frames: u32) {
    let reply = wait http.post("{server}/found", json.encode({ "id": id, "frames": frames }))
    if reply.status != 200 { log "balloon: {reply.status}" }
}
```

## Ideas to extend it

- **Take the timer down after the pop.** `hud.timer(...)` returns a `hud.Timer` handle. Keep it in a module `var` and call `remove()` on it in `pop`, so the corner is clear for the next hunt.
- **Remove a balloon nobody popped.** `placed` already holds a handle to the balloon. Before spawning a new one, `if let b = placed?.get() { b.kill() }` takes the old one away.
- **Show who hid it.** `hud.above(of, text)` puts text above an actor and follows it, so the balloon could carry its hider's name. See [LumaKit: hud](lumakit/hud.md).

## See also

- [LumaKit: actor](lumakit/actor.md), [hud](lumakit/hud.md), [screen](lumakit/screen.md) and [menu](lumakit/menu.md)
- [Network service](services/net.md) and [Input](services/input.md)
- [The game in scope: names, views, handles](lumascript/game-objects.md)
- [Online leaderboard](tutorials/online-leaderboard.md)

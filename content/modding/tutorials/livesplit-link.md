---
title: "Tutorial: talking to another program, a LiveSplit link"
nav_title: LiveSplit link
description: Drive LiveSplit from the game: start the timer, split on every star, and pause game time during loads, over TCP or a named pipe.
order: 6
level: intermediate
---

This tutorial connects the game to LiveSplit, the speedrunning timer, running on the same computer. The mod starts LiveSplit's timer when you start playing, splits on every star and grand star, and pauses game time while the game loads. It's an example of a mod talking to another program through the `net` service, with a permission the player allows.

## What you'll build

A mod that sends LiveSplit's server one line of text for each event:

| When                                                          | The mod sends                |
| ------------------------------------------------------------- | ---------------------------- |
| A stage starts for the first time and the timer isn't running | `starttimer`                 |
| The game starts loading                                       | `pausegametime`              |
| The game finishes loading                                     | `unpausegametime`            |
| You get a Power Star or a Grand Star                          | `split`                      |
| The staff roll starts                                         | `split`, and the run is over |

It connects over TCP to port 16834 on this machine, or, on Windows, through LiveSplit's named pipe `LiveSplit`. If the connection closes, it tries again five seconds later.

## What you'll learn

- How to declare the `net.local` permission and why the player is asked for it.
- How to open a connection with `net.local.tcp_connect` or `net.local.ipc_connect`, keep it in a module `var`, and send text on it.
- How a service tells your mod about something that happened, with an `on <service>.<event>` handler.
- How to notice loading screens with `time.now().state`.
- How `after` and `before` hooks mark moments in the game: a stage starting, a star got, the staff roll.
- How to react when the player changes an option, with `on option`.
- How a short task retries after a delay with `wait 5 seconds`.

## Before you start

- Finish [Hide the HUD](tutorials/hide-the-hud.md), which explains hooks and options.
- Read [Permissions](start/permissions.md) for how players are asked.
- Have LiveSplit with its server running on the same computer.

## The mod's folder

```text
livesplit-link/
  luma.json
  source/
    main.lum
```

## Step 1: luma.json with options and a permission

```json luma.json
{
  "format": "1.0",
  "id": "you.livesplit-link",
  "version": "1.0.0",
  "name": "LiveSplit link",
  "summary": "Starts, splits and pauses LiveSplit's timer from the game.",
  "authors": ["you"],
  "game": { "id": "RMG" },
  "options": [
    {
      "key": "port",
      "kind": "number",
      "default": 16834,
      "min": 1,
      "max": 65535,
      "name": "LiveSplit server port"
    },
    {
      "key": "use_pipe",
      "kind": "toggle",
      "default": false,
      "name": "Use LiveSplit's pipe (Windows)"
    }
  ],
  "permissions": [{ "name": "net.local", "why": "Talks to LiveSplit on this computer." }]
}
```

**The permission.** Connecting to anything, even a program on the same computer, needs a permission. `net.local` covers this machine and the local network: the player reads "Connects to devices on your network and to programs on this device", with your `why` line, and allows it or not. A mod that declares no permission for a service it uses is refused when it's checked. See [Permissions](start/permissions.md) and [Network](services/net.md).

`net.local` reaches this machine and the local network only, by address (`127.0.0.1`, for instance), never the internet. The internet is a separate permission, `net.internet`, which [the leaderboard tutorial](tutorials/online-leaderboard.md) uses.

**The options.** `port` is a whole number, so the code reads it as an `int`. `use_pipe` is a `toggle`, a `bool`.

## Step 2: state and connecting

```lumascript source/main.lum
use svc.net.local
use svc.time
use svc.system

option port: int                  // default 16834
option use_pipe: bool             // Windows: LiveSplit's pipe instead of TCP

var link: net.local.Stream? = none
var running = false
var loading = false

on start { connect() }

fn connect() {
    link = if use_pipe and system.facts().platform == system.Platform.Windows {
        net.local.ipc_connect("LiveSplit")
    } else {
        net.local.tcp_connect("127.0.0.1", port as u16)
    }
}
```

- Three services: `net.local` to connect, `time` to know when the game is loading, and `system` to ask which platform the game runs on.
- `link` is the open connection, a `net.local.Stream?`: `none` while there's none. `running` remembers whether LiveSplit's timer is running, and `loading` whether the game was loading last frame.
- `on start` runs once, when the mod starts, so the mod connects straight away.
- In `connect`, `if ... { } else { }` is an expression: its value goes into `link`. `system.facts()` gives facts about the machine that don't change during a session; its `platform` is a `system.Platform`. On Windows with `use_pipe` on, the mod connects to LiveSplit's named pipe with `net.local.ipc_connect("LiveSplit")` (on Windows, `\\.\pipe\LiveSplit`). Otherwise it connects over TCP to this machine with `net.local.tcp_connect`, on the `port` option, converted with `as u16`. Both give the same kind of stream, so the rest of the mod doesn't care which.

Neither call waits. The connection is made in the background, and anything that happens to it later (connected, data arrived, closed, an error) arrives as an event at the start of a frame. Your code never stalls the game waiting for the network.

## Step 3: when the link closes, try again

```lumascript
on net.local.closed(s, why) {
    if same(s, link) { link = none; log "LiveSplit link closed: {why}; retrying in 5 s"; start retry() }
}
task retry() { wait 5 seconds; connect() }
```

- `on net.local.closed(s, why)` runs whenever one of the mod's connections closes: LiveSplit was closed, or its server stopped. `s` is the connection and `why` the reason.
- `same(s, link)` checks that it's _this_ link. Service handles are compared with `same`, not `==`.
- The handler forgets the link, writes a line to the mod log, and starts `retry`.
- `retry` is a task: `wait 5 seconds` lets five seconds of game time pass, then it connects again. A function couldn't wait; a task can.

## Step 4: sending a line

```lumascript
fn say(line: text) { link?.send("{line}\r\n".bytes()) }
```

LiveSplit's server reads one command per line. `"{line}\r\n"` puts the command in a text with a line ending, `.bytes()` gives its UTF-8 bytes, and `send` queues them on the connection.

`link?.send(...)` uses `?.`: when `link` is `none`, nothing happens. So `say` is safe to call whether or not LiveSplit is connected.

## Step 5: the moments that matter

```lumascript
hook after GameScene::startStagePlayFirst() {
    if not running { say("starttimer"); running = true }
}

on frame {
    let now_loading = time.now().state == time.State.Loading
    if now_loading != loading {
        loading = now_loading
        if running { say(if loading { "pausegametime" } else { "unpausegametime" }) }
    }
}

hook before GameSceneFunction::requestPowerStarGetDemo() { if running { say("split") } }
hook before GameSceneFunction::requestGrandStarGetDemo() { if running { say("split") } }
hook before GameSceneFunction::requestStaffRoll() { if running { say("split"); running = false } }
on option port { link?.close(); connect() }
```

| Hook or handler                                            | The moment                                                                                                                       | What the mod does                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `hook after GameScene::startStagePlayFirst()`              | After the game starts play in a stage for the first time                                                                         | Starts the timer, once per run                                        |
| `on frame`                                                 | Every frame: `time.now().state` says what the game is doing, and `time.State.Loading` means it's building or taking down a scene | When loading starts or stops, pauses or resumes LiveSplit's game time |
| `hook before GameSceneFunction::requestPowerStarGetDemo()` | Just before the "star got" scene of a Power Star                                                                                 | Splits                                                                |
| `hook before GameSceneFunction::requestGrandStarGetDemo()` | The same for a Grand Star                                                                                                        | Splits                                                                |
| `hook before GameSceneFunction::requestStaffRoll()`        | Just before the staff roll                                                                                                       | The last split; the run is over                                       |
| `on option port`                                           | The player changes the port on the Mods screen                                                                                   | Closes the link and connects again on the new port                    |

The `on frame` handler compares this frame's state with the last frame's (kept in `loading`), so it sends one line when loading starts and one when it ends, not one every frame. `on frame` runs on every frame presented, loading screens included.

These hooks don't `skip`, so the game does exactly what it would without the mod. Another mod hooking the same functions (a ghost or a leaderboard mod, say) runs as well; neither gets in the other's way.

## Check, build, pack and try

```sh
lumalink check livesplit-link
lumalink build livesplit-link
lumalink pack livesplit-link
```

See [Check, build, pack and run](start/workflow.md) for the options these commands take and the faster edit loop with `lumalink run`.

Start LiveSplit and its server first. Then install `livesplit-link.luma` and switch it on: the game asks whether to allow the local-network permission. Start a stage, and LiveSplit's timer starts.

If nothing happens, open the mod log: a closed link writes `LiveSplit link closed: ...` with the reason. If LiveSplit wasn't running when the mod started, change the port option on the Mods screen (or switch the mod off and on) to connect again.

## The complete file

```lumascript source/main.lum
use svc.net.local
use svc.time
use svc.system

option port: int                  // default 16834
option use_pipe: bool             // Windows: LiveSplit's pipe instead of TCP

var link: net.local.Stream? = none
var running = false
var loading = false

on start { connect() }

fn connect() {
    link = if use_pipe and system.facts().platform == system.Platform.Windows {
        net.local.ipc_connect("LiveSplit")
    } else {
        net.local.tcp_connect("127.0.0.1", port as u16)
    }
}

on net.local.closed(s, why) {
    if same(s, link) { link = none; log "LiveSplit link closed: {why}; retrying in 5 s"; start retry() }
}
task retry() { wait 5 seconds; connect() }

fn say(line: text) { link?.send("{line}\r\n".bytes()) }

hook after GameScene::startStagePlayFirst() {
    if not running { say("starttimer"); running = true }
}

on frame {
    let now_loading = time.now().state == time.State.Loading
    if now_loading != loading {
        loading = now_loading
        if running { say(if loading { "pausegametime" } else { "unpausegametime" }) }
    }
}

hook before GameSceneFunction::requestPowerStarGetDemo() { if running { say("split") } }
hook before GameSceneFunction::requestGrandStarGetDemo() { if running { say("split") } }
hook before GameSceneFunction::requestStaffRoll() { if running { say("split"); running = false } }
on option port { link?.close(); connect() }
```

## In depth: what the network service guarantees

- **Nothing blocks.** Connecting, sending and closing return at once. What happens later (connected, data, closed, an error) arrives as an event at the start of a frame, on the game thread.
- **Bytes go in order.** `send` copies your bytes and sends them in the order you sent them.
- **Limits.** A mod may have 16 connections and listeners open, and 4 MiB queued to send over all of them.
- **Closing.** After `close`, no more events come for that connection; bytes already queued are still sent, for up to 10 seconds.
- **A mod that stops.** Every connection it has ends at once.

See [Network](services/net.md) for the full rules.

## Ideas to extend it

- **Split only on Grand Stars.** Remove the `requestPowerStarGetDemo` hook, and only Grand Stars and the staff roll split.
- **Talk to another tool.** Any program on this machine or your local network that listens on TCP can be reached the same way, with `net.local.tcp_connect` and the `net.local` permission.

## See also

- [Network service](services/net.md), [Time service](services/time.md) and [System service](services/system.md)
- [Permissions](start/permissions.md)
- [Hooking the game's functions](lumascript/hooks.md)
- [Lifecycle, options and frames](lumascript/events.md)
- [Online leaderboard](tutorials/online-leaderboard.md), which uses the internet

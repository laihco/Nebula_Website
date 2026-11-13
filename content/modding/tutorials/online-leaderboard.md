---
title: 'Tutorial: an online leaderboard'
nav_title: Online leaderboard
description: Time every star, send the time to a leaderboard server over HTTPS, and show the top times in a pause-menu screen.
order: 7
level: intermediate
---

This tutorial makes a mod that times how long each star takes, sends the time to a leaderboard server on the internet, and adds a pause-menu entry that shows the best times for the star you're playing. It's your first mod that uses the internet, waits on web requests, asks the player to type, and saves a value.

> [!PLANNED]
> Three parts of this tutorial are not built yet, so the mod as written builds once they are:
>
> - LumaKit's `screen` and `menu` modules (written, not yet in the LumaKit library you can install);
> - text entry with the platform's keyboard (`input.text`, Step 4);
> - the short, waited form of HTTP requests used here (`use svc.net.http`, then `wait http.get(...)` and `wait http.post(...)` giving a reply with `status` and `body`, and `net.url_escape`). As built, HTTP is the `http` operation of the `net.internet` service, which delivers its answer as HEADERS, DATA and DONE events; see [Network](services/net.md#http-requests) for the exact calls.
>
> The permission, the JSON, the saved name, the timing and the screen logic below are as they will be.

## What you'll build

- Every attempt at a star is timed from the moment play starts in the stage to the moment the star is got.
- The first time a star is got, the game asks the player for a name (up to 16 characters) on the platform's keyboard. The name is saved, so it's asked only once.
- Each time is sent to the server as JSON.
- A **Leaderboard** entry in the pause menu opens a screen listing the server's top times for the current star.

You'll need a server that answers two requests; the mod's side of that contract is in [Step 6](tutorials/online-leaderboard.md#step-6-the-server-s-side).

## What you'll learn

- How to declare `net.internet` with the hosts your mod talks to, and what the player sees.
- How to send an HTTP request and `wait` for its answer in a task.
- How to turn values into JSON with `json.encode`, and JSON back into your own struct types with `json.decode<T>`.
- How to ask the player for text with `input.text`, and handle them cancelling.
- How to keep a value across play sessions with the `save` service.
- How to add a pause-menu entry and show a list screen that updates when the answer arrives.

## Before you start

- Finish [LiveSplit link](tutorials/livesplit-link.md): it explains permissions, services and hooks on the star moments.
- Read [Tasks, states and wait](lumascript/tasks.md).

## The mod's folder

```text
leaderboard/
  luma.json
  source/
    main.lum
```

The screen titles and messages (`Menu.Leaderboard`, `Board.AskName`, `Board.Title`, `Board.Loading`, `Board.Unreachable`) are text rows of the mod, in each language you support.

## Step 1: luma.json

```json luma.json
{
  "format": "1.0",
  "id": "you.leaderboard",
  "version": "1.0.0",
  "name": "Star leaderboard",
  "summary": "Sends your star times to a leaderboard and shows the best.",
  "authors": ["you"],
  "game": { "id": "RMG" },
  "needs": [{ "id": "lumakit", "version": "^1" }],
  "options": [
    {
      "key": "server",
      "kind": "text",
      "default": "https://example.invalid/board",
      "max_length": 256,
      "name": "Leaderboard server"
    }
  ],
  "permissions": [
    {
      "name": "net.internet",
      "hosts": ["example.invalid"],
      "why": "Sends your star times to the leaderboard and shows the best."
    }
  ]
}
```

- **`net.internet` and its `hosts`.** The internet permission must list the hosts the mod connects to. The player sees them: "Connects to the internet: example.invalid". The mod can reach those hosts and no others: a request to a host that isn't listed is refused, and the mod log says so. Replace `example.invalid` with your server's host. A list entry may also be `*.example.org` (any name under that domain, but not the domain itself) or `*` (anything, which the player sees as "any address"). At most 32 hosts.
- **The `server` option.** A `text` option the player can change on the Mods screen, with the default your server's address. A `text` option needs `max_length`. Because the hosts are fixed in `luma.json`, a player who types another host gets a refusal, not a connection to it.
- **`needs`** lists LumaKit for `kit.screen` and `kit.menu`.

## Step 2: services, state and the pause entry

```lumascript source/main.lum
use svc.net.http
use svc.input
use svc.save.global
use svc.time
use kit.screen
use kit.menu

option server: text

struct Entry { name: text, frames: u32 }
var name: text? = none
var started: u64 = 0

on start {
    name = save.global.get<text>("name")
    menu.add_pause_entry(text "Menu.Leaderboard", show_board)
}
```

- `struct Entry` is one row of the leaderboard: a name and a time in frames. You'll decode the server's answer straight into a list of them.
- `name` is the player's leaderboard name, or `none` until they've chosen one. `started` is the frame the current attempt began.
- In `on start`, `save.global.get<text>("name")` reads the name saved by an earlier session: a `text`, or `none` if it was never set. `save.global` holds values that belong to your mod across every save file, so the player has one leaderboard name whichever file they play. See [Saves](services/save.md).
- `menu.add_pause_entry(label, on_choose)` adds an entry to the game's pause menu. When the player chooses it, LumaKit calls `show_board`. Entries of several mods are listed in the order of the player's mod list. See [LumaKit: menu](lumakit/menu.md).

## Step 3: timing a star

```lumascript
hook after GameScene::startStagePlayFirst() { started = time.now().frame }

hook before GameSceneFunction::requestPowerStarGetDemo() {
    start submit("{MR::getCurrentStageName()}/{MR::getCurrentScenarioNo()}", (time.now().frame - started) as u32)
}
```

- When play starts in a stage, the mod notes the current frame number: `time.now()` describes the current frame, and its `frame` field counts the frames presented since the game started.
- Just before the "star got" scene, the time is the frames since then. The star is named by the stage and the scenario (which star of the galaxy), for example `EggStarGalaxy/1`, using the game's own `MR::getCurrentStageName` and `MR::getCurrentScenarioNo`.
- A hook can't wait, and sending takes a while, so the hook starts the `submit` task and returns. The game's star scene goes on as normal.

The time counts frames. At 60 frames a second, `format_time` (Step 5) turns it into minutes, seconds and hundredths.

## Step 4: sending the time

```lumascript
task submit(star: text, frames: u32) {
    if name == none {
        let chosen = wait input.text(text "Board.AskName", max_chars: 16)   // the platform's keyboard
        guard let n = chosen else { return }                                // the player cancelled
        name = n
        save.global.set("name", n)
    }
    let reply = wait http.post("{server}/submit", json.encode({ "star": star, "name": name!, "frames": frames }),
                               headers: { "Content-Type": "application/json" })
    if reply.status != 200 { log "leaderboard: {reply.status} {reply.text()}" }
}
```

**Asking for a name, once.** If there's no name yet, `input.text` shows the platform's keyboard with the prompt `Board.AskName`, at most 16 characters. `wait` pauses the task until the player is done. The answer is `none` if they cancelled: `guard let n = chosen else { return }` then ends the task, and this time isn't sent. Otherwise the name is kept in `name` and saved with `save.global.set`, so it's never asked again. Global values don't wait for the game to save: they're written to disk at the end of the frame you set them.

**The request.** `http.post(url, body, headers:)` sends an HTTPS POST and `wait` gives its reply:

- The URL is the `server` option with `/submit` after it.
- The body is JSON. `json.encode` turns the map literal into `{"star": "...", "name": "...", "frames": ...}`. `name!` means "the value of `name`, which must not be `none` here": it's been set just above. (If it were `none`, that would be a script error.)
- `headers:` adds `Content-Type: application/json`. The service adds the rest itself (`Host`, `Content-Length`, a `User-Agent` naming the game and your mod).

**The reply.** `reply.status` is the HTTP status. Anything but 200 is written to the mod log with the reply's text, so you can see what the server said.

> [!NOTE]
> Requests have a time limit (30 seconds by default), follow up to five redirects, and never go from `https` to `http`. A mod may have 8 requests open at once. See [Network](services/net.md).

## Step 5: the leaderboard screen

```lumascript
fn show_board() { start board("{MR::getCurrentStageName()}/{MR::getCurrentScenarioNo()}") }

task board(star: text) {
    let s = screen.list(screen.List { title: text "Board.Title", rows: [text "Board.Loading"] })
    let reply = wait http.get("{server}/top?star={net.url_escape(star)}")
    guard reply.status == 200, let top = json.decode<list<Entry>>(reply.body) else {
        s.set_rows([text "Board.Unreachable"])
        return
    }
    s.set_rows(top.indexed().map(fn(p: (int, Entry)) -> text {
        return "{p.0 + 1}. {p.1.name}  {format_time(p.1.frames)}"
    }))
}

fn format_time(frames: u32) -> text {
    let cs = frames * 100 / 60
    return "{cs / 6000}:{pad2(cs / 100 % 60)}.{pad2(cs % 100)}"
}
fn pad2(n: u32) -> text { return if n < 10 { "0{n}" } else { "{n}" } }
```

1. `show_board` is what the pause entry calls. It starts the `board` task for the current star.
2. `screen.list` opens a list screen at once, with one row saying "loading", and gives back a `ListScreen` handle `s`. The player sees something straight away.
3. `http.get` asks the server for the top times. `net.url_escape(star)` makes the star's name safe inside a URL.
4. `guard` checks two things in order: the status is 200, and the body decodes as a `list<Entry>`. `json.decode<T>` gives `none` when the data doesn't fit the type. If either fails, the screen's rows change to "unreachable" and the task ends.
5. Otherwise `top.indexed()` pairs each entry with its position, as tuples `(int, Entry)`; `p.0` is the position and `p.1` the entry. `map` turns each into a line like `1. Luma  1:23.45`, and `s.set_rows` replaces the screen's rows while it's open.

`format_time` converts frames to hundredths of a second (`cs`), then prints minutes, seconds and hundredths. `pad2` adds a leading zero below 10. `if ... { } else { }` is an expression here, so `pad2` returns its value.

## Step 6: the server's side

The mod expects a server at the `server` address that answers:

| Request                        | Body or query                                         | Answer                                                                        |
| ------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `POST <server>/submit`         | JSON `{"star": text, "name": text, "frames": number}` | Status 200 when stored                                                        |
| `GET <server>/top?star=<star>` | The star, escaped                                     | Status 200 and a JSON array of `{"name": text, "frames": number}`, best first |

How `json.decode` reads the array: each object's `name` and `frames` fill an `Entry`; extra keys are skipped. If a field is missing, the whole decode is `none` and the screen shows "unreachable".

## Check, build, pack and try

```sh
lumalink check leaderboard
lumalink build leaderboard
lumalink pack leaderboard
```

See [Check, build, pack and run](start/workflow.md) for the options these commands take and the faster edit loop with `lumalink run`.

Install LumaKit and `leaderboard.luma` and switch both on. The game asks the player to allow the internet permission and shows its hosts. Get a star, type a name, then open the pause menu and choose **Leaderboard**. Read the mod log for any `leaderboard:` line.

## The complete file

```lumascript source/main.lum
use svc.net.http
use svc.input
use svc.save.global
use svc.time
use kit.screen
use kit.menu

option server: text

struct Entry { name: text, frames: u32 }
var name: text? = none
var started: u64 = 0

on start {
    name = save.global.get<text>("name")
    menu.add_pause_entry(text "Menu.Leaderboard", show_board)
}

hook after GameScene::startStagePlayFirst() { started = time.now().frame }

hook before GameSceneFunction::requestPowerStarGetDemo() {
    start submit("{MR::getCurrentStageName()}/{MR::getCurrentScenarioNo()}", (time.now().frame - started) as u32)
}

task submit(star: text, frames: u32) {
    if name == none {
        let chosen = wait input.text(text "Board.AskName", max_chars: 16)   // the platform's keyboard
        guard let n = chosen else { return }                                // the player cancelled
        name = n
        save.global.set("name", n)
    }
    let reply = wait http.post("{server}/submit", json.encode({ "star": star, "name": name!, "frames": frames }),
                               headers: { "Content-Type": "application/json" })
    if reply.status != 200 { log "leaderboard: {reply.status} {reply.text()}" }
}

fn show_board() { start board("{MR::getCurrentStageName()}/{MR::getCurrentScenarioNo()}") }

task board(star: text) {
    let s = screen.list(screen.List { title: text "Board.Title", rows: [text "Board.Loading"] })
    let reply = wait http.get("{server}/top?star={net.url_escape(star)}")
    guard reply.status == 200, let top = json.decode<list<Entry>>(reply.body) else {
        s.set_rows([text "Board.Unreachable"])
        return
    }
    s.set_rows(top.indexed().map(fn(p: (int, Entry)) -> text {
        return "{p.0 + 1}. {p.1.name}  {format_time(p.1.frames)}"
    }))
}

fn format_time(frames: u32) -> text {
    let cs = frames * 100 / 60
    return "{cs / 6000}:{pad2(cs / 100 % 60)}.{pad2(cs % 100)}"
}
fn pad2(n: u32) -> text { return if n < 10 { "0{n}" } else { "{n}" } }
```

## Ideas to extend it

- **Time retries too.** Add `hook after GameScene::startStagePlayRetry() { started = time.now().frame }`, as [the ghost time trial](tutorials/ghost-time-trial.md) does, so a retried attempt starts its own clock.
- **Show your own time on screen.** LumaKit's [hud](lumakit/hud.md) puts a timer in a corner: `hud.timer(hud.Corner.TopRight)`.
- **Choose from the list.** `screen.List` takes `on_choose: fn(int)`, called with the chosen row's index, and `closes: true` to close it then. See [LumaKit: screen](lumakit/screen.md).

## See also

- [Network service](services/net.md), [Saves](services/save.md) and [Input](services/input.md)
- [LumaKit: screen](lumakit/screen.md) and [LumaKit: menu](lumakit/menu.md)
- [Permissions](start/permissions.md)
- [Tasks, states and wait](lumascript/tasks.md)
- [Types and values](lumascript/types.md), for tuples, `?` and `!`

---
title: 'Tutorial: a ghost time trial with a replay viewer'
nav_title: Ghost time trial
description: Record every attempt at a star, race a see-through ghost of your best run, and play back saved runs with a free camera.
order: 8
level: advanced
---

This tutorial builds a time-trial mod. Every attempt at a star is recorded; your best run for each star is kept in a file, and on your next attempt a see-through Mario runs it beside you, with a timer on screen. A pause-menu entry lists every saved run and plays any of them back with a free camera, at speeds from 1/8 to 8 times.

> [!PLANNED]
> This tutorial uses the LumaKit modules `replay`, `hud`, `menu`, `screen` and `camera`, which are written but not yet part of the LumaKit library you can install, so the code builds once they are. The `draw` service's opacity call may still change before release; see [Draw](services/draw.md).

## What you'll build

- **Recording.** From the moment play starts in a stage (or restarts after a retry), the player's pose, animation and form are recorded every frame.
- **Best times.** When a star is got, the run is written to a file. If it's faster than the best for that star, it becomes the new best, and the list of bests is written to `bests.json`.
- **The ghost.** On the next attempt at that star, a puppet of Mario at 45% opacity runs the best attempt, frame for frame, with a timer in the top-right corner.
- **The viewer.** A **Replays** entry in the pause menu lists the saved runs. Choosing one plays it back: right and left on the +Control Pad (until the player rebinds them) double or halve the speed, and B ends it.

## What you'll learn

- How LumaKit's `replay` records a track, encodes it to bytes, decodes it, and poses a puppet from it.
- How to read and write files in your mod's own data folder with the `fs` service, and why each file call is waited in a task.
- How to keep a `map` of your own structs as JSON on disk.
- How `guard let`, `?.` and `??` keep code short when values may be missing.
- How to run a small interactive player in a task, frame by frame, with a free camera, a HUD line and controls of its own.

## Before you start

- Finish [Online leaderboard](tutorials/online-leaderboard.md), which times stars with the same hooks and decodes JSON into structs.
- Read [Tasks, states and wait](lumascript/tasks.md) and [Memory and lifetimes](lumascript/memory.md).
- You need a model for the ghost, `MarioGhost` (Mario's model with the ghost's own look), and text rows for `Menu.Replays`, `Replays.Title` and `Replays.Unreadable`.

## The mod's folder

```text
ghost-trial/
  luma.json
  source/
    main.lum
  layers/
    base/
      assets/
        MarioGhost.glb
```

The runs themselves aren't in the mod's folder. They're written at run time to the mod's own _data folder_, which the game makes the first time the mod writes a file there.

## Step 1: luma.json

```json luma.json
{
  "format": "1.0",
  "id": "you.ghost-trial",
  "version": "1.0.0",
  "name": "Ghost time trial",
  "summary": "Race a ghost of your best run at every star, and watch your runs again.",
  "authors": ["you"],
  "game": { "id": "RMG" },
  "needs": [{ "id": "lumakit", "version": "^1" }],
  "options": [
    { "key": "replay_faster", "kind": "key", "default": "dpad_right", "name": "Replay: faster" },
    { "key": "replay_slower", "kind": "key", "default": "dpad_left", "name": "Replay: slower" },
    { "key": "replay_stop", "kind": "key", "default": "b", "name": "Replay: stop" }
  ]
}
```

The three `key` options are the replay viewer's controls: _actions_ the player finds, and can rebind, on the game's Controls page. Each follows its `default` game control until then. See [Input](services/input.md).

No permission is needed: the `fs` service reads and writes the mod's own data folder freely. Only the shared Exchange folder, which the player and other mods can open, needs one (`fs.exchange`). See [Files](services/files.md).

## Step 2: what the mod remembers

```lumascript source/main.lum
use kit.replay
use kit.hud
use kit.menu
use kit.screen
use kit.camera
use svc.fs
use svc.time
use svc.draw
use svc.input

option replay_faster: input.Action      // key options: the player binds them in Controls
option replay_slower: input.Action
option replay_stop: input.Action

struct Best { frames: u32, file: text }

var bests: map<text, Best> = {}          // "<stage>/<scenario>" -> best
var recorder: replay.Recorder? = none
var ghost: replay.Puppet? = none
var ghost_track: replay.Track? = none
var timer: hud.Timer? = none
var attempt_start: u64 = 0

fn key() -> text { return "{MR::getCurrentStageName()}/{MR::getCurrentScenarioNo()}" }
```

| State                  | What it holds                                                                |
| ---------------------- | ---------------------------------------------------------------------------- |
| `bests`                | For each star, by its key, the best time in frames and the file of that run. |
| `recorder`             | The recording of the current attempt, while one runs.                        |
| `ghost`, `ghost_track` | The ghost puppet and the track it follows.                                   |
| `timer`                | The HUD timer of the current attempt.                                        |
| `attempt_start`        | The frame the attempt began.                                                 |

All of them are _handles_ or plain values, never views, so they can be kept from frame to frame. LumaKit's handles (`Recorder`, `Puppet`, `Timer`) are small values you can copy; `remove()` or `end()` on one may be called any number of times.

`key()` names the current star, as in the leaderboard: the stage's name and the scenario number, for example `EggStarGalaxy/1`.

## Step 3: load the bests when the mod starts

```lumascript
on start {
    if let data = wait fs.read("bests.json") { bests = json.decode<map<text, Best>>(data) ?? {} }
    menu.add_pause_entry(text "Menu.Replays", open_viewer)
}
```

**Reading a file.** `fs.read(path)` asks for a file of the mod's data folder. Every `fs` call is a request: it's done on a worker thread and answered at the start of a frame, so the game never waits on the disk. `wait` gives the answer: the file's bytes, or `none` if there's no such file yet (the very first start). `on start` may wait; the compiler turns it into a task.

**Decoding.** `json.decode<map<text, Best>>(data)` reads the bytes as a map of `Best` structs. It's `none` if the file isn't one, and `?? {}` then gives an empty map, so a damaged file never stops the mod.

**The menu entry.** `menu.add_pause_entry` adds **Replays** to the pause menu; choosing it calls `open_viewer` (Step 7).

## Step 4: start an attempt

```lumascript
hook after GameScene::startStagePlayFirst() { begin_attempt() }
hook after GameScene::startStagePlayRetry() { begin_attempt() }

fn begin_attempt() {
    recorder?.discard()
    timer?.remove()
    ghost?.remove()
    recorder = replay.record(replay.What.Player)        // pose, animation, form, every frame
    attempt_start = time.now().frame
    timer = hud.timer(hud.Corner.TopRight)
    ghost = none
    if let best = bests.get(key()) { start load_ghost(best.file) }
}

task load_ghost(file: text) {
    guard let data = wait fs.read(file) else { return }
    ghost_track = replay.Track.decode(data)
    let p = replay.puppet(model "MarioGhost")      // Mario's model, the ghost's own look
    draw.opacity(p.view(), 0.45)
    ghost = p
}
```

An attempt starts when play starts in a stage, and again on a retry.

1. First it clears what the last attempt left: `?.` calls `discard` or `remove` only when there is one.
2. `replay.record(replay.What.Player)` starts recording the player every frame: pose, animation and form.
3. It notes the start frame and puts a timer in the top-right corner with `hud.timer`.
4. If there's a best run for this star (`bests.get(key())` gives a `Best?`), it starts `load_ghost` to read it. Reading a file is waited, and a hook or function can't wait, so this part is a task.

In `load_ghost`, `guard let ... else { return }` ends the task if the file is gone. `replay.Track.decode` turns the bytes back into a track (`none` if they aren't one). `replay.puppet(model)` makes a puppet: a model with Mario's animations, posed from data and lit like the player. `draw.opacity(p.view(), 0.45)` makes it see-through; `p.view()` is the puppet's object, for calls that want one.

The ghost may appear a frame or two after the attempt starts. That doesn't matter: it's posed by the frame count since `attempt_start` (next step), so it's always in step.

## Step 5: every frame, the timer and the ghost

```lumascript
on frame {
    if let t = timer { t.set(time.now().frame - attempt_start) }
    if let p = ghost, let track = ghost_track {
        p.pose(track, (time.now().frame - attempt_start) as u32)  // hides itself past the end
    }
}
```

- The timer shows the frames since the attempt began. `time.now()` describes the current frame; its `frame` counts the frames presented since the game started.
- `if let p = ghost, let track = ghost_track` runs only when both exist. `p.pose(track, frame)` puts the ghost in the pose it had at that frame of the best run. Past the end of the track, the puppet hides itself.

## Step 6: the star is got

```lumascript
hook before GameSceneFunction::requestPowerStarGetDemo() {
    guard let rec = recorder else { return }
    let track = rec.stop()
    recorder = none
    start save_run(key(), track, (time.now().frame - attempt_start) as u32)
}

task save_run(star: text, track: replay.Track, frames: u32) {
    let file = "runs/{star}/{time.wall().utc_ns}.replay"
    wait fs.write(file, track.encode())
    if (bests.get(star)?.frames ?? u32.max) > frames {
        bests[star] = Best { frames, file }
        wait fs.write("bests.json", json.encode(bests).bytes())
    }
}

hook before GameScene::requestStartGameOverDemo() { recorder?.discard(); recorder = none }
```

**Stopping.** Just before the star scene, `rec.stop()` ends the recording and gives the `Track`. The hook works out the star's key and the time _now_, then hands the writing to a task.

**Writing the run.** `track.encode()` gives the track as bytes, which `fs.write` writes to `runs/<stage>/<scenario>/<time>.replay` in the data folder, making the folders on the way. The file is named by `time.wall().utc_ns`, the real time in nanoseconds, so each run gets its own name. A write is atomic: a file is either the old one or the whole new one, never half written.

**A new best?** `bests.get(star)?.frames` is the best time so far, or `none` when there isn't one; `?? u32.max` makes "no best yet" the largest possible time, so any run beats it. The brackets matter: `??` binds more loosely than `>`. If the run is faster, it becomes the best and `bests.json` is written again: `json.encode` gives text, and `.bytes()` its bytes for the file.

**Game over.** If the player gets a game over, the recording is thrown away.

> [!NOTE]
> A mod's data folder holds at most 256 MiB, and a file at most 64 MiB. A mod may have 32 file requests open at once. See [Files](services/files.md).

## Step 7: the list of saved runs

```lumascript
fn open_viewer() { start show_runs() }

task show_runs() {
    guard let listing = wait fs.list("runs", 1) else { return }
    let files = listing.split("\n").filter(fn(f: text) -> bool { return f.ends_with(".replay") })
    screen.list(screen.List {
        title: text "Replays.Title"
        rows: files
        on_choose: fn(i: int) { start play_back("runs/{files[i]}") }
    })
}
```

`fs.list(path, recursive)` lists a folder of the data folder; `recursive` 1 lists everything inside it too. Its answer is text: one line per file or folder, paths from the folder you asked for, folders ending in `/`, sorted. `split("\n")` makes a list of lines, and `filter` keeps the replay files.

`screen.list` shows them as a list screen. When the player chooses a row, LumaKit calls `on_choose` with the row's index; the closure starts playback of that file. (The closure keeps `files`, a list of texts, which is fine to keep for later.) See [LumaKit: screen](lumakit/screen.md).

## Step 8: playing a run back

```lumascript
task play_back(file: text) {
    guard let data = wait fs.read(file), let track = replay.Track.decode(data) else {
        wait screen.message(text "Replays.Unreadable")
        return
    }
    start viewer(track)
}

task viewer(track: replay.Track) {
    let p = replay.puppet(model "MarioGhost")
    let cam = camera.free()                       // a mod camera (kit.camera), moved with the stick
    var frame: f32 = 0.0
    var speed: f32 = 1.0
    let bar = hud.text(hud.Corner.Bottom, "")
    while frame < track.frames as f32 {
        p.pose(track, frame as u32)
        if input.read(replay_faster).pressed == 1 { speed = min(speed * 2.0, 8.0) }
        if input.read(replay_slower).pressed == 1 { speed = max(speed / 2.0, 0.125) }
        if input.read(replay_stop).pressed == 1 { break }
        bar.set("{speed}x  {frame as u32} / {track.frames}")
        frame += speed
        wait 1 frames
    }
    cam.end(); p.remove(); bar.remove()
}
```

`play_back` reads and decodes the file; `guard` checks both, and shows a message screen if either fails.

`viewer` is a small player that runs one step per frame:

- `camera.free()` takes the main camera as a free camera moved with the sticks, until `cam.end()` gives it back. If another mod takes the camera meanwhile, the newest holds it, and yours holds it again when theirs ends.
- `hud.text(hud.Corner.Bottom, "")` is a line of text at the bottom of the screen, changed each frame with `set`.
- `frame` is a float so the speed can be a fraction: at 0.5 the same pose shows for two frames, at 2 every other pose is skipped. `min` and `max` keep the speed between 1/8 and 8.
- `input.read(action).pressed` is 1 on the frame an action goes down; a press shorter than a frame is never lost. The stop action leaves the loop with `break`.
- `wait 1 frames` ends this frame's step. When the loop ends, the camera, puppet and text are all removed.

## Check, build, pack and try

```sh
lumalink check ghost-trial
lumalink build ghost-trial
lumalink pack ghost-trial
```

See [Check, build, pack and run](start/workflow.md) for the options these commands take. Install LumaKit and `ghost-trial.luma` and switch both on. Get a star once, then try it again: the ghost runs your first attempt. Open the pause menu and choose **Replays** to watch a run.

## The complete file

```lumascript source/main.lum
use kit.replay
use kit.hud
use kit.menu
use kit.screen
use kit.camera
use svc.fs
use svc.time
use svc.draw
use svc.input

option replay_faster: input.Action      // key options: the player binds them in Controls
option replay_slower: input.Action
option replay_stop: input.Action

struct Best { frames: u32, file: text }

var bests: map<text, Best> = {}          // "<stage>/<scenario>" -> best
var recorder: replay.Recorder? = none
var ghost: replay.Puppet? = none
var ghost_track: replay.Track? = none
var timer: hud.Timer? = none
var attempt_start: u64 = 0

fn key() -> text { return "{MR::getCurrentStageName()}/{MR::getCurrentScenarioNo()}" }

on start {
    if let data = wait fs.read("bests.json") { bests = json.decode<map<text, Best>>(data) ?? {} }
    menu.add_pause_entry(text "Menu.Replays", open_viewer)
}

hook after GameScene::startStagePlayFirst() { begin_attempt() }
hook after GameScene::startStagePlayRetry() { begin_attempt() }

fn begin_attempt() {
    recorder?.discard()
    timer?.remove()
    ghost?.remove()
    recorder = replay.record(replay.What.Player)        // pose, animation, form, every frame
    attempt_start = time.now().frame
    timer = hud.timer(hud.Corner.TopRight)
    ghost = none
    if let best = bests.get(key()) { start load_ghost(best.file) }
}

task load_ghost(file: text) {
    guard let data = wait fs.read(file) else { return }
    ghost_track = replay.Track.decode(data)
    let p = replay.puppet(model "MarioGhost")      // Mario's model, the ghost's own look
    draw.opacity(p.view(), 0.45)
    ghost = p
}

on frame {
    if let t = timer { t.set(time.now().frame - attempt_start) }
    if let p = ghost, let track = ghost_track {
        p.pose(track, (time.now().frame - attempt_start) as u32)  // hides itself past the end
    }
}

hook before GameSceneFunction::requestPowerStarGetDemo() {
    guard let rec = recorder else { return }
    let track = rec.stop()
    recorder = none
    start save_run(key(), track, (time.now().frame - attempt_start) as u32)
}

task save_run(star: text, track: replay.Track, frames: u32) {
    let file = "runs/{star}/{time.wall().utc_ns}.replay"
    wait fs.write(file, track.encode())
    if (bests.get(star)?.frames ?? u32.max) > frames {
        bests[star] = Best { frames, file }
        wait fs.write("bests.json", json.encode(bests).bytes())
    }
}

hook before GameScene::requestStartGameOverDemo() { recorder?.discard(); recorder = none }

fn open_viewer() { start show_runs() }

task show_runs() {
    guard let listing = wait fs.list("runs", 1) else { return }
    let files = listing.split("\n").filter(fn(f: text) -> bool { return f.ends_with(".replay") })
    screen.list(screen.List {
        title: text "Replays.Title"
        rows: files
        on_choose: fn(i: int) { start play_back("runs/{files[i]}") }
    })
}

task play_back(file: text) {
    guard let data = wait fs.read(file), let track = replay.Track.decode(data) else {
        wait screen.message(text "Replays.Unreadable")
        return
    }
    start viewer(track)
}

task viewer(track: replay.Track) {
    let p = replay.puppet(model "MarioGhost")
    let cam = camera.free()                       // a mod camera (kit.camera), moved with the stick
    var frame: f32 = 0.0
    var speed: f32 = 1.0
    let bar = hud.text(hud.Corner.Bottom, "")
    while frame < track.frames as f32 {
        p.pose(track, frame as u32)
        if input.read(replay_faster).pressed == 1 { speed = min(speed * 2.0, 8.0) }
        if input.read(replay_slower).pressed == 1 { speed = max(speed / 2.0, 0.125) }
        if input.read(replay_stop).pressed == 1 { break }
        bar.set("{speed}x  {frame as u32} / {track.frames}")
        frame += speed
        wait 1 frames
    }
    cam.end(); p.remove(); bar.remove()
}
```

## Ideas to extend it

- **The same random numbers every run.** `replay.seed(n)` sets the game's random numbers from `n` at the next stage start, so a recording and its playback start from the same state.
- **Share runs with the leaderboard.** Combine this mod with [the leaderboard](tutorials/online-leaderboard.md): both hook `requestPowerStarGetDemo` as `before` hooks, neither skips, so both run and both see the star.
- **Rewind.** `replay.rewind(what, seconds)` keeps the last seconds of the player (and chosen actors) so `back(frames)` can take them back. See [LumaKit: replay](lumakit/replay.md).

## See also

- [LumaKit: replay](lumakit/replay.md), [hud](lumakit/hud.md), [camera](lumakit/camera.md), [screen](lumakit/screen.md) and [menu](lumakit/menu.md)
- [Files service](services/files.md) and [Time service](services/time.md)
- [Tasks, states and wait](lumascript/tasks.md)
- [Types and values](lumascript/types.md), for `?`, `?.` and `??`

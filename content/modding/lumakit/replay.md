---
title: 'LumaKit: replay'
nav_title: replay
description: Record the player's or an actor's poses, save and load them as bytes, play them back on puppets, replay recorded inputs frame-exactly, seed the game's random numbers and rewind.
order: 19
level: intermediate
---

`kit.replay` records and plays back movement. It records the player's or an actor's pose every frame (position, rotation, animation and form) into a track you can save as bytes and load on any platform. It poses puppets (models lit as the player is) from a track or from single poses, which is how ghosts and remote players are drawn. It also records the player's inputs and plays them back frame-exactly, seeds the game's random numbers so a run repeats, and rewinds the player and chosen actors.

## Example

From the [ghost time trial tutorial](tutorials/ghost-time-trial.md): each attempt is recorded, and the best attempt runs beside the player as a translucent ghost.

```lumascript source/main.lum
use kit.replay
use svc.fs
use svc.time
use svc.draw

var recorder: replay.Recorder? = none
var ghost: replay.Puppet? = none
var ghost_track: replay.Track? = none
var attempt_start: u64 = 0

hook after GameScene::startStagePlayFirst() { start begin_attempt() }

task begin_attempt() {
    recorder = replay.record(replay.What.Player)        // pose, animation, form, every frame
    attempt_start = time.now().frame
    if let data = wait fs.read("best.replay"), let track = replay.Track.decode(data) {
        ghost_track = track
        let p = replay.puppet(model "MarioGhost")
        draw.opacity(p.view(), 0.45)
        ghost = p
    }
}

on frame {
    if let p = ghost, let track = ghost_track {
        p.pose(track, (time.now().frame - attempt_start) as u32)   // hides itself past the end
    }
}

hook before GameSceneFunction::requestPowerStarGetDemo() {
    guard let rec = recorder else { return }
    recorder = none
    start save_run(rec.stop())
}

task save_run(track: replay.Track) {
    wait fs.write("best.replay", track.encode())
}

hook before GameScene::requestStartGameOverDemo() { recorder?.discard(); recorder = none }
```

## Using it

Add LumaKit to your mod's `needs` in `luma.json` and `use` the module:

```json
"needs": [ { "id": "lumakit", "version": "^1" } ]
```

```lumascript
use kit.replay
```

The module reads the player's pose and the game's random-number state from the game's own fields and hooks, poses puppets with model and animation content, steps the game with the [time service](services/time.md), and plays inputs back through the [input service](services/input.md). It needs no permission of its own.

> [!PLANNED]
> Not every LumaKit call can be made from a mod yet. See [What works today](lumakit/overview.md#what-works-today). `play_inputs` presses the controls as if the player did, which the input service does not offer yet; it is planned there behind its own permission, `input.inject`.

## Interface

```lumascript
pub enum What { Player, Actor(ref<LiveActor>), Inputs }
pub struct Pose {
    at: vec3
    rotation: quat
    action: text
    frame: f32
    form: text?
    fn encode(self) -> bytes
    fn decode(b: bytes) -> Pose?                       // called as replay.Pose.decode(b)
}
pub struct Track {
    frames: u32
    fn encode(self) -> bytes
    fn decode(b: bytes) -> Track?                      // called as replay.Track.decode(b)
    fn pose(self, frame: u32) -> Pose?
}
pub struct Recorder { fn stop(self) -> Track; fn discard(self) }
pub struct Puppet { fn pose(self, t: Track, frame: u32); fn set_pose(self, p: Pose); fn view(self) -> LiveActor;
                    fn remove(self); fn alive(self) -> bool }
pub fn record(w: What) -> Recorder
pub fn current_pose(w: What) -> Pose?
pub fn puppet(look: model) -> Puppet                  // lit as the player (up to 15)
pub fn play_inputs(t: Track) -> pending               // What.Inputs, each frame injected
pub fn seed(n: u32)                                   // the game's random numbers from n
pub struct Rewind { fn back(self, frames: u32) -> u32; fn end(self) }
pub fn rewind(what: list<What>, seconds: f32) -> Rewind
```

## Functions

| Name                    | Description                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `record(w)`             | Starts recording `w` every frame and returns a `Recorder`.                                                                                 |
| `current_pose(w)`       | `w`'s pose now, or `none` when there is no player (on the title screen, while a stage loads, after a death) or the actor's `ref` is empty. |
| `puppet(look)`          | Makes a puppet with the model `look`, lit as the player is. Up to 15 puppets at once.                                                      |
| `play_inputs(t)`        | Plays back a track recorded with `What.Inputs`, pressing the recorded controls each frame. `wait` on it to know when it has finished.      |
| `seed(n)`               | Starts the game's random numbers from `n` at the next stage start, so a recording and its playback start from the same state.              |
| `rewind(what, seconds)` | Keeps the last `seconds` of the player's and the chosen actors' poses, so you can go back. Returns a `Rewind` handle.                      |

### Recorder

| Name        | Description                            |
| ----------- | -------------------------------------- |
| `stop()`    | Stops recording and gives the `Track`. |
| `discard()` | Stops recording and throws it away.    |

### Puppet

| Name             | Description                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `pose(t, frame)` | Poses the puppet as frame `frame` of the track `t`. Past the track's end it hides itself. |
| `set_pose(p)`    | Poses it with one `Pose`, for example one received over the network.                      |
| `view()`         | The puppet's actor, for example for `draw.opacity`.                                       |
| `remove()`       | Removes the puppet. Safe to call more than once; `view()` after it is a script error.     |
| `alive()`        | `true` until it is removed.                                                               |

### Rewind

| Name           | Description                                                                         |
| -------------- | ----------------------------------------------------------------------------------- |
| `back(frames)` | Puts what is rewound back by up to `frames` frames, and returns a number of frames. |
| `end()`        | Stops keeping poses.                                                                |

## Types

### What

| Case       | Records                                |
| ---------- | -------------------------------------- |
| `Player`   | the player's pose, animation and form  |
| `Actor(r)` | the pose of the actor `r`              |
| `Inputs`   | the player's inputs, for `play_inputs` |

### Pose

| Field      | Description                   |
| ---------- | ----------------------------- |
| `at`       | Position.                     |
| `rotation` | Rotation.                     |
| `action`   | The animation playing.        |
| `frame`    | The frame of that animation.  |
| `form`     | The player's form, or `none`. |

`encode()` turns a pose into bytes; `replay.Pose.decode(b)` turns them back, or gives `none` for bytes that are not a pose.

### Track

`frames` is its length. `encode()` and `replay.Track.decode(b)` save and load it as bytes, and `pose(frame)` gives the pose at one frame, or `none` past the end.

## Behaviour and edge cases

- **Exact on the same build.** A track played back on the same game build matches the recording pose for pose. Encoded tracks can be decoded on any platform.
- **Random numbers.** `seed` sets the random numbers the game's play uses. Particles and the sound sequencer have their own random numbers; they change looks and sound, never play, and are not seeded. If two mods seed, the newer seed holds until it ends.
- **Rewinding the whole world is not possible**: rewind covers the player and the actors you list.
- **Inputs replayed** with `play_inputs` bring the player to the same end position as the recorded run.
- **Your mod switched off.** Its recorders stop, its puppets are removed, and a seed it set is undone.

## See also

- [camera](lumakit/camera.md): a free camera for a replay viewer
- [hud](lumakit/hud.md): a timer beside the ghost
- [net.kit](lumakit/net-kit.md): sending poses to other players
- [Files service](services/files.md): saving tracks
- [Tutorial: ghost time trial](tutorials/ghost-time-trial.md)

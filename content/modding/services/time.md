---
title: 'Service: time'
nav_title: time
description: Count frames and world steps, read the real clocks, slow the world down, speed it up or hold it, and set timers.
order: 3
level: essential
---

The `time` service tells your mod where the game is in time: which frame it is drawing, how many steps the world has
run, and the real date and time. It also lets your mod change time itself: run the world in slow motion or fast
forward, hold it still (a photo mode), step it one frame at a time, and set timers.

`time` needs no permission. Code that `wait`s already uses it: the compiler adds the import for you. Write
`use svc.time` yourself when you call its functions.

## Example: timing a run and slow motion on a button

```lumascript source/main.lum
use svc.time
use svc.input

option slow: input.Action           // a "key" option: the player binds it in Controls

var run_start: u64 = 0
var slowed = false

hook after GameScene::startStagePlayFirst() {
    run_start = time.now().frame
}

on frame {
    if input.read(slow).pressed == 1 {
        slowed = not slowed
        time.set_rate(if slowed { 500 } else { 1000 })   // half speed, or real time again
    }
}

hook before GameSceneFunction::requestPowerStarGetDemo() {
    let frames = time.now().frame - run_start
    let d = time.wall()
    log "star in {frames} frames, at {d.hour}:{d.minute}"
}
```

## Frames and steps

The game keeps two counts, and it helps to know which one you want:

- **Frames** are pictures presented to the screen. They go on at the display's rate whatever happens in the game,
  including while the world is held.
- **Steps** are runs of the world: the stage's actors, the camera, the scene's menus. Normally one step runs each
  frame. In slow motion some frames have none; in fast forward a frame has several; while the world is held, none.

`time.now()` gives both, and much more, for the current frame:

| Field of `time.Now` | Meaning                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------- |
| `state`             | What the game is doing: a `time.State` (below)                                          |
| `frame`             | Frames presented since the game started (the first is 1)                                |
| `step`              | World steps since the game started                                                      |
| `steps`             | The world steps this frame runs: 0 while held, 1 in real time, up to 16                 |
| `step_in_frame`     | In `on step`, this step's place in the frame from 0; elsewhere the same as `steps`      |
| `rate`              | The world's rate now, in thousandths (1000 is real time)                                |
| `holders`           | How many mods hold the world now (0: not held)                                          |
| `sound_rate`        | The rate the game's sound follows now, in thousandths; 0 when the world's sound is held |
| `frame_start_ns`    | The monotonic clock at this frame's start, in nanoseconds                               |
| `frame_ns`          | Real time from the previous frame's start to this one's, in nanoseconds                 |

Every field holds for the whole frame, except `step` and `step_in_frame`, which `on step` sees for its own step.

| `time.State` | The game is...                                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Boot`       | before the first scene: the boot scene and the system's files                                                                                |
| `Loading`    | building or taking down a scene                                                                                                              |
| `Play`       | running a scene                                                                                                                              |
| `Menu`       | holding a scene that is up: its pause menu or galaxy map, the HOME Menu, the settings menu, an error window, or the cutscene skip's question |
| `Movie`      | playing a movie                                                                                                                              |
| `Skip`       | running a scene unseen for the cutscene skip                                                                                                 |

To react to loading screens, compare `time.now().state` with `time.State.Loading` in `on frame`.

## Operations

| Name                                                                                           | What it does                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `time.now() -> time.Now`                                                                       | The frame and its world step as the game sees them (above).                                                                          |
| `time.monotonic_ns() -> i64`                                                                   | A steady clock in nanoseconds (at least 1) that never goes back. Callable from any thread.                                           |
| `time.wall() -> time.Wall`                                                                     | The real date and time: UTC and the player's local time. Callable from any thread.                                                   |
| `time.set_rate(rate: u32)`                                                                     | Your mod's share of the world's rate, from the next frame: 1 to 16000 thousandths (500 half speed, 2000 double). 1000 gives it back. |
| `time.hold()`                                                                                  | Your mod holds the world still from the next frame. Holding twice is still one hold.                                                 |
| `time.release()`                                                                               | Your mod lets the world go from the next frame, and any steps it asked for are dropped. Releasing without holding does nothing.      |
| `time.step(count: u32) -> bool`                                                                | While your mod holds the world alone: run `count` (1 to 16) more steps in the next frame. `false` when it could not (below).         |
| `time.timer(clock: time.Clock, after: u64, every: u64, fn(e: time.TimerEvent)) -> time.Timer?` | A timer (see [Timers](#timers)). `none` when it was refused.                                                                         |
| `time.cancel(timer: time.Timer)`                                                               | Ends a timer: nothing more arrives for it.                                                                                           |
| `on frame { }`                                                                                 | Your mod's frame handler: once a frame.                                                                                              |
| `on step { }`, `on step(now: time.Now) { }`                                                    | Your mod's step handler: once per world step.                                                                                        |

`time.Wall` has these fields:

| Field                                     | Meaning                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `utc_ns`                                  | Nanoseconds since 1970-01-01 00:00 UTC                                            |
| `utc_offset_s`                            | Local time minus UTC, in seconds (the player's time zone and daylight saving now) |
| `year`                                    | For example 2026                                                                  |
| `month`, `day`                            | 1 to 12, 1 to 31                                                                  |
| `weekday`                                 | 0 Sunday to 6 Saturday                                                            |
| `hour`, `minute`, `second`, `millisecond` | Local time: 0 to 23, 0 to 59, 0 to 59, 0 to 999                                   |

```lumascript
use svc.time

on start {
    let d = time.wall()
    if d.month == 12 and d.day == 25 { log "Merry Christmas" }
}
```

The service's limits are also constants: `time.REAL` (1000), `time.RATE_LEAST` (1), `time.RATE_MOST` (16000),
`time.STEPS_MOST` (16) and `time.TIMERS_MOST` (64).

## `on frame`, `on step` and `wait`

**`on frame`** runs once per frame presented, at the frame's start, after every mod's service events have been
delivered. Mods run in the Mods list's order (top first). It keeps running while the world is held, so it is the
place for things that must respond even then, such as reading a button that releases a hold. Your mod's tasks run
right after its `on frame`.

**`on step`** runs once per world step, just before the world updates: 0 times in a held frame and up to 16 times in
a fast one. Use it for anything that must keep pace with the world exactly, such as recording a pose every step.
`on step(now: time.Now)` gives you this step's own `step` and `step_in_frame`. It may not `wait` (S0105), and it is
never a task, though it may start one.

A mod has at most one of each: a second `on frame` or `on step` is error S0109. `time.on_frame` and `time.on_step`
are not names you call; writing them is S0108.

**`wait`** in a task counts with these clocks:

| You write                               | It waits for                                                                                                                                                                                                                                                                      |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wait N frames`                         | N frames presented. It goes on while the world is held. `wait 0 frames` resumes at the next frame.                                                                                                                                                                                |
| `wait N seconds`                        | World steps at 60 a second: the nearest whole number of steps to N x 60 (a half rounds up), at least 1 when N is more than 0. It follows the world's rate and stops while the world is held, in the HOME Menu and on a loading screen. `wait 0 seconds` resumes at the next step. |
| `wait until time.monotonic_ns() >= end` | Real time, whatever the world does.                                                                                                                                                                                                                                               |

A literal negative wait is error S0110. A computed one waits 0 and writes S0902 to the mod log once for that wait.
Waits do not use timers, so your 64 timers are all your own.

## Slow motion and pause

Each mod may set a **rate** and a **hold** for the world clock. They take effect from the next frame; nothing changes
inside a frame.

- **The world's rate** is the product of every mod's rate, in thousandths, computed exactly and rounded down once,
  then kept within 1 to 16000. Two mods at 500 and 4000 give 2000. The Mods list's order never changes the result.
- **The world is held** while any mod holds it.
- **Steps in a frame.** At 500 the frames run 0, 1, 0, 1 steps; at 1500, 1, 2, 1, 2. A frame runs at most 16.
- **Stepping.** A mod that holds the world alone may ask for 1 to 16 steps with `time.step`. They all run in the next
  frame. `time.step` is `false` when another mod holds the world too, when the game is in `Boot`, `Loading`, `Movie`
  or `Skip`, or for a count outside 1 to 16. Stepping without holding is a mistake (`Time.NotHeld` in the mod log),
  and so is asking for more than 16 steps owed at once (`Service.Limit`). A literal count outside 1 to 16 is
  error S0111 when you build.

What the world clock moves: the scene, which means play, the game's own menus inside the scene (its pause menu and
galaxy map), the scene's layouts, the camera, and the screen's fade between scenes. It also moves the controls the
scene reads.

What it never moves: the frame itself (the picture is drawn every frame, as under the HOME Menu), the system's
screens (settings menu, HOME Menu, error windows, Nebula's own screens such as the mod log's notice), service events
and `on frame`.

**Controls in slow motion.** Below real time, presses and releases on frames with no step are carried to the next
step, so no tap is lost at any rate. A frame held by a mod or by the game carries none: a press that closed a
screen never reaches the world.

**Sound follows like a tape.** At a rate from 125 to 4000, the game's music, sound effects and voices play at that
speed and pitch. While the world is held, or outside 125 to 4000, the world's sound is held as under the pause menu:
music paused, the game's effects silent, the system's own sounds still playing. Movies' sound is never touched.

**When your settings do not apply.** While the game boots, loads a scene, plays a movie or runs the cutscene skip,
the world runs at 1000 and is not held. What mods set applies again when that ends. While the game holds the scene
itself (HOME Menu, settings menu, a system warning, the skip's question), no step runs.

> [!WARNING]
> The pause menu is part of the scene, so while your mod holds the world the player cannot open it. Always give the
> player a way to let go, such as the same button that started the hold, read in `on frame`.

**The player has the last word.** The Mods page shows each mod's clock (for example `Time: held` or `Time: 2x`) and a
**Let go** row. Let go clears that mod's rate, hold and owed steps from the next frame, and writes the Note
`Time.LetGo` to the mod log. Your mod sees it in `time.now()` (`holders` 0) and may hold again later.

## Timers

A timer calls your closure after a count of frames, world steps or real nanoseconds, once or repeatedly:

```lumascript
use svc.time

var ticker: time.Timer? = none

on start {
    // every 60 world steps; e.value says how many times it came due since the last call
    ticker = time.timer(time.Clock.Steps, 60, 60, fn(e: time.TimerEvent) {
        log "tick x{e.value}"
    })
}

fn stop_ticking() {
    if let t = ticker { time.cancel(t); ticker = none }
}
```

| Parameter | Meaning                                                                                   |
| --------- | ----------------------------------------------------------------------------------------- |
| `clock`   | `time.Clock.Frames`, `time.Clock.Steps` or `time.Clock.Nanoseconds` (the monotonic clock) |
| `after`   | Units from now until it is first due, at least 1                                          |
| `every`   | Units between later calls; 0 for once                                                     |

- A timer counts from the call: frames from that frame, steps from that step count, nanoseconds from that reading.
- Due timers are checked at the frame's start, and your closure runs with your mod's other events, before
  `on frame`. When a timer is due more than once in a frame (its period is shorter than a frame), the closure runs
  once and `e.value` is the count.
- Step timers do not move while the world is held; frame and nanosecond timers do.
- A one-off timer closes after its call. `time.cancel` closes any timer; cancelling one that is already closed is a
  mistake (`Service.Handle`).
- A mod may have 64 timers at once. The 65th is refused (`none`, and `Service.Limit` in the mod log).
- The closure runs later, so it may not keep a view of a game object (S0103). Keep a `ref` instead.
- Timer events go to the closure, never to an `on` handler: `on time.timer` is error S0107.

For a simple delay or a repeat in a script, a task with `wait` is usually simpler, and uses no timer:

```lumascript
task blink() {
    for i in 0..6 {
        log "blink {i}"
        wait 5 frames
    }
}
```

## Edge cases

- **Your mod switched off.** Its rate and hold go, and its owed steps are dropped, from the next frame. Its timers are
  closed with no event, and its handlers stop.
- **Threads.** `time.monotonic_ns()` and `time.wall()` may be called from any thread; everything else from the game
  thread only.
- **The first update after a load** runs even in a held frame and counts as a step, so `step` may grow by 1 in a
  frame whose `steps` is 0.
- **The pause menu in slow motion.** Below real time the scene's pause menu runs only on frames with a step, so its
  cursor moves at that rate too.
- **Deterministic test runs.** In the test harness's deterministic mode, the real clocks follow the frames, so every
  run gives the same times; the wall clock uses a fixed calendar with offset 0. See
  [Writing tests](lumalink/testing.md).
- **Determinism.** The world clock uses integers only: the same mods, list and inputs give the same steps on every
  machine and platform.
- **Cost.** With no mod using `time`, each frame costs the game a few checks.

## Messages in the mod log

| Code | Row            | Text                                                                                          |
| ---- | -------------- | --------------------------------------------------------------------------------------------- |
| 120  | `Time.NotHeld` | `{mod}: {where} works only while the mod holds the game; it did nothing.`                     |
| 121  | `Time.LetGo`   | `{mod}: you set the game back to its normal speed.` (a Note: the player's act, not a mistake) |

Other mistakes use the shared rows of [the overview](services/overview.md#messages-in-the-mod-log): `Service.Argument`
(rate, count, clock, after), `Service.Limit` (64 timers, 16 owed steps) and `Service.Handle`.

## From C

The header is `luma_time.h`; import it with `LUMA_SERVICE(slot, "time", "1.0")`.

```c
typedef struct LumaTimeService {
    LumaServiceTable base;
    int32_t (*now)(const LumaMod* mod, LumaTimeNow* out);
    int64_t (*monotonic_ns)(const LumaMod* mod);                    /* any thread */
    int32_t (*wall)(const LumaMod* mod, LumaTimeWall* out);         /* any thread */
    int32_t (*set_rate)(const LumaMod* mod, uint32_t rate);
    int32_t (*hold)(const LumaMod* mod);
    int32_t (*release)(const LumaMod* mod);
    int32_t (*step)(const LumaMod* mod, uint32_t count);
    int32_t (*timer)(const LumaMod* mod, uint32_t clock, uint64_t after, uint64_t every, LumaEventFn fn, void* user,
                     LumaHandle* out);
    int32_t (*cancel)(const LumaMod* mod, LumaHandle timer);
    int32_t (*on_frame)(const LumaMod* mod, LumaTimeFn fn, void* user);
    int32_t (*on_step)(const LumaMod* mod, LumaTimeFn fn, void* user);
} LumaTimeService;

typedef void (*LumaTimeFn)(void* user, const LumaTimeNow* now);   /* `now` is valid during the call only */
```

- `now` and `wall` fill `out` (whole fields, up to `out->size`). The least sizes are version 1.0's structs:
  `LumaTimeNow` 64 bytes and `LumaTimeWall` 32. Smaller, or a null `out`: `LUMA_E_ARGUMENT`, reported.
- `monotonic_ns` returns the clock (at least 1), or `LUMA_E_ARGUMENT` for a null or unknown mod and
  `LUMA_E_CANCELLED` for a mod being taken out.
- `set_rate` outside 1 to 16000: `LUMA_E_ARGUMENT`, reported. `hold` and `release` return `LUMA_OK`.
- `step`: `LUMA_OK`; not holding: `LUMA_E_ARGUMENT` (`Time.NotHeld`); another mod holds too, or the state is
  `LUMA_TIME_BOOT`, `LOADING`, `MOVIE` or `SKIP`: `LUMA_E_BUSY`, an answer, not reported; `count` 0 or over 16:
  `LUMA_E_ARGUMENT`; more than 16 owed: `LUMA_E_LIMIT`.
- `timer` returns `LUMA_PENDING` with the timer in `*out`. Its events have `kind` `LUMA_TIME_EVENT_TIMER` (1),
  `handle` the timer, `status` `LUMA_OK` and `value` the times it came due since its last event. A null `fn` or
  `out`, a zero `after` or an unknown clock: `LUMA_E_ARGUMENT`; a 65th timer: `LUMA_E_LIMIT`.
- `cancel`: `LUMA_OK`; not this mod's open timer: `LUMA_E_HANDLE`.
- `on_frame` and `on_step` set your mod's one handler from the next frame or step; a null `fn` removes it.
- Constants: `LUMA_TIME_REAL` 1000, `LUMA_TIME_RATE_LEAST` 1, `LUMA_TIME_RATE_MOST` 16000, `LUMA_TIME_STEPS_MOST` 16,
  `LUMA_TIME_TIMERS_MOST` 64. States `LUMA_TIME_BOOT` 0 to `LUMA_TIME_SKIP` 5 in the order of the table above;
  clocks `LUMA_TIME_FRAMES` 0, `LUMA_TIME_STEPS` 1, `LUMA_TIME_NANOSECONDS` 2.

## See also

- [Lifecycle, options and frames](lumascript/events.md)
- [Tasks, states and `wait`](lumascript/tasks.md)
- [input](services/input.md)
- [Services overview](services/overview.md)
- [Tutorial: a ghost time trial](tutorials/ghost-time-trial.md)
- [Tutorial: a LiveSplit link](tutorials/livesplit-link.md)

---
title: Writing tests with the test harness
nav_title: Writing tests
description: Write game tests for your mod - set up a save, a stage and the player, drive the controls, and check facts, the log, pictures and sound.
order: 14
level: intermediate
---

The test harness starts the game with your mod, puts it in the state your test needs, presses the buttons you tell
it to, and then checks what happened. This page shows how to write such a test, step by step, and lists everything a
test can set up, do and check.

For tests of your own logic that don't need the game, a plain `test "..." { }` block is simpler and faster; see
[lumalink test](lumalink/test.md#two-kinds-of-test).

## A first game test

The "Hello" mod from [Your first mod](start/first-mod.md) counts Mario's jumps. Let's prove that a jump in a stage
is counted.

### 1. Let the mod report a fact

A test checks **facts**: named values written while the game runs. Your mod writes one with `log fact`:

```lumascript source/main.lum
var jumps: int = 0

hook before Mario::tryJump() {
    jumps = jumps + 1
    log "jump {jumps}"
    log fact "jumps" jumps
}
```

The harness records it under the key `mod.<your mod's id>.jumps`, here `mod.you.hello.jumps`.

### 2. Write the test

A test is a folder holding a `test.json` and the files it names (mods, reference pictures, save files). Paths in
`test.json` are relative to that folder.

```json test.json
{
  "harness": 1,
  "name": "hello-counts-jumps",
  "about": "In a stage, pressing A once counts one jump",
  "proves": ["harness.self"],
  "mods": ["mods/hello"],
  "stage": { "name": "EggStarGalaxy", "scenario": 1 },
  "steps": [
    { "at": 60, "hold": ["A"], "frames": 10 },
    { "at": 90, "picture": "after-jump" },
    { "at": 180, "end": true }
  ],
  "expect": [{ "fact": "mod.you.hello.jumps", "is": 1 }, { "log": "jump 1" }]
}
```

Here is what it says:

- **`mods`**: install the mod in `mods/hello` (a mod folder with its `luma.json`, already built).
- **`stage`**: start in Good Egg Galaxy (`EggStarGalaxy`), scenario 1. The harness makes a new save file, enters the
  stage the way the file select does, and waits until the stage is ready and the player can move.
- **`steps`**: frame 0 is the first frame after everything is set up. At frame 60, hold A for 10 frames. At frame
  90, take a picture. At frame 180, end.
- **`expect`**: after the run, the last value of the fact `mod.you.hello.jumps` must be 1, and a line of the log
  must match `jump 1`.

### 3. Build, then run

The harness never builds your mod. Build it first, then run the tests:

```sh
lumalink build hello --names <names folder>
lumalink test hello
```

A test passes only when every expectation holds **and** everything the harness always checks holds too: the run
reached its `end`, nothing crashed, every mod loaded, the guard switched nothing off, and every setup item took. See
[Results](lumalink/testing.md#results).

## Why tests are written this way

- **Setup follows the game's own order and is read back.** The save is made, then the stage entered, then the player
  placed, each through the game's own path, and each item is read back from the game. A setup that did not take
  ends the test as `setup-failed`, naming the item, instead of letting a test "fail" for the wrong reason.
- **Only `pass` is proof.** Every other verdict names what went wrong.
- **Nothing is ignored.** An unknown key, a wrong type, a missing reference picture, a mod that did not load: each is
  a named failure, never silently skipped.
- **Every run is the same.** Each test gets new saves and settings, the game runs with fixed time steps (one frame is
  one step, however fast your machine is), the random generator is seeded, the window is hidden and the sound goes
  to a file.

## A fuller example

This test of the [Gold Flower](tutorials/a-new-power-up.md) gives the player the spin, places Mario at the flower,
shakes the controller, and checks a fact, the player's position, a picture and the log:

```json test.json
{
  "harness": 1,
  "name": "gold-flower-throw",
  "about": "With the spin granted, a spin as gold Mario throws one gold ball",
  "proves": ["harness.self"],
  "mods": ["mods/gold-flower"],
  "code": "allow",
  "renderers": ["d3d12", "vulkan"],
  "limit_seconds": 120,
  "save": {
    "character": "mario",
    "spin": true,
    "stars": 0,
    "grand_stars": 0,
    "flags": ["PowerStarGet"],
    "values": { "LibraryOpenNewStarCount": 0 }
  },
  "stage": { "name": "EggStarGalaxy", "scenario": 1 },
  "player": { "at": "GoldFlowerItem#0", "form": "normal" },
  "steps": [
    { "at": 60, "picture": "start" },
    { "at": 120, "shake": 10 },
    { "at": 150, "picture": "after-spin" },
    { "at": 150, "call": "MR::getPlayerPos", "signature": "Vec3f *()", "fact": "player.pos" },
    { "at": 600, "end": true }
  ],
  "expect": [
    { "fact": "mod.gold-flower.balls_thrown", "is": 1 },
    { "fact": "player.pos", "near": [0, 0, 0], "within": 5000 },
    { "picture": "after-spin", "like": "refs/after-spin.png", "within": { "rmse": 6.0 } },
    { "no_log": "not started" }
  ]
}
```

The rest of this page describes each part.

## test.json keys

| Key               | Required | Meaning                                                                                                                                                                                                                                                               |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `harness`         | yes      | `1`. A harness refuses a higher number (`harness-error`).                                                                                                                                                                                                             |
| `name`            | yes      | Unique within a suite; letters, digits, `-`, `_`, `.`.                                                                                                                                                                                                                |
| `about`           | yes      | One line: what the test proves.                                                                                                                                                                                                                                       |
| `proves`          | yes      | The capability ids the test proves, from the harness's list of capabilities; an id not on the list is `harness-error`. A test that proves nothing new about a capability says `["harness.self"]`.                                                                     |
| `mods`            | no       | The mods to install, in load order. Each is a path (a mod folder with `luma.json`, or a `.luma` file) or an object ([Mods as objects](lumalink/testing.md#mods-as-objects)).                                                                                          |
| `code`            | no       | `allow` (default) or `deny`: the consent to the mods' code, for every mod that does not say otherwise.                                                                                                                                                                |
| `language`        | no       | One of the game's 14 languages by the game's own name (`UsEnglish`, `JpJapanese`, `EuGerman`, ...), applied as the setting is, and read back as `setup.language`. Default: the disc's first.                                                                          |
| `seed`            | no       | A number. The game's random generator is seeded with it at setup and read back as `setup.seed`. Default `0`, so the same test gives the same random numbers every run.                                                                                                |
| `continue_from`   | no       | The name of an earlier test in the same suite. This test starts with the saves, settings and installed mods (with their data) that test left, instead of new ones. That test must come earlier in the suite and have passed, or this one is `setup-failed` naming it. |
| `renderers`       | no       | Any of `d3d12`, `vulkan`, `metal`, `gl`. Default `["d3d12"]` on Windows. The test runs once per renderer, and each run has its own verdict.                                                                                                                           |
| `region`          | no       | `RMGE01`, `RMGP01` or `RMGJ01`. Default: the run's disc.                                                                                                                                                                                                              |
| `limit_seconds`   | no       | A wall-clock limit, default 180. Reaching it is `timeout`.                                                                                                                                                                                                            |
| `bare`            | no       | `true`: run with no mod code at all. Only the steps `wait`, `picture`, `key` and `end`, and expectations on the log, pictures and sound, are allowed.                                                                                                                 |
| `save`            | no       | The save file's state ([The save](lumalink/testing.md#the-save)).                                                                                                                                                                                                     |
| `stage`           | no       | Where the test starts ([The stage](lumalink/testing.md#the-stage)). Without it the test starts at the title screen.                                                                                                                                                   |
| `player`          | no       | The player's state at the start ([The player](lumalink/testing.md#the-player)); needs `stage`.                                                                                                                                                                        |
| `steps`           | yes      | What happens, on the test clock ([Steps](lumalink/testing.md#steps)).                                                                                                                                                                                                 |
| `expect`          | yes      | What must hold ([Expectations](lumalink/testing.md#expectations)). May be empty only for a test that proves "the run reaches its end".                                                                                                                                |
| `faults`          | no       | Guard events the test expects, for a test of a broken mod: `[{"mod": "x"}]`. Without it, any guard event fails the test.                                                                                                                                              |
| `hide_game_files` | no       | Paths relative to the game's folder to leave out of the run's own copy of the game (your install is never touched). A path that is not there is `setup-failed`; an absolute path, a drive, a leading `/` or `\`, or a `..` part is `harness-error`.                   |

Any other key, anywhere in the file, is `harness-error` naming the key and where it is. Types are checked too: a
string where a number belongs is `harness-error` naming the key.

### Mods as objects

Write a mod as an object when the test needs to set its options, its consent or how it is installed:

```json
{
  "path": "mods/broken.luma",
  "options": { "Speed": 2, "Colour": "gold" },
  "code": "allow",
  "permissions": "allow",
  "install": "import",
  "loads": false
}
```

| Key           | Default            | Meaning                                                                                                                                                                                                                                                                    |
| ------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`        | required           | As a plain entry.                                                                                                                                                                                                                                                          |
| `options`     | the mod's defaults | The mod's options by name, set as the Mods screen sets them.                                                                                                                                                                                                               |
| `code`        | the test's `code`  | Consent to this mod's code.                                                                                                                                                                                                                                                |
| `permissions` | `"allow"`          | `"allow"` or `"deny"` every permission the mod asks for, or `{"<name>": "allow"}` / `"deny"` per permission. A permission named here that the mod does not ask for is `harness-error`.                                                                                     |
| `install`     | `"placed"`         | `"placed"`: put into the run's mods folder as an installed mod. `"import"`: the file goes through the game's own import (as a file dropped on the window), so the game's validator checks it; each line of the import screen's result becomes a fact `import.<file name>`. |
| `loads`       | `true`             | `false`: the mod is expected not to start. The automatic "every mod loaded" check skips it, and the test must say with an expectation what message it gives.                                                                                                               |

A mod's folder or `.luma` must already hold its built code for the run's platform. A `luma.json` that names code
missing for that platform is `harness-error` naming the file.

## The save

The run's save folder starts new and empty. The harness creates **user file 1** through the game's own new-file
path (as the file select does), makes it the current file and applies each item. Each item is then read back from
the game and recorded as a fact `setup.save.<item>`. All of this happens before the stage is entered.

| Item          | Default | Meaning                                                                                                    |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `character`   | `mario` | `mario` or `luigi`: the file's player.                                                                     |
| `spin`        | `false` | The Gateway Luma's grant: the spin and the star pointer.                                                   |
| `stars`       | 0       | Power stars owned, counted as the game counts them.                                                        |
| `grand_stars` | 0       | Grand stars, 0 to 7.                                                                                       |
| `flags`       | none    | Game event flags switched on, by the game's own names.                                                     |
| `values`      | none    | Game event values, by name.                                                                                |
| `from`        | none    | A save file (in the test folder) copied in instead of a new file; the other items then apply on top of it. |

With `continue_from`, user file 1 is loaded from the saves the earlier test left (as the file select loads a file)
instead of being made new. The fact `setup.file` says which happened: `created` or `loaded`.

## The stage

```json
"stage": { "name": "EggStarGalaxy", "scenario": 1, "zone": "<optional>" }
```

The stage is entered through the game's own stage change from the current file, as a file starts a galaxy. It is
**ready** when its scene has started, its objects are made, the player exists, no demo is running, and the player
takes input. Only then does the test clock start.

A name the game does not have, or a stage that is not ready within `limit_seconds`, is `setup-failed`, naming the
first condition that still did not hold (for example, that the player still could not take input).

## The player

Applied after the stage is ready, then read back:

| Item       | Meaning                                                                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `position` | `[x, y, z]` in game units (a glTF metre is 100 units).                                                                                                                                    |
| `at`       | `"<object name>#<n>"`: the n-th live object of that name (in creation order). The player is placed 150 units above it, against its gravity. An absent object is `setup-failed` naming it. |
| `form`     | A form the game has, by the game's name (`normal`, `fire`, `ice`, `bee`, `boo`, `spring`, `flying`, `rainbow`, ...), through the game's own form change.                                  |
| `life`     | Health, 1 to the game's maximum.                                                                                                                                                          |

## The test clock

Frame 0 is the first game frame after every setup item has been applied and read back. The clock counts game logic
frames, and fixed time steps are always on in a harness run, so one frame is one step at any machine speed. Every
`at` is on this clock. A test with no `stage` starts its clock at the first frame of the title screen.

## Steps

Each step has **when** it happens and exactly **one action**.

**When:** either `at` (a frame), or `after`, which waits for something to happen:

```json
{ "after": { "fact": "mod.you.hello.jumps", "at_least": 3 }, "picture": "three-jumps" }
{ "after": { "log": "gold ball thrown" }, "timeout": 300, "picture": "ball" }
```

An `after` with a fact takes a check as in [Expectations](lumalink/testing.md#expectations); with `log` it takes a regular expression
and is met at the first frame after such a line is written. `timeout` (in frames, default 600) says how long to wait;
not met in time is `fail`, naming the step.

**Actions:**

| Action     | Form                                                                                             | Meaning                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hold`     | `{"hold": ["A", "B"], "frames": n}`                                                              | Buttons held from `at` for n frames. Names: `A B Z C PLUS MINUS ONE TWO HOME UP DOWN LEFT RIGHT`.                                                                    |
| `stick`    | `{"stick": [x, y], "frames": n}`                                                                 | The main stick, each in -1..1.                                                                                                                                       |
| `shake`    | `{"shake": n}`                                                                                   | The spin gesture for n frames.                                                                                                                                       |
| `pointer`  | `{"pointer": [x, y], "frames": n}`                                                               | The pointer, in 0..1 of the screen.                                                                                                                                  |
| `key`      | `{"key": "enter"}`                                                                               | A key to the game's own menus: `up down left right enter esc tab space backspace`.                                                                                   |
| `settings` | `{"settings": "mods"}`                                                                           | Opens the game's Settings on that page (by its name, in lower case), with the cursor on the page's last list row; `key` steps then move in it.                       |
| `picture`  | `{"picture": "<name>"}`                                                                          | The first frame shown after game frame `at`, saved as `pictures/<name>.png`. Names are unique in a test.                                                             |
| `call`     | `{"call": "<function>", "signature": "<as the game writes it>", "args": [...], "fact": "<key>"}` | Calls a game function by name. Its result, when it has one and `fact` is given, becomes that fact.                                                                   |
| `read`     | `{"read": "<Class.field>", "of": "player", "type": "<type>", "fact": "<key>"}`                   | Reads a field by name and records it as a fact. `of` is `"player"` or `"object:<name>#<n>"`.                                                                         |
| `stage`    | `{"stage": {...}}`                                                                               | Changes stage during the test (same form as [`stage`](lumalink/testing.md#the-stage)). `stage.ready` is recorded when the new one is ready; the clock does not stop. |
| `wait`     | `{"wait": true}`                                                                                 | Does nothing; a place to hang an `after`.                                                                                                                            |
| `end`      | `{"end": true}`                                                                                  | The test ends at this frame. Every test has exactly one `end`.                                                                                                       |

Steps at the same frame run in the order written. Input steps overlap freely: the buttons held are all those any
step holds.

### Calling the game

`call` arguments can be numbers, `true`/`false`, strings (for `const char *`), `[x, y, z]` (for `Vec3f` or
`TVec3f`, by value, reference or pointer), `"player"`, `"object:<name>#<n>"` (a live object by name) or
`"class:<Class>#<n>"` (the n-th live object whose class is `<Class>` or derived from it, handy where a stage names
its objects in Japanese). `object:` and `class:` count live objects in the order the game's live-object list keeps.

- Parameter types allowed: those above, plus `f32`/`float`, `f64`/`double`, `s32`/`int`, `u32`, `u16`, `s16`, `u8`,
  `s8` and `bool`, each checked against its type's range. Any other parameter type is `harness-error` naming it.
- Result types: `f32`/`float`, `f64`/`double`, `s32`/`int`, `u32`, `u16`, `s16`, `u8`, `s8`, `bool`,
  `const char *`, `Vec3f`/`TVec3f` (by value or pointer), `void`, or another pointer (recorded as whether there is
  one). Any other is refused before the call.
- A class `class:` names that the game's types do not have is `harness-error`; a known class with no n-th live object
  is `setup-failed` (`no live object of class Kuribo #3`), so a typo is told apart from a stage without that enemy.

### Driving the Mods page

To test what your mod shows on the Mods page, open Settings on it and move with keys, 60 frames apart or more. On
the Mods page the rows are the mod lists, then the LOG row, then the buttons; `space` presses the selected button,
`enter` is Apply, and `esc` closes:

```json
"steps": [
  { "at": 60, "settings": "mods" },
  { "at": 120, "key": "down" },
  { "at": 180, "key": "space" },
  { "at": 240, "picture": "mod-log" },
  { "at": 300, "end": true }
]
```

A page given as a number, or an unknown page name, is `harness-error`.

## Expectations

Each entry of `expect` is one check, made by the harness after the run from the run's files.

| Check     | Form                                                                                                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A fact    | `{"fact": "<key>", <op>: <value>}`, optionally with `"when"` and `"frames": [a, b]`.                                                                                                                                                                                                        |
| The log   | `{"log": "<regular expression>"}` must match a line; `{"no_log": "<regular expression>"}` must match none.                                                                                                                                                                                  |
| A picture | `{"picture": "<name>", "like": "<reference png>", "within": {"rmse": r}}`, or `"unlike"` with `"beyond": {"rmse": r}`; optionally `"box": [x, y, w, h]` in the picture's pixels. Or the average colour of a box: `{"picture": "<name>", "box": [...], "mean_rgb": [r, g, b], "within": d}`. |
| The sound | `{"sound": [first_frame, last_frame], "rms": [low, high]}`: the level of the run's mix over those frames, in dBFS.                                                                                                                                                                          |

**Fact operators:** `is`, `is_not`, `less`, `at_most`, `more`, `at_least`, `near` (with `within`, for numbers or
vectors, by distance), `exists` and `absent` (with the value `true`). Facts compare as JSON values: objects member by
member in any order.

**`when`** says which values of the fact count: `last` (the default), `first`, `any` or `all`. `frames` limits the
check to values written between those frames.

```json
{ "fact": "mod.you.hello.jumps", "at_least": 1, "when": "any", "frames": [0, 120] }
```

### Always checked

You don't write these; every test checks them:

- the run ended at its `end` frame, by the harness, not by a crash, a hang or the time limit;
- the game quit by itself with exit code 0;
- no crash dump, and no crash line in the game's log;
- every mod in `mods` loaded, except one marked `"loads": false` whose message an expectation names, such as
  `{"log": "gold-flower not started: ..."}`;
- no guard event, unless listed in `faults`;
- every setup item was applied and read back.

### Reference pictures

A picture is compared with a reference PNG in the test folder. A reference path may contain `{renderer}`, replaced by
the run's renderer, so each renderer is compared with its own reference:

```json
{ "picture": "after-spin", "like": "refs/{renderer}/after-spin.png", "within": { "rmse": 6.0 } }
```

A reference of a different size from the picture is `fail`, naming both sizes. A missing reference is
`harness-error`. To make references, run the test, look at the pictures it saved under `pictures/`, and keep the ones
that are right as your references.

## Facts

Facts are what the harness reads. They are written to `facts.jsonl`, one per line:
`{"frame": <test clock, or -1 before frame 0>, "key": "<key>", "value": <JSON>}`.

### Your mod's own facts

In LumaScript, write a fact with `log fact`:

```lumascript
log fact "balls_thrown" balls.len()
```

A mod written in C writes the same through the ordinary log: a line `fact <key> <JSON value>` through
`LumaCore.log`, so a test mod needs nothing beyond `luma.h`.

- The harness records it as `mod.<id>.<key>`.
- The key you log must be lower-case letters, digits and `_` only (`[a-z0-9_]+`): no dot, no capitals, not empty,
  and not `loaded`. A key that breaks this, or a value that is not JSON, is recorded as `harness.bad_fact` naming the
  mod and the key, and fails the test.
- Because your key has no dot, `mod.<id>.<key>` is read by splitting at its last dot, so mod ids with dots
  (`you.hello`) work.

### Facts the harness writes

| Key                                                                                       | When                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup.file`                                                                              | `created` or `loaded`, before the save items.                                                                                                                                                                                   |
| `setup.save.<item>`, `setup.stage`, `setup.player.<item>`, `setup.language`, `setup.seed` | As each setup item is read back; the value as read.                                                                                                                                                                             |
| `setup.done`                                                                              | At frame 0.                                                                                                                                                                                                                     |
| `stage.ready`                                                                             | Each time a stage becomes ready: `{"name", "scenario", "frame"}`.                                                                                                                                                               |
| `mod.<id>.loaded`                                                                         | `true`, or the message the mod was refused with.                                                                                                                                                                                |
| `guard.<id>`                                                                              | A guard event in that mod.                                                                                                                                                                                                      |
| any step's `fact`                                                                         | When the step runs.                                                                                                                                                                                                             |
| `import.<file name>`                                                                      | Each line of the import screen's result for a mod installed with `"install": "import"`: `{"line", "text", "code", "file", "at"}` (the validator's code, the file inside the mod and the place in it, when the line names them). |
| `modlog`                                                                                  | Each line the on-screen mod log shows (its mod, file, line and text).                                                                                                                                                           |
| `modlog.notice`, `modlog.state`, `modlog.page`                                            | The mod log's notice, its state, and the Log page (once per opening).                                                                                                                                                           |
| `modscreen.<id>`                                                                          | Each line the Mods screen shows about that mod: what it is, what it carries, what is wrong.                                                                                                                                     |
| `consent.shown.<id>`, `consent.answer.<id>`                                               | The consent question as shown, and each answer. The `permissions` key of a mod entry sets the answers before start and is recorded the same way.                                                                                |
| `startcheck`                                                                              | `{"part", "why"}`, once when the start check runs (none with no mod on).                                                                                                                                                        |
| `refs.after_start`                                                                        | Each class looked up after the last mod's start, with its answer.                                                                                                                                                               |
| `placeholder`                                                                             | A stand-in made for a placement whose class was found missing: class, file, line.                                                                                                                                               |

The `import`, `modlog` and `modscreen` facts are written by the code that shows those lines, as it shows them, so a
test proves what is on screen, not only what is in the log. Other parts of the game add their own facts while the
harness runs, for example the content cook (see [Effects](content/effects.md)).

## Results

A run leaves its files in a folder per test and renderer:

| File                  | What                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `result.json`         | The verdict and its reason, every check with its result and actual value, the setup, frames, seconds and pictures, plus the platform, OS and GPU. |
| `facts.jsonl`         | Every fact (see [Facts](lumalink/testing.md#facts)).                                                                                              |
| `run.log`             | The game's log.                                                                                                                                   |
| `pictures/<name>.png` | The pictures the steps took.                                                                                                                      |
| `audio.wav`           | The sound mix.                                                                                                                                    |
| `test.json`           | The test as run.                                                                                                                                  |
| `bin/`, `*.dmp`       | Kept only when the run crashed.                                                                                                                   |

| Verdict         | Meaning                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| `pass`          | Every check held. The only verdict that proves anything.                     |
| `fail`          | A check did not hold. The first failing check is the reason; all are listed. |
| `setup-failed`  | A setup item did not take; it is named. The test proves nothing either way.  |
| `crashed`       | The game crashed: the dump's path and the last log lines.                    |
| `timeout`       | `limit_seconds` was reached.                                                 |
| `harness-error` | The harness's own problem or a malformed test, never your mod's.             |

The harness prints one line per test and renderer, and exits with 0 when every verdict is `pass`, 1 otherwise.

## Suites

A suite runs several tests in order. It is a `suite.json` listing test folders:

```json suite.json
{ "harness": 1, "tests": ["hello-counts-jumps", "hello-next-session"] }
```

A test in a suite can pick up where an earlier one left off with `continue_from`, starting from its saves, settings
and installed mods (with their data) instead of new ones:

```json hello-next-session/test.json
{
  "harness": 1,
  "name": "hello-next-session",
  "about": "The mod starts again on the save the first test left",
  "proves": ["harness.self"],
  "continue_from": "hello-counts-jumps",
  "stage": { "name": "EggStarGalaxy", "scenario": 1 },
  "steps": [{ "at": 120, "end": true }],
  "expect": [
    { "fact": "setup.file", "is": "loaded" },
    { "fact": "mod.you.hello.loaded", "is": true }
  ]
}
```

The earlier test must come first in the suite and must have passed; otherwise this one is `setup-failed`, naming it.

## Edge cases

- **Limits.** A line the harness gives the game is at most 1,023 bytes and 16 words (a `call`'s words are its
  function name, signature and arguments), a signature at most 16 parameters, and a fact at most 1,023 bytes.
  Anything over is refused, naming the step; nothing is cut.
- **The sound check** reads the run's WAV and accepts only 16-bit PCM stereo, naming any other format.
- **Platforms.** The test format is the same on every platform. A platform the harness cannot run on yet ends with
  `harness-error: no adapter for <platform>`.
- **Versions.** `harness: 1` may gain new keys, steps, checks and facts, but never a change of meaning; a change of
  meaning would be `harness: 2`, and harness 1 tests keep working.

> [!PLANNED]
> Planned additions to `harness: 1`: a `type` step (text through the platform's text entry); `touch` and `mouse`
> steps; a `sound` check against a reference file; and `servers`, local network fixtures (`tcp-echo`, `udp-echo`,
> `http-static`, `websocket-echo`) started before the game and stopped after, with their ports given to the test as
> facts, so network tests need no outside network.

## See also

- [lumalink test](lumalink/test.md)
- [lumalink build](lumalink/build.md)
- [Check, build, pack and run](start/workflow.md)
- [Debugging](start/debugging.md)
- [The guard in depth](reference/guard.md)
- [The mod log in depth](reference/mod-log.md)
- [Permissions and consent in depth](reference/consent.md)
- [Reloading in depth](reference/reload.md)
